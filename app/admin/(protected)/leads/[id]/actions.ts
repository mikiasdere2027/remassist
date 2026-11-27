'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, isDatabaseConfigured } from '@/db';
import { activities, leads, tasks, users } from '@/db/schema';
import { assertUser } from '@/lib/auth/require';
import { canEditLeads } from '@/lib/auth/roles';
import { SELECTABLE_STATUSES, type LeadStatus } from '@/lib/leads/display';
import { logActivity, recordEvent, type Writer } from '@/lib/crm/events';
import { currentWorkspaceId, scoped } from '@/lib/crm/workspace';
import { CALL_OUTCOMES, CALL_OUTCOME_LABELS, PRIORITIES, fromLocalInput, type Priority } from '@/lib/crm/display';
import { customFromFormData, validateCustomFields } from '@/lib/crm/fields';
import { getLeadFieldDefs } from '@/lib/crm/leads';
import { nextCadenceDueAt, SLA_DISPOSITION_CODES } from '@/lib/crm/sla';

/**
 * Every write on the lead page.
 *
 * A server action is a POST endpoint with a generated name — it is NOT covered
 * by the (protected) layout's gate, which only runs when rendering a page. So
 * each one re-checks the session and role itself, validates its input, scopes
 * to the workspace, and writes the change, its timeline entry and its event in
 * one transaction.
 */

export type ActionResult = { ok: true; at: number } | { ok: false; error: string };

const UUID = /^[0-9a-f-]{36}$/i;

async function editor() {
  const user = await assertUser();
  if (!canEditLeads(user.role)) throw new Error('forbidden');
  if (!isDatabaseConfigured()) throw new Error('database unavailable');
  return user;
}

/** The lead, locked for update, inside the caller's transaction. */
async function lockLead(tx: Pick<ReturnType<typeof getDb>, 'select'>, ws: string, id: string) {
  if (!UUID.test(id)) throw new Error('bad id');
  const [row] = await tx
    .select({
      id: leads.id,
      status: leads.status,
      ownerId: leads.ownerId,
      priority: leads.priority,
      nextFollowUpAt: leads.nextFollowUpAt,
      firstContactedAt: leads.firstContactedAt,
      dncFlag: leads.dncFlag,
      custom: leads.custom,
    })
    .from(leads)
    .where(scoped(leads.workspaceId, ws, eq(leads.id, id)))
    .for('update');
  if (!row) throw new Error('not found');
  return row;
}

function done(id: string): ActionResult {
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath('/admin/leads');
  return { ok: true, at: Date.now() };
}

async function activeUser(tx: Pick<ReturnType<typeof getDb>, 'select'>, id: string) {
  const [u] = await tx
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.id, id), isNull(users.disabledAt)));
  return u ?? null;
}

/* ── status ─────────────────────────────────────────────────────────────── */

export async function setLeadStatus(id: string, status: string) {
  const user = await editor();
  if (!(SELECTABLE_STATUSES as readonly string[]).includes(status)) throw new Error('bad status');
  const ws = currentWorkspaceId();

  await getDb().transaction(async (tx) => {
    const before = await lockLead(tx, ws, id);
    if (before.status === status) return;
    await tx
      .update(leads)
      .set({
        status: status as LeadStatus,
        updatedAt: new Date(),
        /* The response-time clock stops at the first move out of "new". */
        ...(before.status === 'new' && status !== 'spam' ? { firstContactedAt: sql`coalesce(${leads.firstContactedAt}, now())` } : {}),
      })
      .where(eq(leads.id, id));
    const change = { from: before.status, to: status };
    await recordEvent(tx, { workspaceId: ws, type: 'lead.status_changed', subjectType: 'lead', subjectId: id, actorId: user.id, payload: change });
    await logActivity(tx, { workspaceId: ws, type: 'status_change', leadId: id, actorId: user.id, meta: change });
  });
  done(id);
}

/* ── owner and priority ─────────────────────────────────────────── */

export async function setLeadOwner(id: string, ownerId: string): Promise<ActionResult> {
  const user = await editor();
  const ws = currentWorkspaceId();
  try {
    await getDb().transaction(async (tx) => {
      const before = await lockLead(tx, ws, id);
      const next = ownerId || null;
      if (before.ownerId === next) return;
      const owner = next ? await activeUser(tx, next) : null;
      if (next && !owner) throw new Error('That person no longer has access.');
      await tx.update(leads).set({ ownerId: next, updatedAt: new Date() }).where(eq(leads.id, id));
      const meta = { from: before.ownerId, to: next, toName: owner ? owner.name || owner.email : null };
      await recordEvent(tx, { workspaceId: ws, type: 'lead.assigned', subjectType: 'lead', subjectId: id, actorId: user.id, payload: meta });
      await logActivity(tx, { workspaceId: ws, type: 'owner_change', leadId: id, actorId: user.id, meta });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error && !/^(bad id|not found)$/.test(e.message) ? e.message : 'Could not change the owner.' };
  }
  return done(id);
}

export async function setLeadPriority(id: string, priority: string): Promise<ActionResult> {
  const user = await editor();
  if (!(PRIORITIES as readonly string[]).includes(priority)) return { ok: false, error: 'Unknown priority.' };
  const ws = currentWorkspaceId();
  await getDb().transaction(async (tx) => {
    const before = await lockLead(tx, ws, id);
    if (before.priority === priority) return;
    await tx.update(leads).set({ priority: priority as Priority, updatedAt: new Date() }).where(eq(leads.id, id));
    const meta = { field: 'priority', from: before.priority, to: priority };
    await recordEvent(tx, { workspaceId: ws, type: 'lead.updated', subjectType: 'lead', subjectId: id, actorId: user.id, payload: meta });
    await logActivity(tx, { workspaceId: ws, type: 'system', leadId: id, actorId: user.id, body: `Priority set to ${priority}`, meta });
  });
  return done(id);
}

/* ── notes and calls ────────────────────────────────────────────────────── */

const NoteBody = z.string().trim().min(1, 'Write something first.').max(10_000, 'Keep notes under 10,000 characters.');

export async function addLeadNote(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await editor();
  const parsed = NoteBody.safeParse(fd.get('body') ?? '');
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const ws = currentWorkspaceId();
  await getDb().transaction(async (tx) => {
    await lockLead(tx, ws, id);
    await logActivity(tx, { workspaceId: ws, type: 'note', leadId: id, actorId: user.id, body: parsed.data });
    await tx.update(leads).set({ updatedAt: new Date() }).where(eq(leads.id, id));
    await recordEvent(tx, { workspaceId: ws, type: 'activity.logged', subjectType: 'lead', subjectId: id, actorId: user.id, payload: { kind: 'note' } });
  });
  return done(id);
}

const CallInput = z.object({
  outcome: z.enum(CALL_OUTCOMES),
  dispositionCode: z.enum(SLA_DISPOSITION_CODES).optional(),
  minutes: z.coerce.number().int().min(0).max(600).default(0),
  body: z.string().trim().max(10_000).optional(),
  dnc: z.boolean().optional(),
});

export async function logLeadCall(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await editor();
  const parsed = CallInput.safeParse({
    outcome: fd.get('outcome'),
    dispositionCode: fd.get('dispositionCode') || undefined,
    minutes: fd.get('minutes') || 0,
    body: fd.get('body') || undefined,
    dnc: fd.get('dnc') === 'true',
  });
  if (!parsed.success) return { ok: false, error: 'Choose how the call went.' };
  const { outcome, dispositionCode, minutes, body, dnc } = parsed.data;
  const ws = currentWorkspaceId();
  const markDnc = Boolean(dnc || dispositionCode === 'dnc');

  try {
    await getDb().transaction(async (tx) => {
      const before = await lockLead(tx, ws, id);
      if (before.dncFlag) {
        throw new Error('Lead is marked Do-Not-Call (DNC) and cannot be dialed.');
      }

      const now = new Date();
      await logActivity(tx, {
        workspaceId: ws, type: 'call', leadId: id, actorId: user.id, body: body || null,
        meta: {
          direction: 'outbound',
          outcome,
          dispositionCode: dispositionCode ?? outcome,
          outcomeLabel: CALL_OUTCOME_LABELS[outcome],
          durationSec: minutes * 60,
        },
      });
      /* A call attempt on a new lead is its first touch: the response clock
         and the speed-to-lead firstDialAt clock both stop here. */
      await tx
        .update(leads)
        .set({
          firstContactedAt: sql`coalesce(${leads.firstContactedAt}, case when ${leads.status} = 'new' then now() end)`,
          firstDialAt: sql`coalesce(${leads.firstDialAt}, now())`,
          ...(markDnc ? { dncFlag: true, nextFollowUpAt: null } : {}),
          updatedAt: now,
        })
        .where(eq(leads.id, id));
      await recordEvent(tx, {
        workspaceId: ws,
        type: 'activity.logged',
        subjectType: 'lead',
        subjectId: id,
        actorId: user.id,
        payload: { kind: 'call', outcome, dispositionCode: dispositionCode ?? outcome, minutes, dnc: markDnc },
      });

      if (markDnc) {
        await tx.update(tasks).set({ doneAt: now }).where(and(eq(tasks.leadId, id), isNull(tasks.doneAt)));
        await logActivity(tx, {
          workspaceId: ws,
          type: 'system',
          leadId: id,
          actorId: user.id,
          body: 'Lead marked Do-Not-Call (DNC); open follow-up tasks cancelled.',
        });
        return;
      }

      /* Auto-schedule next Section 7.3 follow-up cadence task on unanswered calls. */
      if (outcome === 'no_answer' || outcome === 'voicemail' || outcome === 'busy') {
        const [{ n }] = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(activities)
          .where(and(eq(activities.workspaceId, ws), eq(activities.leadId, id), eq(activities.type, 'call')));
        const next = nextCadenceDueAt(Math.max(0, n - 1), now);
        if (next) {
          const [t] = await tx
            .insert(tasks)
            .values({
              workspaceId: ws,
              title: `Follow-up callback (${next.step})`,
              priority: 'high',
              dueAt: next.dueAt,
              assigneeId: before.ownerId ?? user.id,
              createdBy: user.id,
              leadId: id,
            })
            .returning({ id: tasks.id });
          await recordEvent(tx, {
            workspaceId: ws,
            type: 'task.created',
            subjectType: 'task',
            subjectId: t.id,
            actorId: user.id,
            payload: { leadId: id, cadenceStep: next.step, dueAt: next.dueAt.toISOString(), auto: true },
          });
          await syncFollowUp(tx, id);
        }
      }
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not log the call.' };
  }
  return done(id);
}

/** Marks a lead Do-Not-Call (DNC) and cancels all open follow-up tasks (Section 7.4). */
export async function markLeadDnc(id: string): Promise<ActionResult> {
  const user = await editor();
  const ws = currentWorkspaceId();
  try {
    await getDb().transaction(async (tx) => {
      const before = await lockLead(tx, ws, id);
      if (before.dncFlag) return;
      const now = new Date();
      await tx.update(leads).set({ dncFlag: true, nextFollowUpAt: null, updatedAt: now }).where(eq(leads.id, id));
      await tx.update(tasks).set({ doneAt: now }).where(and(eq(tasks.leadId, id), isNull(tasks.doneAt)));
      await recordEvent(tx, { workspaceId: ws, type: 'lead.updated', subjectType: 'lead', subjectId: id, actorId: user.id, payload: { field: 'dncFlag', from: false, to: true } });
      await logActivity(tx, { workspaceId: ws, type: 'system', leadId: id, actorId: user.id, body: 'Lead marked Do-Not-Call (DNC); open follow-up tasks cancelled.' });
    });
  } catch {
    return { ok: false, error: 'Could not mark lead as DNC.' };
  }
  return done(id);
}

/* ── tasks ──────────────────────────────────────────────────────────────── */

const TaskInput = z.object({
  title: z.string().trim().min(1, 'Give the task a title.').max(200, 'Keep the title under 200 characters.'),
  priority: z.enum(PRIORITIES).default('medium'),
  assigneeId: z.string().max(100).optional(),
});

export async function addLeadTask(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await editor();
  const parsed = TaskInput.safeParse({
    title: fd.get('title') ?? '',
    priority: fd.get('priority') || undefined,
    assigneeId: fd.get('assigneeId') || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const dueRaw = String(fd.get('due') ?? '');
  const dueAt = dueRaw ? fromLocalInput(dueRaw, Number(fd.get('tz') ?? 0)) : null;
  if (dueRaw && !dueAt) return { ok: false, error: 'That due date is not valid.' };
  const ws = currentWorkspaceId();

  try {
    await getDb().transaction(async (tx) => {
      await lockLead(tx, ws, id);
      const assigneeId = parsed.data.assigneeId || user.id;
      if (!(await activeUser(tx, assigneeId))) throw new Error('That person no longer has access.');
      const [task] = await tx
        .insert(tasks)
        .values({ workspaceId: ws, title: parsed.data.title, priority: parsed.data.priority, dueAt, assigneeId, createdBy: user.id, leadId: id })
        .returning({ id: tasks.id });
      await recordEvent(tx, { workspaceId: ws, type: 'task.created', subjectType: 'task', subjectId: task.id, actorId: user.id, payload: { leadId: id, dueAt: dueAt?.toISOString() ?? null, assigneeId } });
      await logActivity(tx, { workspaceId: ws, type: 'system', leadId: id, actorId: user.id, body: `Task added: ${parsed.data.title}`, meta: { taskId: task.id, dueAt: dueAt?.toISOString() ?? null } });
      /* The earliest open task is the lead's next follow-up. */
      await syncFollowUp(tx, id);
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message.startsWith('That') ? e.message : 'Could not add the task.' };
  }
  return done(id);
}

export async function setTaskDone(taskId: string, isDone: boolean): Promise<ActionResult> {
  const user = await editor();
  if (!UUID.test(taskId)) return { ok: false, error: 'Unknown task.' };
  const ws = currentWorkspaceId();
  let owner: { leadId: string | null; dealId: string | null; companyId: string | null; engagementId: string | null } = { leadId: null, dealId: null, companyId: null, engagementId: null };
  await getDb().transaction(async (tx) => {
    const [t] = await tx
      .select({ id: tasks.id, title: tasks.title, leadId: tasks.leadId, dealId: tasks.dealId, companyId: tasks.companyId, engagementId: tasks.engagementId, doneAt: tasks.doneAt })
      .from(tasks)
      .where(scoped(tasks.workspaceId, ws, eq(tasks.id, taskId)))
      .for('update');
    if (!t) throw new Error('not found');
    owner = { leadId: t.leadId, dealId: t.dealId, companyId: t.companyId, engagementId: t.engagementId };
    if (Boolean(t.doneAt) === isDone) return;
    await tx.update(tasks).set({ doneAt: isDone ? new Date() : null }).where(eq(tasks.id, taskId));
    if (isDone) {
      await recordEvent(tx, { workspaceId: ws, type: 'task.completed', subjectType: 'task', subjectId: taskId, actorId: user.id, payload: owner });
    }
    /* The task's record gets the entry: lead, deal or company. */
    if (t.leadId || t.dealId || t.companyId || t.engagementId) {
      await logActivity(tx, {
        workspaceId: ws, type: 'system', actorId: user.id, ...owner,
        body: `${isDone ? 'Completed' : 'Reopened'} task: ${t.title}`, meta: { taskId },
      });
    }
    if (t.leadId) await syncFollowUp(tx, t.leadId);
  });
  revalidatePath('/admin/tasks');
  if (owner.dealId) revalidatePath(`/admin/deals/${owner.dealId}`);
  if (owner.companyId) revalidatePath(`/admin/companies/${owner.companyId}`);
  if (owner.engagementId) revalidatePath(`/admin/customers/${owner.engagementId}`);
  return owner.leadId ? done(owner.leadId) : { ok: true, at: Date.now() };
}

/**
 * next_follow_up_at = the earliest due date among the lead's open tasks.
 * Derived, never typed in: a follow-up is scheduled by adding a task, so the
 * date and the to-do list can never disagree.
 */
async function syncFollowUp(tx: Writer & Pick<ReturnType<typeof getDb>, 'update'>, leadId: string) {
  await tx
    .update(leads)
    .set({
      nextFollowUpAt: sql`(select min(${tasks.dueAt}) from ${tasks} where ${tasks.leadId} = ${leadId} and ${tasks.doneAt} is null)`,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));
}

/* ── qualification (workspace custom fields) ────────────────────────────── */

export async function saveQualification(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await editor();
  const ws = currentWorkspaceId();
  const defs = await getLeadFieldDefs(ws);
  const input = customFromFormData(defs, fd);

  try {
    await getDb().transaction(async (tx) => {
      const before = await lockLead(tx, ws, id);
      const existing = (before.custom ?? {}) as Record<string, unknown>;
      const parsed = validateCustomFields(defs, input, existing);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const label = defs.find((d) => d.key === issue.path[0])?.label ?? 'A field';
        throw new Error(`${label}: ${issue.message}`);
      }
      const next = { ...existing, ...parsed.data };
      const changed = defs.filter((d) => JSON.stringify(existing[d.key] ?? null) !== JSON.stringify(next[d.key] ?? null));
      if (changed.length === 0) return;
      await tx.update(leads).set({ custom: next, updatedAt: new Date() }).where(eq(leads.id, id));
      const meta = { fields: changed.map((d) => d.key) };
      await recordEvent(tx, { workspaceId: ws, type: 'lead.updated', subjectType: 'lead', subjectId: id, actorId: user.id, payload: meta });
      await logActivity(tx, {
        workspaceId: ws, type: 'system', leadId: id, actorId: user.id, meta,
        body: `Qualification updated: ${changed.map((d) => d.label).join(', ')}`,
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message.includes(':') ? e.message : 'Could not save the qualification.' };
  }
  return done(id);
}
