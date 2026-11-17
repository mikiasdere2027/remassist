'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { deals, users } from '@/db/schema';
import { assertUser } from '@/lib/auth/require';
import { canEditLeads } from '@/lib/auth/roles';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { DealInput, createDeal, dealMoney, moveDeal } from '@/lib/crm/dealsWrite';
import { logActivity, recordEvent } from '@/lib/crm/events';
import type { ActionResult } from '../leads/[id]/actions';

/**
 * Deal writes from the board, the deal page, the New deal form and a lead's
 * Conversion tab. Server actions are not covered by the layout's gate, so each
 * re-checks the session and role.
 */

export type DealFormState = { error: string } | null;

const UUID = /^[0-9a-f-]{36}$/i;

async function editor() {
  const user = await assertUser();
  if (!canEditLeads(user.role)) throw new Error('forbidden');
  if (!isDatabaseConfigured()) throw new Error('database unavailable');
  return user;
}

function fields(fd: FormData) {
  const get = (k: string) => {
    const v = fd.get(k);
    return typeof v === 'string' ? v : undefined;
  };
  return {
    title: get('title') ?? '',
    companyName: get('companyName'),
    contactEmail: get('contactEmail'),
    contactName: get('contactName'),
    service: get('service'),
    tier: get('tier'),
    seats: get('seats'),
    hoursPerMonth: get('hoursPerMonth'),
    rate: get('rate'),
    monthlyValue: get('monthlyValue'),
    probability: get('probability'),
    expectedClose: get('expectedClose'),
    stageId: get('stageId') ?? '',
    ownerId: get('ownerId'),
  };
}

function refresh(dealId?: string, leadId?: string) {
  revalidatePath('/admin/deals');
  revalidatePath('/admin/companies');
  if (dealId) revalidatePath(`/admin/deals/${dealId}`);
  if (leadId) revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath('/admin/leads');
}

/** New deal from scratch (no lead). */
export async function createDealAction(_prev: DealFormState, fd: FormData): Promise<DealFormState> {
  const user = await editor();
  const parsed = DealInput.safeParse(fields(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!parsed.data.companyName && !parsed.data.contactEmail) {
    return { error: 'Give a company or a contact email, so the deal belongs to someone.' };
  }
  const ws = currentWorkspaceId();
  const r = await getDb().transaction((tx) => createDeal(tx, ws, parsed.data, user.id));
  if ('error' in r) return r;
  refresh(r.dealId);
  redirect(`/admin/deals/${r.dealId}`);
}

/** Convert a lead: company + contact + deal, and the lead becomes Converted. */
export async function convertLeadAction(leadId: string, _prev: DealFormState, fd: FormData): Promise<DealFormState> {
  const user = await editor();
  if (!UUID.test(leadId)) return { error: 'Unknown lead.' };
  const parsed = DealInput.safeParse(fields(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const ws = currentWorkspaceId();
  const r = await getDb().transaction((tx) => createDeal(tx, ws, parsed.data, user.id, leadId));
  if ('error' in r) return r;
  refresh(r.dealId, leadId);
  redirect(`/admin/deals/${r.dealId}`);
}

/** Move a deal to a stage (board drag, or the stage control on the deal page). */
export async function moveDealStage(dealId: string, stageId: string, lossReasonId?: string, lossNote?: string): Promise<ActionResult> {
  const user = await editor();
  if (!UUID.test(dealId) || !UUID.test(stageId)) return { ok: false, error: 'Unknown deal or stage.' };
  if (lossNote && lossNote.length > 2000) return { ok: false, error: 'Keep the note under 2,000 characters.' };
  const ws = currentWorkspaceId();
  const r = await getDb().transaction((tx) => moveDeal(tx, ws, dealId, stageId, user.id, { reasonId: lossReasonId, note: lossNote }));
  if ('error' in r) return { ok: false, error: r.error };
  refresh(dealId);
  return { ok: true, at: Date.now() };
}

/** Edit the deal's commercial fields. */
export async function updateDealAction(dealId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await editor();
  if (!UUID.test(dealId)) return { ok: false, error: 'Unknown deal.' };
  const ws = currentWorkspaceId();
  const raw = fields(fd);
  const [current] = await getDb().select({ stageId: deals.stageId }).from(deals).where(and(eq(deals.workspaceId, ws), eq(deals.id, dealId)));
  if (!current) return { ok: false, error: 'That deal no longer exists.' };
  const parsed = DealInput.safeParse({ ...raw, stageId: current.stageId });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const money = dealMoney(parsed.data);
  if ('error' in money) return { ok: false, error: money.error };
  const d = parsed.data;

  await getDb().transaction(async (tx) => {
    const [before] = await tx.select().from(deals).where(eq(deals.id, dealId)).for('update');
    const next = {
      title: d.title,
      service: d.service ?? null,
      tier: d.tier ?? null,
      seats: d.seats ?? null,
      hoursPerMonth: d.hoursPerMonth ?? null,
      rateCents: money.rateCents,
      monthlyValueCents: money.monthlyValueCents,
      probability: d.probability ?? null,
      expectedClose: d.expectedClose ?? null,
    };
    const changed = (Object.keys(next) as Array<keyof typeof next>).filter((k) => (before[k] ?? null) !== (next[k] ?? null));
    if (changed.length === 0) return;
    await tx.update(deals).set({ ...next, updatedAt: new Date() }).where(eq(deals.id, dealId));
    await recordEvent(tx, { workspaceId: ws, type: 'deal.updated', subjectType: 'deal', subjectId: dealId, actorId: user.id, payload: { fields: changed } });
    await logActivity(tx, {
      workspaceId: ws, type: 'system', dealId, actorId: user.id, meta: { fields: changed },
      body: `Deal updated: ${changed.map((k) => FIELD_LABELS[k]).join(', ')}`,
    });
  });
  refresh(dealId);
  return { ok: true, at: Date.now() };
}

const FIELD_LABELS: Record<string, string> = {
  title: 'title', service: 'service', tier: 'tier', seats: 'seats', hoursPerMonth: 'hours',
  rateCents: 'rate', monthlyValueCents: 'monthly value', probability: 'probability', expectedClose: 'expected close',
};

export async function setDealOwner(dealId: string, ownerId: string): Promise<ActionResult> {
  const user = await editor();
  if (!UUID.test(dealId)) return { ok: false, error: 'Unknown deal.' };
  const ws = currentWorkspaceId();
  const next = ownerId || null;
  try {
    await getDb().transaction(async (tx) => {
      const [d] = await tx.select({ ownerId: deals.ownerId }).from(deals).where(and(eq(deals.workspaceId, ws), eq(deals.id, dealId))).for('update');
      if (!d) throw new Error('That deal no longer exists.');
      if (d.ownerId === next) return;
      const [owner] = next
        ? await tx.select({ name: users.name, email: users.email }).from(users).where(and(eq(users.id, next), isNull(users.disabledAt)))
        : [];
      if (next && !owner) throw new Error('That person no longer has access.');
      await tx.update(deals).set({ ownerId: next, updatedAt: new Date() }).where(eq(deals.id, dealId));
      const meta = { from: d.ownerId, to: next, toName: owner ? owner.name || owner.email : null };
      await recordEvent(tx, { workspaceId: ws, type: 'deal.updated', subjectType: 'deal', subjectId: dealId, actorId: user.id, payload: { owner: meta } });
      await logActivity(tx, { workspaceId: ws, type: 'owner_change', dealId, actorId: user.id, meta });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message.startsWith('That') ? e.message : 'Could not change the owner.' };
  }
  refresh(dealId);
  return { ok: true, at: Date.now() };
}
