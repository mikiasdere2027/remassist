'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, isDatabaseConfigured } from '@/db';
import { proposals } from '@/db/schema';
import { assertUser } from '@/lib/auth/require';
import { canEditLeads } from '@/lib/auth/roles';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { MAX_LINES, ProposalLine, parsePercentToBps, totals } from '@/lib/crm/proposals';
import { createDraft, markSent, withdraw } from '@/lib/crm/proposalsData';
import { formatMoney } from '@/lib/crm/money';
import { sendEmail } from '@/lib/mail/send';
import { SITE_URL } from '@/lib/site';
import type { ActionResult } from '../leads/[id]/actions';

/**
 * Proposal writes from the admin. Server actions are not covered by the
 * layout's gate, so each re-checks the session and role.
 */

const UUID = /^[0-9a-f-]{36}$/i;

async function editor() {
  const user = await assertUser();
  if (!canEditLeads(user.role)) throw new Error('forbidden');
  if (!isDatabaseConfigured()) throw new Error('database unavailable');
  return user;
}

function refresh(id: string, dealId?: string) {
  revalidatePath(`/admin/proposals/${id}`);
  revalidatePath('/admin/proposals');
  if (dealId) revalidatePath(`/admin/deals/${dealId}`);
}

function msg(e: unknown, fallback: string): ActionResult {
  return { ok: false, error: e instanceof Error && /^(This|That|Add|Only|Every|Give|Choose)/.test(e.message) ? e.message : fallback };
}

export async function newProposal(dealId: string): Promise<void> {
  const user = await editor();
  if (!UUID.test(dealId)) throw new Error('bad id');
  const id = await getDb().transaction((tx) => createDraft(tx, currentWorkspaceId(), dealId, user.id));
  revalidatePath(`/admin/deals/${dealId}`);
  redirect(`/admin/proposals/${id}`);
}

/** A new draft copying a sent proposal's lines, for a revised offer. */
export async function reviseProposal(id: string): Promise<void> {
  const user = await editor();
  const ws = currentWorkspaceId();
  const [p] = await getDb().select({ dealId: proposals.dealId }).from(proposals).where(and(eq(proposals.workspaceId, ws), eq(proposals.id, id)));
  if (!p) throw new Error('not found');
  const newId = await getDb().transaction((tx) => createDraft(tx, ws, p.dealId, user.id, id));
  revalidatePath(`/admin/deals/${p.dealId}`);
  redirect(`/admin/proposals/${newId}`);
}

const Draft = z.object({
  title: z.string().trim().min(1, 'Give the proposal a title.').max(200),
  intro: z.string().trim().max(5000).optional(),
  terms: z.string().trim().max(10_000).optional(),
  validUntil: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  recipientName: z.string().trim().max(120).optional(),
  recipientEmail: z.union([z.literal(''), z.string().trim().toLowerCase().email('The client email is not valid.')]).optional(),
});

export async function saveProposal(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await editor();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown proposal.' };
  const get = (k: string) => (typeof fd.get(k) === 'string' ? (fd.get(k) as string) : undefined);
  const parsed = Draft.safeParse({
    title: get('title') ?? '', intro: get('intro'), terms: get('terms'), validUntil: get('validUntil'),
    recipientName: get('recipientName'), recipientEmail: get('recipientEmail'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const bps = parsePercentToBps(get('discount'));
  if (bps === null) return { ok: false, error: 'The discount must be a percentage between 0 and 100.' };
  let raw: unknown;
  try { raw = JSON.parse(get('lines') ?? '[]'); } catch { return { ok: false, error: 'The lines could not be read. Reload and try again.' }; }
  const lines = z.array(ProposalLine).max(MAX_LINES, `Keep it to ${MAX_LINES} lines.`).safeParse(raw);
  if (!lines.success) return { ok: false, error: lines.error.issues[0].message };
  const t = totals(lines.data, bps);
  const ws = currentWorkspaceId();
  let dealId: string | undefined;
  try {
    await getDb().transaction(async (tx) => {
      const [p] = await tx.select().from(proposals).where(and(eq(proposals.workspaceId, ws), eq(proposals.id, id))).for('update');
      if (!p) throw new Error('That proposal no longer exists.');
      if (p.status !== 'draft') throw new Error('This proposal has been sent, so it can no longer change. Revise it to make a new draft.');
      dealId = p.dealId;
      const d = parsed.data;
      await tx.update(proposals).set({
        title: d.title, intro: d.intro || null, terms: d.terms || null, validUntil: d.validUntil || null,
        recipientName: d.recipientName || null, recipientEmail: d.recipientEmail || null,
        lines: lines.data, discountBps: bps, monthlyCents: t.monthly, oneOffCents: t.oneOff, updatedAt: new Date(),
      }).where(eq(proposals.id, id));
    });
  } catch (e) {
    return msg(e, 'Could not save the proposal.');
  }
  refresh(id, dealId);
  return { ok: true, at: Date.now() };
}

export async function markProposalSent(id: string): Promise<ActionResult> {
  const user = await editor();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown proposal.' };
  try {
    const p = await getDb().transaction((tx) => markSent(tx, currentWorkspaceId(), id, user.id, 'link'));
    refresh(id, p.dealId);
  } catch (e) {
    return msg(e, 'Could not mark the proposal as sent.');
  }
  return { ok: true, at: Date.now() };
}

export async function emailProposal(id: string): Promise<ActionResult> {
  const user = await editor();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown proposal.' };
  const from = process.env.PROPOSAL_EMAIL_FROM;
  if (!from) return { ok: false, error: 'Email is not set up yet: PROPOSAL_EMAIL_FROM is missing on the server. Copy the link and send it yourself.' };
  const ws = currentWorkspaceId();
  const [p] = await getDb().select().from(proposals).where(and(eq(proposals.workspaceId, ws), eq(proposals.id, id)));
  if (!p) return { ok: false, error: 'That proposal no longer exists.' };
  if (p.status !== 'draft') return { ok: false, error: 'This proposal has already been sent.' };
  if (!p.recipientEmail) return { ok: false, error: 'Add the client’s email first, then save.' };
  const link = `${SITE_URL}/p/${p.publicToken}`;
  try {
    await sendEmail({
      from,
      to: p.recipientEmail,
      replyTo: user.email,
      subject: `${p.title} (${p.number})`,
      text: [
        `Hi ${p.recipientName?.split(/\s+/)[0] ?? 'there'},`,
        '',
        `Here is our proposal: ${formatMoney(p.monthlyCents, p.currency)} per month${p.oneOffCents ? ` plus ${formatMoney(p.oneOffCents, p.currency)} one-off` : ''}.`,
        `You can read it, and accept or decline it, here:`,
        link,
        p.validUntil ? `\nIt is valid until ${p.validUntil}.` : '',
        `\nReply to this email with any questions.`,
        `\n${user.name ?? user.email}`,
        'Rem Assist',
      ].join('\n'),
    });
    const sent = await getDb().transaction((tx) => markSent(tx, ws, id, user.id, 'email'));
    refresh(id, sent.dealId);
  } catch (e) {
    console.error('[proposals] email failed', e);
    return { ok: false, error: 'The email could not be sent (the sending domain may not be verified yet). Copy the link and send it yourself.' };
  }
  return { ok: true, at: Date.now() };
}

export async function withdrawProposal(id: string): Promise<ActionResult> {
  const user = await editor();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown proposal.' };
  const ws = currentWorkspaceId();
  try {
    await getDb().transaction((tx) => withdraw(tx, ws, id, user.id));
  } catch (e) {
    return msg(e, 'Could not withdraw the proposal.');
  }
  const [p] = await getDb().select({ dealId: proposals.dealId }).from(proposals).where(eq(proposals.id, id));
  refresh(id, p?.dealId);
  return { ok: true, at: Date.now() };
}
