import { and, asc, desc, eq, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getDb } from '@/db';
import { activities, tasks, users } from '@/db/schema';
import type { WorkspaceId } from './workspace';

/**
 * The timeline and the task list, for any record type. Leads, deals and
 * companies all show the same two things, read the same way.
 */
export type RecordRef = { leadId: string } | { dealId: string } | { companyId: string } | { engagementId: string };

function activityWhere(ws: WorkspaceId, ref: RecordRef): SQL {
  const by =
    'leadId' in ref ? eq(activities.leadId, ref.leadId)
      : 'dealId' in ref ? eq(activities.dealId, ref.dealId)
        : 'engagementId' in ref ? eq(activities.engagementId, ref.engagementId)
          : eq(activities.companyId, ref.companyId);
  return and(eq(activities.workspaceId, ws), by) as SQL;
}

function taskWhere(ws: WorkspaceId, ref: RecordRef): SQL {
  const by =
    'leadId' in ref ? eq(tasks.leadId, ref.leadId)
      : 'dealId' in ref ? eq(tasks.dealId, ref.dealId)
        : 'engagementId' in ref ? eq(tasks.engagementId, ref.engagementId)
          : eq(tasks.companyId, ref.companyId);
  return and(eq(tasks.workspaceId, ws), by) as SQL;
}

export async function getTimeline(ws: WorkspaceId, ref: RecordRef, limit = 200) {
  const actor = alias(users, 'actor');
  return getDb()
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
    .where(activityWhere(ws, ref))
    .orderBy(desc(activities.occurredAt))
    .limit(limit);
}

export async function getTasksFor(ws: WorkspaceId, ref: RecordRef) {
  const assignee = alias(users, 'assignee');
  return getDb()
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
    .where(taskWhere(ws, ref))
    .orderBy(asc(tasks.doneAt), asc(tasks.dueAt));
}

export type TimelineRow = Awaited<ReturnType<typeof getTimeline>>[number];
export type TaskRow = Awaited<ReturnType<typeof getTasksFor>>[number];
