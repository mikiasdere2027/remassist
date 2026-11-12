import { and, asc, desc, eq, isNotNull, isNull, lt, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getDb } from '@/db';
import { leads, tasks, users } from '@/db/schema';
import type { WorkspaceId } from './workspace';

/** Reads for the Tasks page. */

export const TASK_VIEWS = [
  { key: 'open', label: 'Open' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'done', label: 'Completed' },
] as const;
export type TaskView = (typeof TASK_VIEWS)[number]['key'];

function viewWhere(view: TaskView, now: Date): SQL[] {
  if (view === 'done') return [isNotNull(tasks.doneAt)];
  if (view === 'overdue') return [isNull(tasks.doneAt), lt(tasks.dueAt, now)];
  return [isNull(tasks.doneAt)];
}

export async function listTasks(ws: WorkspaceId, opts: { view: TaskView; assigneeId?: string; now?: Date }) {
  const now = opts.now ?? new Date();
  const assignee = alias(users, 'assignee');
  const where = [eq(tasks.workspaceId, ws), ...viewWhere(opts.view, now)];
  if (opts.assigneeId) where.push(eq(tasks.assigneeId, opts.assigneeId));

  return getDb()
    .select({
      id: tasks.id,
      title: tasks.title,
      dueAt: tasks.dueAt,
      doneAt: tasks.doneAt,
      priority: tasks.priority,
      assigneeName: assignee.name,
      assigneeEmail: assignee.email,
      leadId: tasks.leadId,
      leadName: leads.name,
      leadEmail: leads.email,
      leadCompany: leads.company,
    })
    .from(tasks)
    .leftJoin(assignee, eq(assignee.id, tasks.assigneeId))
    .leftJoin(leads, eq(leads.id, tasks.leadId))
    .where(and(...where))
    /* Open work: soonest due first, undated last. Done: most recent first. */
    .orderBy(...(opts.view === 'done' ? [desc(tasks.doneAt)] : [sql`${tasks.dueAt} asc nulls last`, asc(tasks.createdAt)]))
    .limit(300);
}

export async function countTasks(ws: WorkspaceId, assigneeId: string | undefined, now = new Date()) {
  const base = [eq(tasks.workspaceId, ws), ...(assigneeId ? [eq(tasks.assigneeId, assigneeId)] : [])];
  const [r] = await getDb()
    .select({
      open: sql<number>`count(*) filter (where ${tasks.doneAt} is null)::int`,
      overdue: sql<number>`count(*) filter (where ${tasks.doneAt} is null and ${tasks.dueAt} < ${now})::int`,
      done: sql<number>`count(*) filter (where ${tasks.doneAt} is not null)::int`,
    })
    .from(tasks)
    .where(and(...base));
  return r;
}
