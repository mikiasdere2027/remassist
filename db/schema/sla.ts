import {
  pgTable, pgEnum, uuid, text, timestamp, integer, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';
import { DEFAULT_WORKSPACE_ID, engagements, workspaces } from './crm';
import { leads } from './leads';

/**
 * SLA & SOP operational tracking — migration 0022.
 *
 * Supports Thorwell × REM Assistance SLA commitments:
 * - appointments: REM-agent vs AI-assistant attribution and completion status
 *   for $10.00 commission reconciliation (Exhibit A).
 * - agent_sessions: 84 hr/wk shift coverage, uptime %, and handoff notes.
 * - sla_incidents: Critical (15m/60m), High (1h), and Standard (1d/3d) tracking.
 */

const workspaceRef = () =>
  uuid('workspace_id')
    .notNull()
    .default(DEFAULT_WORKSPACE_ID)
    .references(() => workspaces.id, { onDelete: 'restrict' });

export const appointmentChannel = pgEnum('appointment_channel', ['rem_agent', 'ai_assistant', 'internal']);
export const appointmentStatus = pgEnum('appointment_status', ['scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled']);

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: workspaceRef(),
  engagementId: uuid('engagement_id').references(() => engagements.id, { onDelete: 'set null' }),
  leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  bookedByUserId: text('booked_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  bookedByChannel: appointmentChannel('booked_by_channel').notNull().default('rem_agent'),
  status: appointmentStatus('status').notNull().default('scheduled'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  statusUpdatedAt: timestamp('status_updated_at', { withTimezone: true }),
  externalRef: text('external_ref'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('appointments_workspace_scheduled_idx').on(t.workspaceId, t.scheduledAt.desc()),
  index('appointments_lead_idx').on(t.leadId, t.scheduledAt.desc()),
  index('appointments_engagement_idx').on(t.engagementId, t.scheduledAt.desc()),
]);

export const shiftType = pgEnum('shift_type', ['weekday_day', 'weekday_eve', 'sat_full', 'sun_full', 'bench']);

export const agentSessions = pgTable('agent_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: workspaceRef(),
  engagementId: uuid('engagement_id').references(() => engagements.id, { onDelete: 'set null' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  shiftType: shiftType('shift_type').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  handoffNotes: text('handoff_notes'),
  appointmentsBooked: integer('appointments_booked').notNull().default(0),
}, (t) => [
  index('agent_sessions_workspace_open_idx').on(t.workspaceId, t.startedAt.desc()).where(sql`${t.endedAt} is null`),
  index('agent_sessions_user_idx').on(t.userId, t.startedAt.desc()),
]);

export const incidentSeverity = pgEnum('incident_severity', ['critical', 'high', 'standard']);

export const slaIncidents = pgTable('sla_incidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: workspaceRef(),
  engagementId: uuid('engagement_id').references(() => engagements.id, { onDelete: 'set null' }),
  severity: incidentSeverity('severity').notNull().default('critical'),
  title: text('title').notNull(),
  summary: text('summary'),
  detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  rootCause: text('root_cause'),
  correctiveAction: text('corrective_action'),
}, (t) => [
  index('sla_incidents_workspace_idx').on(t.workspaceId, t.detectedAt.desc()),
]);
