'use server';

import { revalidatePath } from 'next/cache';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, isDatabaseConfigured } from '@/db';
import { deals, lossReasons, pipelineStages } from '@/db/schema';
import { assertUser } from '@/lib/auth/require';
import { canManageCrmSettings } from '@/lib/auth/roles';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import type { ActionResult } from '../../leads/[id]/actions';

/**
 * Pipeline stages and loss reasons. Admin only, re-checked here because
 * server actions are not covered by the layout's gate. Nothing is deleted:
 * stages and reasons are archived, so old deals keep their history.
 */

const UUID = /^[0-9a-f-]{36}$/i;

async function admin() {
  const user = await assertUser();
  if (!canManageCrmSettings(user.role)) throw new Error('forbidden');
  if (!isDatabaseConfigured()) throw new Error('database unavailable');
  return user;
}

function done(): ActionResult {
  revalidatePath('/admin/settings/crm');
  revalidatePath('/admin/deals');
  return { ok: true, at: Date.now() };
}

type Tx = Pick<ReturnType<typeof getDb>, 'select' | 'update'>;

/** Open stages numbered 10, 20, … in their current order; Won and Lost always last. */
async function renumber(tx: Tx, ws: string, order?: string[]) {
  const rows = await tx.select({ id: pipelineStages.id, kind: pipelineStages.kind }).from(pipelineStages)
    .where(and(eq(pipelineStages.workspaceId, ws), isNull(pipelineStages.archivedAt)))
    .orderBy(asc(pipelineStages.position), asc(pipelineStages.createdAt));
  const open = rows.filter((r) => r.kind === 'open').map((r) => r.id);
  const ids = order ?? open;
  for (let i = 0; i < ids.length; i++) {
    await tx.update(pipelineStages).set({ position: (i + 1) * 10 }).where(eq(pipelineStages.id, ids[i]));
  }
  for (const r of rows.filter((x) => x.kind !== 'open')) {
    await tx.update(pipelineStages).set({ position: r.kind === 'won' ? 1000 : 1010 }).where(eq(pipelineStages.id, r.id));
  }
}

const StageInput = z.object({
  name: z.string().trim().min(1, 'Give the stage a name.').max(60, 'Keep stage names under 60 characters.'),
  probability: z.coerce.number().int('Use a whole number.').min(0, 'Probability is 0 to 100.').max(100, 'Probability is 0 to 100.'),
});

export async function saveStage(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await admin();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown stage.' };
  const parsed = StageInput.safeParse({ name: fd.get('name'), probability: fd.get('probability') });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const ws = currentWorkspaceId();
  const [stage] = await getDb().select({ kind: pipelineStages.kind }).from(pipelineStages)
    .where(and(eq(pipelineStages.workspaceId, ws), eq(pipelineStages.id, id)));
  if (!stage) return { ok: false, error: 'That stage no longer exists.' };
  /* Won is always 100% and Lost 0%: a forecast that counts lost deals is wrong. */
  const probability = stage.kind === 'won' ? 100 : stage.kind === 'lost' ? 0 : parsed.data.probability;
  await getDb().update(pipelineStages).set({ name: parsed.data.name, probability }).where(eq(pipelineStages.id, id));
  return done();
}

export async function addStage(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await admin();
  const parsed = StageInput.safeParse({ name: fd.get('name'), probability: fd.get('probability') });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const ws = currentWorkspaceId();
  await getDb().transaction(async (tx) => {
    await tx.insert(pipelineStages).values({ workspaceId: ws, name: parsed.data.name, probability: parsed.data.probability, kind: 'open', position: 999 });
    await renumber(tx, ws);
  });
  return done();
}

export async function moveStage(id: string, direction: 'up' | 'down'): Promise<ActionResult> {
  await admin();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown stage.' };
  const ws = currentWorkspaceId();
  await getDb().transaction(async (tx) => {
    const open = await tx.select({ id: pipelineStages.id }).from(pipelineStages)
      .where(and(eq(pipelineStages.workspaceId, ws), eq(pipelineStages.kind, 'open'), isNull(pipelineStages.archivedAt)))
      .orderBy(asc(pipelineStages.position), asc(pipelineStages.createdAt));
    const ids = open.map((r) => r.id);
    const i = ids.indexOf(id);
    const j = direction === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await renumber(tx, ws, ids);
  });
  return done();
}

/** Archive an open stage. Refused while deals are in it: move them first. */
export async function archiveStage(id: string): Promise<ActionResult> {
  await admin();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown stage.' };
  const ws = currentWorkspaceId();
  const db = getDb();
  const [stage] = await db.select({ kind: pipelineStages.kind }).from(pipelineStages)
    .where(and(eq(pipelineStages.workspaceId, ws), eq(pipelineStages.id, id)));
  if (!stage) return { ok: false, error: 'That stage no longer exists.' };
  if (stage.kind !== 'open') return { ok: false, error: 'Won and Lost are always part of the pipeline.' };
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(deals).where(eq(deals.stageId, id));
  if (n > 0) return { ok: false, error: `${n} ${n === 1 ? 'deal is' : 'deals are'} in this stage. Move ${n === 1 ? 'it' : 'them'} first.` };
  const [{ open }] = await db.select({ open: sql<number>`count(*)::int` }).from(pipelineStages)
    .where(and(eq(pipelineStages.workspaceId, ws), eq(pipelineStages.kind, 'open'), isNull(pipelineStages.archivedAt)));
  if (open <= 1) return { ok: false, error: 'The pipeline needs at least one open stage.' };
  await db.transaction(async (tx) => {
    await tx.update(pipelineStages).set({ archivedAt: new Date() }).where(eq(pipelineStages.id, id));
    await renumber(tx, ws);
  });
  return done();
}

const ReasonInput = z.string().trim().min(1, 'Write the reason.').max(80, 'Keep reasons under 80 characters.');

export async function addLossReason(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await admin();
  const parsed = ReasonInput.safeParse(fd.get('label') ?? '');
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const ws = currentWorkspaceId();
  const [{ max }] = await getDb().select({ max: sql<number>`coalesce(max(${lossReasons.position}), 0)::int` }).from(lossReasons).where(eq(lossReasons.workspaceId, ws));
  await getDb().insert(lossReasons).values({ workspaceId: ws, label: parsed.data, position: max + 10 });
  return done();
}

export async function saveLossReason(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await admin();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown reason.' };
  const parsed = ReasonInput.safeParse(fd.get('label') ?? '');
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  await getDb().update(lossReasons).set({ label: parsed.data })
    .where(and(eq(lossReasons.workspaceId, currentWorkspaceId()), eq(lossReasons.id, id)));
  return done();
}

/** Archived reasons stay on the deals that used them; they stop being offered. */
export async function archiveLossReason(id: string): Promise<ActionResult> {
  await admin();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown reason.' };
  await getDb().update(lossReasons).set({ archivedAt: new Date() })
    .where(and(eq(lossReasons.workspaceId, currentWorkspaceId()), eq(lossReasons.id, id)));
  return done();
}
