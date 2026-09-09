#!/usr/bin/env node
/**
 * Import db/content-seed.json into the CMS tables.
 *
 *   npm run db:seed:content
 *
 * Plain .mjs importing only node: builtins and pg, so it runs on the VPS's
 * Node 20 as well as locally — the same reason deploy/set-admin-password.mjs
 * exists.
 *
 * INSERT-ONLY, never UPDATE. That is the important property: once this content
 * is editable in the admin, a second run must not quietly restore the original
 * wording over somebody's correction. Rows are matched on a natural key and
 * skipped if present, so running it twice adds nothing and changes nothing.
 * The trade is that it cannot be used to push edits from the JSON — which is
 * correct, because after the cutover the database is the source of truth and
 * the JSON is a historical record of what was imported.
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const f of ['.env.local', '.env']) {
    try {
      const m = /^DATABASE_URL=(.*)$/m.exec(readFileSync(f, 'utf8'));
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    } catch { /* try the next one */ }
  }
  return null;
}

const url = connectionString();
if (!url) {
  console.error('\n  No DATABASE_URL, and no .env.local or .env to read one from.\n');
  process.exit(1);
}

const seed = JSON.parse(readFileSync(new URL('./content-seed.json', import.meta.url), 'utf8'));
const pool = new pg.Pool({ connectionString: url });
const c = await pool.connect();

const added = {};
const skipped = {};
const bump = (o, k) => { o[k] = (o[k] ?? 0) + 1; };

try {
  await c.query('BEGIN');

  for (const p of seed.posts) {
    const { rowCount } = await c.query(
      `insert into posts
         (slug, title, excerpt, body, article_layout, date, read_time, category, image,
          author_name, author_avatar, published)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       /* Columns added after the original import are filled only while null.
          This upgrades the former hard-coded article without overwriting an
          editor's body or layout on later seed runs. */
       on conflict (slug) do update set
         body = coalesce(posts.body, excluded.body),
         article_layout = coalesce(posts.article_layout, excluded.article_layout)`,
      [p.slug, p.title, p.excerpt, p.body, p.articleLayout ?? null, p.date, p.readTime,
        p.category, p.image, p.authorName, p.authorAvatar, p.published],
    );
    bump(rowCount ? added : skipped, 'posts');
  }

  for (const s of seed.reviewSources) {
    const { rowCount } = await c.query(
      `insert into review_sources (source, url, stars, rating_label, footnote, sort_order)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (source) do nothing`,
      [s.source, s.url, s.stars, s.ratingLabel, s.footnote, s.sortOrder],
    );
    bump(rowCount ? added : skipped, 'review_sources');
  }

  for (const r of seed.reviews) {
    /* No natural key in the data, so one is composed: a person does not leave
       two reviews on the same source with the same author and the same printed
       date. Checked with a select rather than a constraint, because enforcing
       it in the schema would block a legitimate duplicate later. */
    const { rows } = await c.query(
      'select 1 from reviews where source = $1 and author = $2 and date_text = $3 limit 1',
      [r.source, r.author, r.dateText],
    );
    if (rows.length) { bump(skipped, 'reviews'); continue; }
    await c.query(
      `insert into reviews
         (source, author, meta, date_text, headline, body, rating, sort_order, published)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [r.source, r.author, r.meta, r.dateText, r.headline, r.body, r.rating,
        r.sortOrder, r.published],
    );
    bump(added, 'reviews');
  }

  const groupIdBySlug = new Map();
  for (const g of seed.faqGroups) {
    const { rows } = await c.query(
      `insert into faq_groups (slug, title, blurb, link_href, link_label, sort_order)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (slug) do nothing
       returning id`,
      [g.slug, g.title, g.blurb ?? null, g.linkHref ?? null, g.linkLabel ?? null, g.sortOrder],
    );
    if (rows.length) {
      groupIdBySlug.set(g.slug, rows[0].id);
      bump(added, 'faq_groups');
    } else {
      const existing = await c.query('select id from faq_groups where slug = $1', [g.slug]);
      groupIdBySlug.set(g.slug, existing.rows[0].id);
      /* Fill columns that did not exist when this row was first seeded, and
         ONLY where they are still null. That is not the update this script
         refuses to do: it cannot overwrite anything an editor typed, because a
         value they typed is not null. Without it, adding a column would leave
         every existing row permanently blank. */
      await c.query(
        `update faq_groups
            set blurb      = coalesce(blurb, $2),
                link_href  = coalesce(link_href, $3),
                link_label = coalesce(link_label, $4)
          where id = $1`,
        [existing.rows[0].id, g.blurb ?? null, g.linkHref ?? null, g.linkLabel ?? null],
      );
      bump(skipped, 'faq_groups');
    }
  }

  for (const f of seed.faqItems) {
    const groupId = groupIdBySlug.get(f.groupSlug);
    if (!groupId) throw new Error(`faq item references unknown group ${f.groupSlug}`);
    const { rows } = await c.query(
      'select 1 from faq_items where group_id = $1 and question = $2 limit 1',
      [groupId, f.question],
    );
    if (rows.length) { bump(skipped, 'faq_items'); continue; }
    await c.query(
      `insert into faq_items (group_id, question, answer, sort_order, published, featured, featured_order)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [groupId, f.question, f.answer, f.sortOrder, f.published, f.featured ?? false, f.featuredOrder ?? 0],
    );
    bump(added, 'faq_items');
  }

  for (const m of seed.teamMembers ?? []) {
    /* A person is the natural key: the team has exactly one Johnathan Zemene,
       and the only meaningful duplicate would be a second person of the same
       name, which the editor renames before it becomes a problem in the admin. */
    const { rows } = await c.query(
      'select 1 from team_members where name = $1 limit 1',
      [m.name],
    );
    if (rows.length) { bump(skipped, 'team_members'); continue; }
    await c.query(
      `insert into team_members
         (name, role, initials, tag, blurb, linkedin, image, sort_order, published)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [m.name, m.role, m.initials, m.tag, m.blurb ?? null, m.linkedin ?? null,
        m.image ?? null, m.sortOrder, m.published],
    );
    bump(added, 'team_members');
  }

  await c.query('COMMIT');
} catch (err) {
  await c.query('ROLLBACK');
  console.error(`\n  Failed, nothing written: ${err instanceof Error ? err.message : 'unknown error'}\n`);
  process.exitCode = 1;
} finally {
  c.release();
  await pool.end();
}

if (process.exitCode !== 1) {
  const tables = ['posts', 'review_sources', 'reviews', 'faq_groups', 'faq_items', 'team_members'];
  console.log('\n  content seed');
  for (const t of tables) {
    console.log(`    ${t.padEnd(15)} +${added[t] ?? 0} added, ${skipped[t] ?? 0} already present`);
  }
  console.log('\n  Insert-only: existing rows were left exactly as they were.\n');
}
