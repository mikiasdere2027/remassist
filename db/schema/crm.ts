import {
  pgTable, pgEnum, uuid, text, timestamp, jsonb, boolean, integer, bigint, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';
import { leads } from './leads';

/**
 * CRM foundations — migration 0015.
 *
 * Built to grow past Rem Assist: every CRM table carries workspace_id so that
 * another business (or an industry edition) can later be another workspace on
 * the same system. Today there is exactly one, seeded by the migration with a
 * fixed id, and every query is scoped through lib/crm/workspace.ts.
 */

/** The Rem Assist workspace. Fixed so the migration, defaults and code agree. */
export const DEFAULT_WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  /** The industry template the workspace was created from, e.g. 'staffing'. */
  template: text('template').notNull().default('staffing'),
  /** Per-workspace configuration: terminology, enabled modules, defaults. */
  settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Shared by leads and tasks. */
export const crmPriority = pgEnum('crm_priority', ['low', 'medium', 'high']);

export const companyLifecycle = pgEnum('company_lifecycle', ['prospect', 'customer', 'former']);

const workspaceRef = () =>
  uuid('workspace_id')
    .notNull()
    .default(DEFAULT_WORKSPACE_ID)
    .references(() => workspaces.id, { onDelete: 'restrict' });

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: workspaceRef(),
  name: text('name').notNull(),
  /** Lower-case, no www. The dedupe key for inbound enquiries from a work email. */
  domain: text('domain'),
  industry: text('industry'),
  size: text('size'),
  country: text('country'),
  website: text('website'),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  lifecycle: companyLifecycle('lifecycle').notNull().default('prospect'),
  /** Values for this workspace's custom fields (custom_field_defs). */
  custom: jsonb('custom').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  /** Records are archived, never deleted (roles.ts canDelete is false). */
  archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('companies_workspace_domain_uq').on(t.workspaceId, t.domain).where(sql`${t.domain} is not null`),
  index('companies_workspace_name_idx').on(t.workspaceId, t.name),
]);

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: workspaceRef(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  firstName: text('first_name'),
  lastName: text('last_name'),
  /** Stored lower-cased (lib/crm/dedupe normalizeEmail). */
  email: text('email'),
  /** As entered, for display. */
  phone: text('phone'),
  /** E.164 (+251911234567). What calls are matched on; null if it could not be normalised. */
  phoneE164: text('phone_e164'),
  jobTitle: text('job_title'),
  linkedinUrl: text('linkedin_url'),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  isPrimary: boolean('is_primary').notNull().default(false),
  custom: jsonb('custom').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (t) => [
  index('contacts_workspace_email_idx').on(t.workspaceId, t.email),
  index('contacts_workspace_phone_idx').on(t.workspaceId, t.phoneE164),
  index('contacts_company_idx').on(t.companyId),
]);

export const activityType = pgEnum('activity_type', [
  'note', 'call', 'email', 'meeting', 'status_change', 'owner_change', 'stage_change', 'file', 'system',
]);

/**
 * The timeline on every record, and the audit trail. One nullable reference per
 * record type rather than a generic (entity_type, entity_id) pair, so foreign
 * keys hold and each timeline is a plain indexed lookup. deal_id arrives with
 * the deals table.
 */
export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: workspaceRef(),
  type: activityType('type').notNull(),
  body: text('body'),
  /** Type-specific detail: { from, to } for changes, { durationSec, outcome } for calls. */
  meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
  /** Null when the system did it (an automation, an inbound form). */
  actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }),
}, (t) => [
  index('activities_lead_idx').on(t.leadId, t.occurredAt.desc()),
  index('activities_company_idx').on(t.companyId, t.occurredAt.desc()),
  index('activities_contact_idx').on(t.contactId, t.occurredAt.desc()),
  index('activities_workspace_idx').on(t.workspaceId, t.occurredAt.desc()),
]);

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: workspaceRef(),
  title: text('title').notNull(),
  notes: text('notes'),
  dueAt: timestamp('due_at', { withTimezone: true }),
  doneAt: timestamp('done_at', { withTimezone: true }),
  priority: crmPriority('priority').notNull().default('medium'),
  assigneeId: text('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }),
}, (t) => [
  index('tasks_assignee_open_idx').on(t.workspaceId, t.assigneeId, t.dueAt).where(sql`${t.doneAt} is null`),
  index('tasks_lead_idx').on(t.leadId),
]);

export const customFieldRecord = pgEnum('custom_field_record', ['lead', 'company', 'contact', 'deal']);
export const customFieldType = pgEnum('custom_field_type', [
  'text', 'long_text', 'number', 'date', 'select', 'multiselect', 'boolean', 'url', 'email', 'phone',
]);

/**
 * Workspace-defined fields. Industry editions add fields here instead of in
 * migrations; values live in each record's `custom` column, keyed by `key`.
 */
export const customFieldDefs = pgTable('custom_field_defs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: workspaceRef(),
  record: customFieldRecord('record').notNull(),
  /** Stable machine key, [a-z][a-z0-9_]*. Never renamed once values exist. */
  key: text('key').notNull(),
  label: text('label').notNull(),
  type: customFieldType('type').notNull(),
  /** For select / multiselect: the allowed values in order. */
  options: jsonb('options').$type<string[]>(),
  required: boolean('required').notNull().default(false),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('custom_field_defs_key_uq').on(t.workspaceId, t.record, t.key),
]);

/**
 * The event log (transactional outbox). Every CRM change appends one row in
 * the same transaction as the change; automations, notifications, reports and
 * later apps (calling, industry modules) consume it instead of calling each
 * other. processed_at marks rows a dispatcher has handled.
 */
export const crmEvents = pgTable('crm_events', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  workspaceId: workspaceRef(),
  /** Dotted name from lib/crm/events.ts EVENT_TYPES, e.g. 'lead.created'. */
  type: text('type').notNull(),
  subjectType: text('subject_type').notNull(),
  subjectId: uuid('subject_id').notNull(),
  actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
}, (t) => [
  index('crm_events_pending_idx').on(t.id).where(sql`${t.processedAt} is null`),
  index('crm_events_subject_idx').on(t.subjectType, t.subjectId),
]);
