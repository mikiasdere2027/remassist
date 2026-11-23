import {
  pgTable, pgEnum, uuid, text, timestamp, jsonb, boolean, integer, bigint, date, index, uniqueIndex, type AnyPgColumn,
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
  dealId: uuid('deal_id').references((): AnyPgColumn => deals.id, { onDelete: 'cascade' }),
  engagementId: uuid('engagement_id').references((): AnyPgColumn => engagements.id, { onDelete: 'cascade' }),
}, (t) => [
  index('activities_engagement_idx').on(t.engagementId, t.occurredAt.desc()),
  index('activities_deal_idx').on(t.dealId, t.occurredAt.desc()),
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
  dealId: uuid('deal_id').references((): AnyPgColumn => deals.id, { onDelete: 'cascade' }),
  engagementId: uuid('engagement_id').references((): AnyPgColumn => engagements.id, { onDelete: 'cascade' }),
}, (t) => [
  index('tasks_engagement_idx').on(t.engagementId),
  index('tasks_deal_idx').on(t.dealId),
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

/* ── Deals (phase 2, migration 0017) ─────────────────────────────────────── */

export const stageKind = pgEnum('stage_kind', ['open', 'won', 'lost']);

/**
 * Pipeline stages, per workspace — an industry edition brings its own. Exactly
 * one 'won' and one 'lost' stage are expected; open stages are ordered by
 * position and carry the default win probability used for the forecast.
 */
export const pipelineStages = pgTable('pipeline_stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: workspaceRef(),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  /** Default win probability, 0–100, for deals in this stage. */
  probability: integer('probability').notNull().default(0),
  kind: stageKind('kind').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (t) => [
  index('pipeline_stages_workspace_idx').on(t.workspaceId, t.position),
]);

export const lossReasons = pgTable('loss_reasons', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: workspaceRef(),
  label: text('label').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

export const deals = pgTable('deals', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: workspaceRef(),
  title: text('title').notNull(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  stageId: uuid('stage_id').notNull().references(() => pipelineStages.id, { onDelete: 'restrict' }),
  service: text('service'),
  tier: text('tier'),
  seats: integer('seats'),
  /** Hours per month across all seats, as the fit finder quotes them. */
  hoursPerMonth: integer('hours_per_month'),
  /** Hourly rate in cents. */
  rateCents: integer('rate_cents'),
  /** Monthly recurring value in cents: hours × rate, or entered directly. */
  monthlyValueCents: integer('monthly_value_cents').notNull().default(0),
  currency: text('currency').notNull().default('USD'),
  /** Overrides the stage's default probability when set. */
  probability: integer('probability'),
  /** A calendar day (YYYY-MM-DD), not an instant. */
  expectedClose: date('expected_close', { mode: 'string' }),
  stageChangedAt: timestamp('stage_changed_at', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  lossReasonId: uuid('loss_reason_id').references(() => lossReasons.id, { onDelete: 'set null' }),
  lossNote: text('loss_note'),
  quizSubmissionId: uuid('quiz_submission_id'),
  custom: jsonb('custom').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (t) => [
  index('deals_workspace_stage_idx').on(t.workspaceId, t.stageId),
  index('deals_owner_idx').on(t.workspaceId, t.ownerId),
  index('deals_company_idx').on(t.companyId),
  index('deals_lead_idx').on(t.leadId),
]);

/* ── Customers (phase 3, migration 0018) ──────────────────────────────────── */

/**
 * What a won deal becomes: the service being delivered to a customer. "Renewal
 * due" is not a status: it is derived from renewal_date, so it can never be
 * stale.
 */
export const engagementStatus = pgEnum('engagement_status', ['onboarding', 'active', 'paused', 'churned']);

/** A role on an engagement: what is staffed, how many, and who fills it. */
export interface EngagementRole {
  role: string;
  seats: number;
  hoursPerMonth?: number | null;
  /** Names of the Rem Assist staff placed in this role. */
  staff?: string[];
}

/** One onboarding step, ticked off as the customer is set up. */
export interface OnboardingStep {
  key: string;
  label: string;
  doneAt?: string | null;
  doneBy?: string | null;
}

export const engagements = pgTable('engagements', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: workspaceRef(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'restrict' }),
  dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  service: text('service'),
  status: engagementStatus('status').notNull().default('onboarding'),
  /** Account manager. */
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  monthlyValueCents: integer('monthly_value_cents').notNull().default(0),
  currency: text('currency').notNull().default('USD'),
  roles: jsonb('roles').$type<EngagementRole[]>().notNull().default([]),
  onboarding: jsonb('onboarding').$type<OnboardingStep[]>().notNull().default([]),
  startDate: date('start_date', { mode: 'string' }),
  contractEnd: date('contract_end', { mode: 'string' }),
  renewalDate: date('renewal_date', { mode: 'string' }),
  /** Days' notice either side must give before the renewal date. */
  noticeDays: integer('notice_days'),
  churnedAt: timestamp('churned_at', { withTimezone: true }),
  churnReason: text('churn_reason'),
  custom: jsonb('custom').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (t) => [
  index('engagements_workspace_status_idx').on(t.workspaceId, t.status),
  index('engagements_company_idx').on(t.companyId),
  uniqueIndex('engagements_deal_uq').on(t.dealId).where(sql`${t.dealId} is not null`),
  index('engagements_renewal_idx').on(t.workspaceId, t.renewalDate).where(sql`${t.renewalDate} is not null`),
]);

export const attachmentKind = pgEnum('attachment_kind', ['contract', 'proposal', 'invoice', 'other']);

/**
 * Files on a record (contracts first). Stored privately on disk outside the
 * public uploads folder (lib/crm/files.ts) and only ever served through the
 * signed-in admin route /admin/files/[id].
 */
export const attachments = pgTable('attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: workspaceRef(),
  kind: attachmentKind('kind').notNull().default('other'),
  /** Path relative to the private file directory. Never shown to users. */
  storageKey: text('storage_key').notNull(),
  name: text('name').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  mime: text('mime').notNull(),
  uploadedBy: text('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  engagementId: uuid('engagement_id').references(() => engagements.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
}, (t) => [
  index('attachments_engagement_idx').on(t.engagementId),
  index('attachments_company_idx').on(t.companyId),
]);

/* ── Proposals (phase 6, migration 0020) ──────────────────────────────────── */

export const proposalStatus = pgEnum('proposal_status', ['draft', 'sent', 'viewed', 'accepted', 'declined', 'withdrawn']);

/** A priced line, frozen into the proposal (see lib/crm/proposals.ts). */
export interface ProposalLineRow {
  kind: 'monthly' | 'one_off';
  description: string;
  tier: string | null;
  coverage: string | null;
  seats: number | null;
  hoursPerMonth: number | null;
  rateCents: number | null;
  amountCents: number;
}

/**
 * A proposal for a deal. Editable only as a draft; once sent, its lines and
 * totals never change (a revision is a new proposal). The client opens it at
 * /p/<public_token> and can accept or decline there.
 */
export const proposals = pgTable('proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: workspaceRef(),
  dealId: uuid('deal_id').notNull().references(() => deals.id, { onDelete: 'cascade' }),
  number: text('number').notNull(),
  title: text('title').notNull(),
  status: proposalStatus('status').notNull().default('draft'),
  intro: text('intro'),
  terms: text('terms'),
  lines: jsonb('lines').$type<ProposalLineRow[]>().notNull().default([]),
  /** Discount on the monthly fees, in basis points (1000 = 10%). */
  discountBps: integer('discount_bps').notNull().default(0),
  currency: text('currency').notNull().default('USD'),
  monthlyCents: integer('monthly_cents').notNull().default(0),
  oneOffCents: integer('one_off_cents').notNull().default(0),
  validUntil: date('valid_until', { mode: 'string' }),
  /** Unguessable link token for the client view. */
  publicToken: text('public_token').notNull(),
  recipientName: text('recipient_name'),
  recipientEmail: text('recipient_email'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  viewedAt: timestamp('viewed_at', { withTimezone: true }),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  decidedByName: text('decided_by_name'),
  decisionNote: text('decision_note'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('proposals_token_uq').on(t.publicToken),
  uniqueIndex('proposals_number_uq').on(t.workspaceId, t.number),
  index('proposals_deal_idx').on(t.dealId),
  index('proposals_workspace_status_idx').on(t.workspaceId, t.status),
]);
