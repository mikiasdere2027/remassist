/**
 * Seed the rate tables — MIGRATION-PLAN §6.3.
 *
 * Every value here is copied from the current source of truth so the database
 * starts in agreement with the running site:
 *   - seats / monthly hours / labels → lib/quiz/quiz.ts (SEATS, HOURS, HOURS_LABEL)
 *   - hourly rates                   → lib/quiz/quiz.ts score() ($8 / $9 / $11)
 *   - service slugs                  → the ported /services/* routes
 *
 * Nothing reads these tables yet — the quiz still carries the rates inline and
 * its 432-case parity test is what guarantees the arithmetic. Point the quiz at
 * the database only with that test green on both sides; until then this seed
 * exists so the admin (Phase 04) has something real to edit.
 *
 * Idempotent: re-running updates in place rather than failing on the PKs.
 *
 *   DATABASE_URL=postgres://… npm run db:seed
 */
import { getDb } from './index';
import { agentTiers, coverageOptions, serviceCategories } from './schema';

const COVERAGE = [
  { key: 'pt', label: 'Part-time', longLabel: 'about 80 hrs/month (part-time)', seats: 1, monthlyHours: 80, sortOrder: 1 },
  { key: 'ft', label: 'Full-time', longLabel: '160 hrs/month (one full-time seat)', seats: 1, monthlyHours: 160, sortOrder: 2 },
  { key: 'shift', label: 'Two on a rota', longLabel: '320 hrs/month (two seats on a rota)', seats: 2, monthlyHours: 320, sortOrder: 3 },
  { key: 'always', label: 'Always on', longLabel: '640 hrs/month (a 24/7 pod)', seats: 4, monthlyHours: 640, sortOrder: 4 },
];

const TIERS = [
  { key: 'pro', label: 'Pro', hourlyRateUsd: '8.00', sortOrder: 1 },
  { key: 'mid', label: 'Expert lead + Pro seats', hourlyRateUsd: '9.00', sortOrder: 2 },
  { key: 'expert', label: 'Expert', hourlyRateUsd: '11.00', sortOrder: 3 },
];

const SERVICES = [
  { key: 'back', name: 'Virtual Back Office Team', slug: 'virtual-back-office-team', navBlurb: 'The seats that keep operations running behind the front line', sortOrder: 1 },
  { key: 'gtm', name: 'GTM Team', slug: 'gtm-teams', navBlurb: 'A go-to-market pod, hired as one unit', sortOrder: 2 },
  { key: 'sdr', name: 'SDR as a Service', slug: 'sdr-as-a-service', navBlurb: 'Meetings on your calendar, not activity in a dashboard', sortOrder: 3 },
  { key: 'mixed', name: 'Blended pod', slug: 'extra-services', navBlurb: 'Everything we staff, in one place', sortOrder: 4 },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Nothing was written.');
    process.exit(1);
  }
  const db = getDb();

  for (const row of COVERAGE) {
    await db.insert(coverageOptions).values(row)
      .onConflictDoUpdate({ target: coverageOptions.key, set: row });
  }
  for (const row of TIERS) {
    await db.insert(agentTiers).values(row)
      .onConflictDoUpdate({ target: agentTiers.key, set: row });
  }
  for (const row of SERVICES) {
    await db.insert(serviceCategories).values(row)
      .onConflictDoUpdate({ target: serviceCategories.key, set: row });
  }

  console.log(
    `Seeded ${COVERAGE.length} coverage options, ${TIERS.length} tiers, ${SERVICES.length} service categories.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
