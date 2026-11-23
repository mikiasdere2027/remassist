'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, isDatabaseConfigured } from '@/db';
import { attachments, companies, engagements, users } from '@/db/schema';
import type { OnboardingStep } from '@/db/schema/crm';
import { assertUser } from '@/lib/auth/require';
import { canEditLeads } from '@/lib/auth/roles';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { logActivity, recordEvent } from '@/lib/crm/events';
import { ENGAGEMENT_STATUSES, ENGAGEMENT_STATUS_LABELS, onboardingProgress, parseRoles, type EngagementStatus } from '@/lib/crm/engagements';
import { parseMoneyToCents } from '@/lib/crm/money';
import { checkFile, savePrivateFile } from '@/lib/crm/files';
import type { ActionResult } from '../leads/[id]/actions';

/**
 * Customer engagement writes. Server actions are not covered by the layout's
 * gate, so each re-checks the session and role, scopes to the workspace, and
 * writes its change, timeline entry and event together.
 */

const UUID = /^[0-9a-f-]{36}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

async function editor() {
  const user = await assertUser();
  if (!canEditLeads(user.role)) throw new Error('forbidden');
  if (!isDatabaseConfigured()) throw new Error('database unavailable');
  return user;
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

async function lock(tx: Tx, ws: string, id: string) {
  if (!UUID.test(id)) throw new Error('That customer no longer exists.');
  const [e] = await tx.select().from(engagements).where(and(eq(engagements.workspaceId, ws), eq(engagements.id, id))).for('update');
  if (!e) throw new Error('That customer no longer exists.');
  return e;
}

function done(id: string, companyId?: string | null): ActionResult {
  revalidatePath(`/admin/customers/${id}`);
  revalidatePath('/admin/customers');
  if (companyId) revalidatePath(`/admin/companies/${companyId}`);
  return { ok: true, at: Date.now() };
}

function fail(e: unknown, fallback: string): ActionResult {
  return { ok: false, error: e instanceof Error && /^(That|Line|Choose|Give|Files|Upload|The )/.test(e.message) ? e.message : fallback };
}

/** Keeps the company's lifecycle in step: customer while any engagement is live, former when all have churned. */
async function syncCompany(tx: Tx, companyId: string | null) {
  if (!companyId) return;
  const [live] = await tx.select({ id: engagements.id }).from(engagements)
    .where(and(eq(engagements.companyId, companyId), ne(engagements.status, 'churned'), isNull(engagements.archivedAt))).limit(1);
  await tx.update(companies).set({ lifecycle: live ? 'customer' : 'former', updatedAt: new Date() }).where(eq(companies.id, companyId));
}

/* ── terms ──────────────────────────────────────────────────────────────── */

const Terms = z.object({
  title: z.string().trim().min(1, 'Give the engagement a name.').max(200),
  service: z.string().trim().max(120).optional(),
  monthlyValue: z.string().trim().max(20).optional(),
});

export async function updateTerms(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await editor();
  const parsed = Terms.safeParse({ title: fd.get('title') ?? '', service: fd.get('service') || undefined, monthlyValue: fd.get('monthlyValue') || undefined });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const cents = parsed.data.monthlyValue ? parseMoneyToCents(parsed.data.monthlyValue) : 0;
  if (cents === null) return { ok: false, error: 'The monthly value must be an amount like 4320.' };
  const ws = currentWorkspaceId();
  let companyId: string | null = null;
  try {
    await getDb().transaction(async (tx) => {
      const e = await lock(tx, ws, id);
      companyId = e.companyId;
      const next = { title: parsed.data.title, service: parsed.data.service ?? null, monthlyValueCents: cents };
      const changed = (Object.keys(next) as Array<keyof typeof next>).filter((k) => e[k] !== next[k]);
      if (changed.length === 0) return;
      await tx.update(engagements).set({ ...next, updatedAt: new Date() }).where(eq(engagements.id, id));
      await recordEvent(tx, { workspaceId: ws, type: 'engagement.updated', subjectType: 'engagement', subjectId: id, actorId: user.id, payload: { fields: changed } });
      await logActivity(tx, {
        workspaceId: ws, type: 'system', engagementId: id, actorId: user.id, meta: { fields: changed },
        body: `Updated ${changed.map((k) => ({ title: 'name', service: 'service', monthlyValueCents: 'monthly value' })[k]).join(', ')}`,
      });
    });
  } catch (e) {
    return fail(e, 'Could not save.');
  }
  return done(id, companyId);
}

export async function updateRoles(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await editor();
  const parsed = parseRoles(String(fd.get('roles') ?? '').slice(0, 20_000));
  if ('error' in parsed) return { ok: false, error: parsed.error };
  const ws = currentWorkspaceId();
  try {
    await getDb().transaction(async (tx) => {
      const e = await lock(tx, ws, id);
      if (JSON.stringify(e.roles) === JSON.stringify(parsed.roles)) return;
      await tx.update(engagements).set({ roles: parsed.roles, updatedAt: new Date() }).where(eq(engagements.id, id));
      await recordEvent(tx, { workspaceId: ws, type: 'engagement.updated', subjectType: 'engagement', subjectId: id, actorId: user.id, payload: { fields: ['roles'] } });
      await logActivity(tx, { workspaceId: ws, type: 'system', engagementId: id, actorId: user.id, body: 'Updated the roles and staff placed' });
    });
  } catch (e) {
    return fail(e, 'Could not save the roles.');
  }
  return done(id);
}

/* ── contract ───────────────────────────────────────────────────────────── */

const Contract = z.object({
  startDate: z.union([z.literal(''), z.string().regex(DAY)]).optional(),
  contractEnd: z.union([z.literal(''), z.string().regex(DAY)]).optional(),
  renewalDate: z.union([z.literal(''), z.string().regex(DAY)]).optional(),
  noticeDays: z.union([z.literal(''), z.coerce.number().int().min(0).max(365)]).optional(),
});

export async function updateContract(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await editor();
  const parsed = Contract.safeParse(Object.fromEntries(['startDate', 'contractEnd', 'renewalDate', 'noticeDays'].map((k) => [k, fd.get(k) ?? ''])));
  if (!parsed.success) return { ok: false, error: 'Use full dates, and a notice period between 0 and 365 days.' };
  const d = parsed.data;
  const next = {
    startDate: d.startDate || null,
    contractEnd: d.contractEnd || null,
    renewalDate: d.renewalDate || null,
    noticeDays: d.noticeDays === '' || d.noticeDays === undefined ? null : d.noticeDays,
  };
  if (next.startDate && next.contractEnd && next.contractEnd < next.startDate) return { ok: false, error: 'The contract end is before the start date.' };
  const ws = currentWorkspaceId();
  try {
    await getDb().transaction(async (tx) => {
      const e = await lock(tx, ws, id);
      const changed = (Object.keys(next) as Array<keyof typeof next>).filter((k) => (e[k] ?? null) !== next[k]);
      if (changed.length === 0) return;
      await tx.update(engagements).set({ ...next, updatedAt: new Date() }).where(eq(engagements.id, id));
      await recordEvent(tx, { workspaceId: ws, type: 'engagement.updated', subjectType: 'engagement', subjectId: id, actorId: user.id, payload: { fields: changed, ...next } });
      const labels = { startDate: 'start date', contractEnd: 'contract end', renewalDate: 'renewal date', noticeDays: 'notice period' };
      await logActivity(tx, { workspaceId: ws, type: 'system', engagementId: id, actorId: user.id, body: `Contract updated: ${changed.map((k) => labels[k]).join(', ')}`, meta: next });
    });
  } catch (e) {
    return fail(e, 'Could not save the contract.');
  }
  return done(id);
}

/* ── onboarding ─────────────────────────────────────────────────────────── */

export async function setStepDone(id: string, key: string, isDone: boolean): Promise<ActionResult> {
  const user = await editor();
  if (!/^[a-z0-9_-]{1,40}$/i.test(key)) return { ok: false, error: 'Unknown step.' };
  const ws = currentWorkspaceId();
  let companyId: string | null = null;
  try {
    await getDb().transaction(async (tx) => {
      const e = await lock(tx, ws, id);
      companyId = e.companyId;
      const steps = (e.onboarding ?? []) as OnboardingStep[];
      const step = steps.find((s) => s.key === key);
      if (!step) throw new Error('That step no longer exists.');
      if (Boolean(step.doneAt) === isDone) return;
      const next = steps.map((s) => (s.key === key ? { ...s, doneAt: isDone ? new Date().toISOString() : null, doneBy: isDone ? user.id : null } : s));
      const progress = onboardingProgress(next);
      /* The last step done during onboarding makes the customer Active. */
      const goLive = isDone && progress.complete && e.status === 'onboarding';
      await tx.update(engagements).set({ onboarding: next, ...(goLive ? { status: 'active' as const } : {}), updatedAt: new Date() }).where(eq(engagements.id, id));
      await logActivity(tx, { workspaceId: ws, type: 'system', engagementId: id, actorId: user.id, body: `${isDone ? 'Done' : 'Reopened'}: ${step.label}`, meta: { step: key, progress: progress.pct } });
      if (goLive) {
        await recordEvent(tx, { workspaceId: ws, type: 'engagement.status_changed', subjectType: 'engagement', subjectId: id, actorId: user.id, payload: { from: 'onboarding', to: 'active', reason: 'onboarding complete' } });
        await logActivity(tx, { workspaceId: ws, type: 'status_change', engagementId: id, actorId: user.id, meta: { from: 'onboarding', to: 'active', kind: 'engagement' }, body: 'Onboarding complete' });
      }
    });
  } catch (e) {
    return fail(e, 'Could not update the step.');
  }
  return done(id, companyId);
}

/* ── status and owner ───────────────────────────────────────────────────── */

export async function setEngagementStatus(id: string, status: string, reason?: string): Promise<ActionResult> {
  const user = await editor();
  if (!(ENGAGEMENT_STATUSES as readonly string[]).includes(status)) return { ok: false, error: 'Unknown status.' };
  const why = reason?.trim().slice(0, 2000) || null;
  if (status === 'churned' && !why) return { ok: false, error: 'Give a reason before marking the customer as churned.' };
  const ws = currentWorkspaceId();
  let companyId: string | null = null;
  try {
    await getDb().transaction(async (tx) => {
      const e = await lock(tx, ws, id);
      companyId = e.companyId;
      if (e.status === status) return;
      await tx.update(engagements).set({
        status: status as EngagementStatus,
        churnedAt: status === 'churned' ? new Date() : null,
        churnReason: status === 'churned' ? why : null,
        updatedAt: new Date(),
      }).where(eq(engagements.id, id));
      const meta = { from: e.status, to: status, kind: 'engagement' };
      await recordEvent(tx, { workspaceId: ws, type: 'engagement.status_changed', subjectType: 'engagement', subjectId: id, actorId: user.id, payload: { ...meta, reason: why } });
      await logActivity(tx, { workspaceId: ws, type: 'status_change', engagementId: id, actorId: user.id, meta, body: status === 'churned' ? why : null });
      await syncCompany(tx, e.companyId);
      if (e.companyId) {
        await logActivity(tx, { workspaceId: ws, type: 'system', companyId: e.companyId, actorId: user.id, body: `${e.title}: ${ENGAGEMENT_STATUS_LABELS[status as EngagementStatus]}`, meta: { engagementId: id } });
      }
    });
  } catch (e) {
    return fail(e, 'Could not change the status.');
  }
  return done(id, companyId);
}

export async function setEngagementOwner(id: string, ownerId: string): Promise<ActionResult> {
  const user = await editor();
  const ws = currentWorkspaceId();
  const next = ownerId || null;
  try {
    await getDb().transaction(async (tx) => {
      const e = await lock(tx, ws, id);
      if (e.ownerId === next) return;
      const [owner] = next ? await tx.select({ name: users.name, email: users.email }).from(users).where(and(eq(users.id, next), isNull(users.disabledAt))) : [];
      if (next && !owner) throw new Error('That person no longer has access.');
      await tx.update(engagements).set({ ownerId: next, updatedAt: new Date() }).where(eq(engagements.id, id));
      await logActivity(tx, { workspaceId: ws, type: 'owner_change', engagementId: id, actorId: user.id, meta: { from: e.ownerId, to: next, toName: owner ? owner.name || owner.email : null } });
    });
  } catch (e) {
    return fail(e, 'Could not change the account manager.');
  }
  return done(id);
}

/* ── files ──────────────────────────────────────────────────────────────── */

const KINDS = ['contract', 'proposal', 'invoice', 'other'] as const;

export async function uploadEngagementFile(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await editor();
  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Choose a file first.' };
  const kind = (KINDS as readonly string[]).includes(String(fd.get('kind'))) ? (String(fd.get('kind')) as (typeof KINDS)[number]) : 'other';
  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = checkFile(file.name, file.size, bytes, file.type);
  if (!checked.ok) return { ok: false, error: checked.error };
  const ws = currentWorkspaceId();
  let companyId: string | null = null;
  try {
    /* Lock and check the record first, so a file is only written for a real customer. */
    await getDb().transaction(async (tx) => {
      const e = await lock(tx, ws, id);
      companyId = e.companyId;
      const key = await savePrivateFile(ws, checked.ext, bytes);
      const [row] = await tx.insert(attachments).values({
        workspaceId: ws, kind, storageKey: key, name: checked.name, sizeBytes: file.size, mime: checked.mime,
        uploadedBy: user.id, engagementId: id, companyId: e.companyId,
      }).returning({ id: attachments.id });
      await recordEvent(tx, { workspaceId: ws, type: 'attachment.added', subjectType: 'engagement', subjectId: id, actorId: user.id, payload: { attachmentId: row.id, kind } });
      await logActivity(tx, { workspaceId: ws, type: 'file', engagementId: id, actorId: user.id, body: `Uploaded ${checked.name}`, meta: { attachmentId: row.id, kind } });
    });
  } catch (e) {
    console.error('[customers] upload failed', e);
    return fail(e, 'The upload failed. Try again.');
  }
  return done(id, companyId);
}

/** Removes a file from the customer. Archived, so it can be recovered; never deleted from disk here. */
export async function archiveFile(fileId: string): Promise<ActionResult> {
  const user = await editor();
  if (!UUID.test(fileId)) return { ok: false, error: 'Unknown file.' };
  const ws = currentWorkspaceId();
  let engagementId: string | null = null;
  await getDb().transaction(async (tx) => {
    const [f] = await tx.select().from(attachments).where(and(eq(attachments.workspaceId, ws), eq(attachments.id, fileId))).for('update');
    if (!f || f.archivedAt) return;
    engagementId = f.engagementId;
    await tx.update(attachments).set({ archivedAt: new Date() }).where(eq(attachments.id, fileId));
    if (f.engagementId) {
      await logActivity(tx, { workspaceId: ws, type: 'file', engagementId: f.engagementId, actorId: user.id, body: `Removed ${f.name}`, meta: { attachmentId: fileId } });
    }
  });
  return engagementId ? done(engagementId) : { ok: true, at: Date.now() };
}
