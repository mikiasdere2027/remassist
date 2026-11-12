/**
 * Score the leads captured before scoring existed (leads.score is null).
 *
 *   npx tsx tools/crm-backfill-scores.mts
 *
 * Uses the same rules as new enquiries (lib/crm/scoring.ts), including the
 * fit-finder answers where there are some, and sets the priority from the
 * score. Only touches rows whose score is null, so it is safe to run again,
 * and keeps any priority a person has set by hand (recorded in activities).
 *
 * Talks to pg directly, like create-admin.mts: db/index.ts does a directory
 * import that plain ESM cannot resolve outside Next's bundler.
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { scoreLead } from '../lib/crm/scoring.ts';

function databaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const f of ['.env.local', '.env']) {
    try {
      const m = /^DATABASE_URL=(.*)$/m.exec(readFileSync(f, 'utf8'));
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    } catch {
      /* try the next file */
    }
  }
  return undefined;
}

const url = databaseUrl();
if (!url) {
  console.error('DATABASE_URL is not set and no .env.local was found. Nothing was changed.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const { rows } = await client.query(`
    select l.id, l.source, l.email, l.phone, l.company, l.message, l.service_interest,
           q.completed, q.result->>'seats' as seats, q.answers->>'timing' as timing
    from leads l
    left join lateral (
      select completed, result, answers from quiz_submissions
      where lead_id = l.id order by created_at desc limit 1
    ) q on true
    where l.score is null`);

  let updated = 0;
  for (const r of rows) {
    const s = scoreLead({
      source: r.source,
      email: r.email,
      phone: r.phone,
      company: r.company,
      message: r.message,
      serviceInterest: r.service_interest,
      quiz: r.completed === null ? null : { completed: r.completed, seats: Number(r.seats) || 0, timing: r.timing ?? undefined },
    });
    const res = await client.query(
      `update leads set score = $1,
         priority = case
           when exists (select 1 from activities a where a.lead_id = leads.id and a.meta->>'field' = 'priority')
           then priority else $2::crm_priority end
       where id = $3 and score is null`,
      [s.score, s.priority, r.id],
    );
    updated += res.rowCount ?? 0;
  }
  console.log(`Scored ${updated} of ${rows.length} unscored leads.`);
} finally {
  await client.end();
}
