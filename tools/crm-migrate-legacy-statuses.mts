/**
 * Move pre-CRM lead statuses onto the CRM model (phase 2). Run once:
 *
 *   npx tsx tools/crm-migrate-legacy-statuses.mts           # dry run: counts only
 *   npx tsx tools/crm-migrate-legacy-statuses.mts --apply   # do it
 *
 * - "won"  → converted, with a company (if one was given), a contact and a
 *            deal in the Won stage, closed when the lead was last updated.
 * - "lost" → unqualified, with the reason "Marked lost before the CRM".
 *
 * Each lead is its own transaction, and only won/lost rows are touched, so it
 * is safe to re-run. The status enum keeps the old values (migrations only
 * add); nothing sets them any more.
 *
 * Talks to pg directly, like the other tools: db/index.ts does a directory
 * import that plain ESM cannot resolve outside Next's bundler.
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { companyDomainFromEmail, normalizeEmail } from '../lib/crm/dedupe.ts';

const WS = '00000000-0000-4000-8000-000000000001';
const apply = process.argv.includes('--apply');

function databaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const f of ['.env.local', '.env']) {
    try {
      const m = /^DATABASE_URL=(.*)$/m.exec(readFileSync(f, 'utf8'));
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    } catch {
      /* next file */
    }
  }
  return undefined;
}

const url = databaseUrl();
if (!url) {
  console.error('DATABASE_URL is not set and no .env.local was found. Nothing was changed.');
  process.exit(1);
}
const db = new pg.Client({ connectionString: url });
await db.connect();

try {
  const { rows: legacy } = await db.query(
    `select id, status, name, first_name, last_name, email, phone, company, country, service_interest, owner_id, updated_at
     from leads where workspace_id = $1 and status in ('won', 'lost') order by created_at`, [WS]);
  const won = legacy.filter((l) => l.status === 'won');
  const lost = legacy.filter((l) => l.status === 'lost');
  console.log(`Found ${won.length} won and ${lost.length} lost leads.`);
  if (!apply) {
    console.log('Dry run. Re-run with --apply to migrate them.');
    process.exit(0);
  }

  const { rows: [wonStage] } = await db.query(`select id from pipeline_stages where workspace_id = $1 and kind = 'won' and archived_at is null limit 1`, [WS]);
  if (!wonStage) throw new Error('No Won stage exists. Run the 0017 migration first.');

  for (const l of lost) {
    await db.query('begin');
    await db.query(`update leads set status = 'unqualified', disqualify_reason = coalesce(disqualify_reason, 'Marked lost before the CRM'), updated_at = now() where id = $1 and status = 'lost'`, [l.id]);
    await db.query(`insert into activities (workspace_id, type, lead_id, meta, body) values ($1, 'status_change', $2, $3, 'Moved from the pre-CRM "lost" status')`,
      [WS, l.id, JSON.stringify({ from: 'lost', to: 'unqualified' })]);
    await db.query('commit');
  }

  for (const l of won) {
    await db.query('begin');
    try {
      const email = normalizeEmail(l.email);
      const domain = companyDomainFromEmail(l.email);
      let companyId: string | null = null;
      if (l.company) {
        const found = domain
          ? (await db.query('select id from companies where workspace_id = $1 and domain = $2 limit 1', [WS, domain])).rows[0]
          : undefined;
        const byName = found ?? (await db.query('select id from companies where workspace_id = $1 and lower(name) = lower($2) limit 1', [WS, l.company])).rows[0];
        companyId = byName?.id ?? (await db.query(
          `insert into companies (workspace_id, name, domain, country, owner_id, lifecycle) values ($1, $2, $3, $4, $5, 'customer') returning id`,
          [WS, l.company, domain, l.country, l.owner_id])).rows[0].id;
        await db.query(`update companies set lifecycle = 'customer', updated_at = now() where id = $1`, [companyId]);
      }

      let contactId: string | null = null;
      if (email) {
        const existing = (await db.query('select id from contacts where workspace_id = $1 and email = $2 limit 1', [WS, email])).rows[0];
        const nameParts = (l.name ?? '').split(/\s+/).filter(Boolean);
        contactId = existing?.id ?? (await db.query(
          `insert into contacts (workspace_id, company_id, email, first_name, last_name, phone, owner_id, is_primary)
           values ($1, $2, $3, $4, $5, $6, $7, not exists (select 1 from contacts where company_id = $2 and is_primary)) returning id`,
          [WS, companyId, email, l.first_name ?? nameParts[0] ?? null, l.last_name ?? (nameParts.slice(1).join(' ') || null), l.phone, l.owner_id])).rows[0].id;
      }

      const title = `${l.company || l.name || l.email} — ${l.service_interest || 'Engagement'}`;
      const { rows: [deal] } = await db.query(
        `insert into deals (workspace_id, title, company_id, contact_id, lead_id, owner_id, stage_id, service, closed_at, stage_changed_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) returning id`,
        [WS, title, companyId, contactId, l.id, l.owner_id, wonStage.id, l.service_interest, l.updated_at]);
      await db.query(
        `update leads set status = 'converted', converted_at = coalesce(converted_at, $2), company_id = coalesce(company_id, $3), contact_id = coalesce(contact_id, $4), updated_at = now()
         where id = $1 and status = 'won'`, [l.id, l.updated_at, companyId, contactId]);
      await db.query(`insert into activities (workspace_id, type, deal_id, body) values ($1, 'system', $2, 'Created from a lead marked won before the CRM. Add its monthly value on the Terms card.')`, [WS, deal.id]);
      await db.query(`insert into activities (workspace_id, type, lead_id, meta) values ($1, 'status_change', $2, $3)`,
        [WS, l.id, JSON.stringify({ from: 'won', to: 'converted', dealId: deal.id })]);
      await db.query('commit');
    } catch (e) {
      await db.query('rollback');
      console.error(`Lead ${l.id} was not migrated:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`Migrated: ${won.length} won → converted (with Won deals), ${lost.length} lost → unqualified.`);
} finally {
  await db.end();
}
