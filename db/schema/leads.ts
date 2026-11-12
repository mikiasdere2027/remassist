import {
  pgTable, pgEnum, uuid, text, timestamp, jsonb, boolean, integer, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { Answers, QuizResult } from '@/lib/quiz/quiz';
import { users } from './auth';
import { DEFAULT_WORKSPACE_ID, companies, contacts, crmPriority, workspaces } from './crm';

/**
 * Capture schema — MIGRATION-PLAN §6.2.
 */

/* The public form may only submit the first five (lib/leads/schema.ts
   LEAD_SOURCES); the rest are for leads the team adds or imports (0015). */
export const leadSource = pgEnum('lead_source', [
  'qualify_quiz', 'ask_widget', 'contact_form', 'pricing_cta', 'voice_agent',
  'manual', 'import', 'referral', 'outbound', 'event',
]);

/* nurturing / unqualified / converted were added in 0015. won and lost stay
   until the deals phase moves their rows to converted / unqualified: a
   migration may only add, because it runs while the previous release serves. */
export const leadStatus = pgEnum('lead_status', [
  'new', 'contacted', 'qualified', 'won', 'lost', 'spam', 'nurturing', 'unqualified', 'converted',
]);

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  /**
   * Derived display name, kept because lib/notify.ts renders it into the Slack
   * message. firstName/lastName are the real capture; this is what they join to.
   */
  name: text('name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email').notNull(),
  phone: text('phone'),
  company: text('company'),
  country: text('country'),
  serviceInterest: text('service_interest'),
  message: text('message'),
  /**
   * When the visitor ticked the privacy consent box, not whether. A privacy
   * policy has to evidence *when* someone agreed, and a boolean cannot. Null
   * means no consent was recorded — including for every row written before this
   * column existed, which is why the backfill deliberately leaves it alone.
   */
  consentAt: timestamp('consent_at', { withTimezone: true }),
  source: leadSource('source').notNull(),
  status: leadStatus('status').notNull().default('new'),
  pageUrl: text('page_url'),
  referrer: text('referrer'),
  utm: jsonb('utm').$type<Record<string, string>>(),
  /**
   * The complete submitted field set, verbatim, honeypot excluded. The named
   * columns above are what we filter and sort on; this is the guarantee that a
   * field added to a form tomorrow is still readable in admin before anyone
   * writes a migration for it. Country and service were lost this way once.
   */
  rawFields: jsonb('raw_fields').$type<Record<string, string>>(),

  /* ── CRM (0015) ── */
  workspaceId: uuid('workspace_id').notNull().default(DEFAULT_WORKSPACE_ID)
    .references(() => workspaces.id, { onDelete: 'restrict' }),
  /** Who is responsible. Null = unassigned. */
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  priority: crmPriority('priority').notNull().default('medium'),
  /** 0–100 from lib/crm/scoring.ts, stored so lists can sort on it. */
  score: integer('score'),
  tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
  nextFollowUpAt: timestamp('next_follow_up_at', { withTimezone: true }),
  /** First outbound touch — the response-time clock stops here. */
  firstContactedAt: timestamp('first_contacted_at', { withTimezone: true }),
  convertedAt: timestamp('converted_at', { withTimezone: true }),
  disqualifyReason: text('disqualify_reason'),
  custom: jsonb('custom').$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('leads_created_idx').on(t.createdAt.desc()),
  index('leads_workspace_owner_idx').on(t.workspaceId, t.ownerId, t.createdAt.desc()),
  index('leads_follow_up_idx').on(t.workspaceId, t.nextFollowUpAt).where(sql`${t.nextFollowUpAt} is not null`),
  index('leads_email_idx').on(t.email),
  index('leads_status_idx').on(t.status),
]);

export const quizSubmissions = pgTable('quiz_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  /**
   * Nullable on purpose: the quiz is answered *before* the email is asked for,
   * so a partial funnel still produces an analysable row. Writing this only on
   * email capture would discard the most interesting drop-off data.
   */
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  answers: jsonb('answers').$type<Partial<Answers>>().notNull(),
  /**
   * A frozen snapshot, never recomputed on read. When rates change a historical
   * quote must still show what that prospect was actually told — recomputing
   * would silently rewrite history.
   */
  result: jsonb('result').$type<QuizResult>().notNull(),
  completed: boolean('completed').notNull().default(false),
}, (t) => [
  index('quiz_created_idx').on(t.createdAt.desc()),
]);
