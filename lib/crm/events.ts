import type { getDb } from '@/db';
import { activities, crmEvents } from '@/db/schema';
import type { WorkspaceId } from './workspace';

/**
 * The event log and the activity timeline — the two things every CRM change
 * writes. Call both inside the same transaction as the change itself, so an
 * event is never recorded for a change that rolled back (transactional outbox).
 *
 * Events are for machines: automations, Slack, reports, and later apps such as
 * the calling app consume them. Activities are for people: they are what the
 * timeline on a record shows. A status change writes one of each.
 */

/** Every event type. New modules add theirs here; consumers switch on these. */
export const EVENT_TYPES = [
  'lead.created',
  'lead.updated',
  'lead.status_changed',
  'lead.assigned',
  'lead.converted',
  'company.created',
  'contact.created',
  'activity.logged',
  'task.created',
  'task.completed',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type SubjectType = 'lead' | 'company' | 'contact' | 'task';

/** The database or an open transaction — anything that can insert. */
export type Writer = Pick<ReturnType<typeof getDb>, 'insert'>;

export interface EventInput {
  workspaceId: WorkspaceId;
  type: EventType;
  subjectType: SubjectType;
  subjectId: string;
  /** Null when the system acted (a public form, an automation). */
  actorId?: string | null;
  payload?: Record<string, unknown>;
}

export async function recordEvent(db: Writer, e: EventInput): Promise<void> {
  await db.insert(crmEvents).values({
    workspaceId: e.workspaceId,
    type: e.type,
    subjectType: e.subjectType,
    subjectId: e.subjectId,
    actorId: e.actorId ?? null,
    payload: e.payload ?? {},
  });
}

export type ActivityKind = typeof activities.$inferInsert['type'];

export interface ActivityInput {
  workspaceId: WorkspaceId;
  type: ActivityKind;
  body?: string | null;
  meta?: Record<string, unknown>;
  actorId?: string | null;
  occurredAt?: Date;
  leadId?: string | null;
  companyId?: string | null;
  contactId?: string | null;
}

export async function logActivity(db: Writer, a: ActivityInput): Promise<void> {
  if (!a.leadId && !a.companyId && !a.contactId) {
    throw new Error('an activity must belong to a lead, company or contact');
  }
  await db.insert(activities).values({
    workspaceId: a.workspaceId,
    type: a.type,
    body: a.body ?? null,
    meta: a.meta ?? {},
    actorId: a.actorId ?? null,
    ...(a.occurredAt ? { occurredAt: a.occurredAt } : {}),
    leadId: a.leadId ?? null,
    companyId: a.companyId ?? null,
    contactId: a.contactId ?? null,
  });
}
