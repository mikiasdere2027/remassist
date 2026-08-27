import { pgTable, text, integer, numeric } from 'drizzle-orm/pg-core';

/**
 * Rate tables — MIGRATION-PLAN §6.3, the fix for §1.3.
 *
 * These are the single source of truth for the home hero, the Qualify page and
 * the pricing page. A rate change becomes one UPDATE instead of an edit in two
 * hand-synced JS arrays that can silently drift apart.
 *
 * NOTE: nothing reads these yet. lib/quiz/quiz.ts still carries the rates
 * inline, and its 432-case parity test is what guarantees the arithmetic. Point
 * the quiz at these tables only with that test green on both sides.
 */
export const coverageOptions = pgTable('coverage_options', {
  key: text('key').primaryKey(),                     // pt | ft | shift | always
  label: text('label').notNull(),
  longLabel: text('long_label').notNull(),
  seats: integer('seats').notNull(),                 // 1 | 1 | 2 | 4
  monthlyHours: integer('monthly_hours').notNull(),  // 80 | 160 | 320 | 640
  sortOrder: integer('sort_order').notNull(),
});

export const agentTiers = pgTable('agent_tiers', {
  key: text('key').primaryKey(),                     // pro | mid | expert
  label: text('label').notNull(),
  /* numeric, not integer: today's rates are whole dollars, but a schema that
     cannot express $8.50 needs a migration the first time pricing gets
     nuanced. */
  hourlyRateUsd: numeric('hourly_rate_usd', { precision: 6, scale: 2 }).notNull(),
  sortOrder: integer('sort_order').notNull(),
});

export const serviceCategories = pgTable('service_categories', {
  key: text('key').primaryKey(),                     // back | gtm | sdr | mixed
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  navBlurb: text('nav_blurb'),
  sortOrder: integer('sort_order').notNull(),
});
