#!/usr/bin/env node
/**
 * One-off backfill for the columns added in migration 0001.
 *
 * Before that migration the contact form concatenated the visitor's country and
 * service selection into the free-text `message`, and joined their first and
 * last name into `name`. This recovers what can be recovered from rows already
 * in the table.
 *
 * Run manually, never on deploy. Dry-run by default.
 *
 *   node tools/backfill-lead-fields.mjs            # show what would change
 *   node tools/backfill-lead-fields.mjs --apply    # write it
 *
 * Deliberately best-effort: a row that does not match cleanly is skipped rather
 * than guessed at. Guessing here would put wrong data in a column that looks
 * authoritative, which is worse than leaving it null.
 *
 * `consent_at` is NOT backfilled and cannot be. That agreement was never
 * recorded, and inventing a timestamp for it would be fabricating a consent
 * record — the one thing the column exists to be trustworthy about.
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const f of ['.env.local', '.env']) {
    try {
      const m = /^DATABASE_URL=(.*)$/m.exec(readFileSync(f, 'utf8'));
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    } catch { /* next */ }
  }
  return null;
}

/**
 * The exact shape the old client wrote, from ContactRailForm before the change:
 *   Needs: <service>\nCountry: <country>\n<the rest>
 * Either line may be absent — they were only included when answered.
 */
function parseMessage(message) {
  if (!message) return null;
  const lines = message.split('\n');
  let service;
  let country;
  let i = 0;
  if (lines[i]?.startsWith('Needs: ')) service = lines[i++].slice(7).trim();
  if (lines[i]?.startsWith('Country: ')) country = lines[i++].slice(9).trim();
  if (!service && !country) return null;
  return { service: service || null, country: country || null };
}

/**
 * Only split a name we are confident about. Two tokens is a first and a last;
 * three could be a middle name, a two-word surname or a title, and splitting it
 * would put the wrong string in a column somebody later trusts.
 */
function parseName(name) {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  return { first: parts[0], last: parts[1] };
}

const url = connectionString();
if (!url) {
  console.error('DATABASE_URL is not set and no .env.local was found. Nothing was read.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });
const client = await pool.connect();

let examined = 0;
let messageHits = 0;
let nameHits = 0;
const skipped = [];

try {
  const { rows } = await client.query(`
    select id, name, first_name, last_name, country, service_interest, message
    from leads
    where country is null or service_interest is null or first_name is null
    order by created_at desc
  `);

  console.log(`${rows.length} row(s) with something still to fill.\n`);

  for (const r of rows) {
    examined++;
    const sets = [];
    const vals = [];

    const parsedMsg = parseMessage(r.message);
    if (parsedMsg) {
      if (!r.country && parsedMsg.country) {
        vals.push(parsedMsg.country);
        sets.push(`country = $${vals.length}`);
      }
      if (!r.service_interest && parsedMsg.service) {
        vals.push(parsedMsg.service);
        sets.push(`service_interest = $${vals.length}`);
      }
    }

    const parsedName = parseName(r.name);
    if (parsedName && !r.first_name && !r.last_name) {
      vals.push(parsedName.first);
      sets.push(`first_name = $${vals.length}`);
      vals.push(parsedName.last);
      sets.push(`last_name = $${vals.length}`);
    }

    if (!sets.length) {
      skipped.push({ id: r.id, name: r.name, reason: reasonFor(r, parsedMsg, parsedName) });
      continue;
    }

    if (parsedMsg) messageHits++;
    if (parsedName && !r.first_name) nameHits++;

    console.log(`${APPLY ? 'UPDATE' : 'would update'} ${r.id}`);
    for (const s of sets) console.log(`    ${s.replace(/\$\d+/, (m) => JSON.stringify(vals[Number(m.slice(1)) - 1]))}`);

    if (APPLY) {
      vals.push(r.id);
      await client.query(`update leads set ${sets.join(', ')} where id = $${vals.length}`, vals);
    }
  }

  console.log(`\n${examined} examined · ${messageHits} with country/service recovered · ${nameHits} with a name split`);
  if (skipped.length) {
    console.log(`${skipped.length} skipped (left as they are):`);
    for (const s of skipped.slice(0, 20)) console.log(`    ${s.id}  ${s.reason}`);
    if (skipped.length > 20) console.log(`    …and ${skipped.length - 20} more`);
  }
  console.log(
    APPLY
      ? '\nApplied. consent_at was not touched — it cannot be reconstructed.'
      : '\nDry run — nothing was written. Re-run with --apply to commit.',
  );
} finally {
  client.release();
  await pool.end();
}

function reasonFor(r, parsedMsg, parsedName) {
  if (!r.message && !r.name) return 'nothing to parse';
  if (!parsedMsg && !parsedName) {
    if (r.name && r.name.trim().split(/\s+/).length > 2) return 'name is ambiguous to split';
    return 'message does not match the old format';
  }
  return 'already populated';
}
