'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, isDatabaseConfigured } from '@/db';
import { companies, deals, engagements, tasks, users } from '@/db/schema';
import { assertUser } from '@/lib/auth/require';
import { canEditLeads } from '@/lib/auth/roles';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { logActivity, recordEvent } from '@/lib/crm/events';
import { CALL_OUTCOMES, CALL_OUTCOME_LABELS, PRIORITIES, fromLocalInput } from '@/lib/crm/display';
import type { ActionResult } from './leads/[id]/actions';

/**
 * Note / call / task for deals and companies — the same composer the lead page
 * uses. (Leads keep their own actions: a call on a lead also stops its
 * first-response clock and tasks drive its follow-up date.)
 */

type Kind = 'deal' | 'company' | 'engagement';
const UUID = /^[0-9a-f-]{36}$/i;

async function editor() {
  const user = await assertUser();
  if (!canEditLeads(user.role)) throw new Error('forbidden');
  if (!isDatabaseConfigured()) throw new Error('database unavailable');
  return user;
}

/** The record must exist in this workspace; returns the timeline/task reference. */
async function resolve(kind: Kind, id: string) {
  if (!UUID.test(id)) throw new Error('not found');
  const ws = currentWorkspaceId();
  const table = kind === 'deal' ? deals : kind === 'engagement' ? engagements : companies;
  const [row] = await getDb().select({ id: table.id }).from(table).where(and(eq(table.workspaceId, ws), eq(table.id, id))).limit(1);
  if (!row) throw new Error('not found');
  return { ws, ref: kind === 'deal' ? { dealId: id } : kind === 'engagement' ? { engagementId: id } : { companyId: id } };
}

function done(kind: Kind, id: string): ActionResult {
  revalidatePath(kind === 'deal' ? `/admin/deals/${id}` : kind === 'engagement' ? `/admin/customers/${id}` : `/admin/companies/${id}`);
  if (kind === 'deal') revalidatePath('/admin/deals');
  revalidatePath('/admin/tasks');
  return { ok: true, at: Date.now() };
}

const Note = z.string().trim().min(1, 'Write something first.').max(10_000, 'Keep notes under 10,000 characters.');

export async function addRecordNote(kind: Kind, id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await editor();
  const parsed = Note.safeParse(fd.get('body') ?? '');
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { ws, ref } = await resolve(kind, id);
  await getDb().transaction(async (tx) => {
    await logActivity(tx, { workspaceId: ws, type: 'note', actorId: user.id, body: parsed.data, ...ref });
    await recordEvent(tx, { workspaceId: ws, type: 'activity.logged', subjectType: kind, subjectId: id, actorId: user.id, payload: { kind: 'note' } });
  });
  return done(kind, id);
}

const Call = z.object({
  outcome: z.enum(CALL_OUTCOMES),
  minutes: z.coerce.number().int().min(0).max(600).default(0),
  body: z.string().trim().max(10_000).optional(),
});

export async function logRecordCall(kind: Kind, id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await editor();
  const parsed = Call.safeParse({ outcome: fd.get('outcome'), minutes: fd.get('minutes') || 0, body: fd.get('body') || undefined });
  if (!parsed.success) return { ok: false, error: 'Choose how the call went.' };
  const { outcome, minutes, body } = parsed.data;
  const { ws, ref } = await resolve(kind, id);
  await getDb().transaction(async (tx) => {
    await logActivity(tx, {
      workspaceId: ws, type: 'call', actorId: user.id, body: body || null, ...ref,
      meta: { direction: 'outbound', outcome, outcomeLabel: CALL_OUTCOME_LABELS[outcome], durationSec: minutes * 60 },
    });
    await recordEvent(tx, { workspaceId: ws, type: 'activity.logged', subjectType: kind, subjectId: id, actorId: user.id, payload: { kind: 'call', outcome, minutes } });
  });
  return done(kind, id);
}

const Task = z.object({
  title: z.string().trim().min(1, 'Give the task a title.').max(200, 'Keep the title under 200 characters.'),
  priority: z.enum(PRIORITIES).default('medium'),
  assigneeId: z.string().max(100).optional(),
});

export async function addRecordTask(kind: Kind, id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await editor();
  const parsed = Task.safeParse({ title: fd.get('title') ?? '', priority: fd.get('priority') || undefined, assigneeId: fd.get('assigneeId') || undefined });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const dueRaw = String(fd.get('due') ?? '');
  const dueAt = dueRaw ? fromLocalInput(dueRaw, Number(fd.get('tz') ?? 0)) : null;
  if (dueRaw && !dueAt) return { ok: false, error: 'That due date is not valid.' };
  const { ws, ref } = await resolve(kind, id);
  const assigneeId = parsed.data.assigneeId || user.id;
  const [assignee] = await getDb().select({ id: users.id }).from(users).where(and(eq(users.id, assigneeId), isNull(users.disabledAt)));
  if (!assignee) return { ok: false, error: 'That person no longer has access.' };

  await getDb().transaction(async (tx) => {
    const [task] = await tx.insert(tasks).values({
      workspaceId: ws, title: parsed.data.title, priority: parsed.data.priority, dueAt, assigneeId, createdBy: user.id, ...ref,
    }).returning({ id: tasks.id });
    await recordEvent(tx, { workspaceId: ws, type: 'task.created', subjectType: 'task', subjectId: task.id, actorId: user.id, payload: { ...ref, dueAt: dueAt?.toISOString() ?? null, assigneeId } });
    await logActivity(tx, { workspaceId: ws, type: 'system', actorId: user.id, body: `Task added: ${parsed.data.title}`, meta: { taskId: task.id }, ...ref });
  });
  return done(kind, id);
}
