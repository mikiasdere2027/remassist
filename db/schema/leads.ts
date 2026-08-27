import {
  pgTable, pgEnum, uuid, text, timestamp, jsonb, boolean, index,
} from 'drizzle-orm/pg-core';
import type { Answers, QuizResult } from '@/lib/quiz/quiz';

/**
 * Capture schema — MIGRATION-PLAN §6.2.
 */

export const leadSource = pgEnum('lead_source', [
  'qualify_quiz', 'ask_widget', 'contact_form', 'pricing_cta',
]);

export const leadStatus = pgEnum('lead_status', [
  'new', 'contacted', 'qualified', 'won', 'lost', 'spam',
]);

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  name: text('name'),
  email: text('email').notNull(),
  phone: text('phone'),
  company: text('company'),
  message: text('message'),
  source: leadSource('source').notNull(),
  status: leadStatus('status').notNull().default('new'),
  pageUrl: text('page_url'),
  referrer: text('referrer'),
  utm: jsonb('utm').$type<Record<string, string>>(),
}, (t) => [
  index('leads_created_idx').on(t.createdAt.desc()),
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
