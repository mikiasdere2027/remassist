import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getDb } from '@/db';
import { activities, customFieldDefs, leads, quizSubmissions, tasks, users } from '@/db/schema';
import type { FieldDef } from './fields';
import { scoped, type WorkspaceId } from './workspace';

/**
 * Reads for the lead detail page. Everything is scoped to the workspace; the
 * page never queries tables itself.
 */

export interface TeamMember {
  id: string;
  name: string;
  email: string;
}

export function memberLabel(u: { name: string | null; email: string }): string {
  return u.name?.trim() || u.email;
}

export async function getTeam(): Promise<TeamMember[]> {
  const rows = await getDb()
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(isNull(users.disabledAt))
    .orderBy(asc(users.email));
  return rows.map((r) => ({ id: r.id, email: r.email, name: memberLabel(r) }));
}

export async function getLeadFieldDefs(ws: WorkspaceId): Promise<FieldDef[]> {
  return getDb()
    .select({
      key: customFieldDefs.key,
      label: customFieldDefs.label,
      type: customFieldDefs.type,
      options: customFieldDefs.options,
      required: customFieldDefs.required,
      archivedAt: customFieldDefs.archivedAt,
    })
    .from(customFieldDefs)
    .where(scoped(customFieldDefs.workspaceId, ws, eq(customFieldDefs.record, 'lead')))
    .orderBy(asc(customFieldDefs.position), asc(customFieldDefs.label));
}

export async function getLeadDetail(ws: WorkspaceId, id: string) {
  const db = getDb();
  const [lead] = await db.select().from(leads).where(scoped(leads.workspaceId, ws, eq(leads.id, id))).limit(1);
  if (!lead) return null;

  const actor = alias(users, 'actor');
  const assignee = alias(users, 'assignee');

  const [quizzes, timeline, taskRows] = await Promise.all([
    db.select().from(quizSubmissions).where(eq(quizSubmissions.leadId, id)).orderBy(desc(quizSubmissions.createdAt)),
    db
      .select({
        id: activities.id,
        type: activities.type,
        body: activities.body,
        meta: activities.meta,
        occurredAt: activities.occurredAt,
        actorName: actor.name,
        actorEmail: actor.email,
      })
      .from(activities)
      .leftJoin(actor, eq(actor.id, activities.actorId))
      .where(scoped(activities.workspaceId, ws, eq(activities.leadId, id)))
      .orderBy(desc(activities.occurredAt))
      .limit(200),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueAt: tasks.dueAt,
        doneAt: tasks.doneAt,
        priority: tasks.priority,
        assigneeId: tasks.assigneeId,
        assigneeName: assignee.name,
        assigneeEmail: assignee.email,
      })
      .from(tasks)
      .leftJoin(assignee, eq(assignee.id, tasks.assigneeId))
      .where(and(eq(tasks.workspaceId, ws), eq(tasks.leadId, id)))
      .orderBy(asc(tasks.doneAt), asc(tasks.dueAt)),
  ]);

  return { lead, quizzes, timeline, tasks: taskRows };
}

export type LeadDetail = NonNullable<Awaited<ReturnType<typeof getLeadDetail>>>;
export type TimelineItem = LeadDetail['timeline'][number];
export type LeadTask = LeadDetail['tasks'][number];
