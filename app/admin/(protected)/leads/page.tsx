import Link from 'next/link';
import { and, desc, lt, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { leads } from '@/db/schema';
import { LEAD_SOURCES } from '@/lib/leads/schema';
import { LEAD_STATUSES, SOURCE_LABELS, formatDate } from '@/lib/leads/display';
import { buildLeadFilters, type LeadSearch } from '@/lib/leads/query';
import styles from '../../admin.module.css';

/**
 * Lead list — MIGRATION-PLAN §10.
 *
 * A server component reading Postgres directly. No client-side fetching and no
 * JSON endpoint: the gate is a server check, so not having an API to leak is
 * the simplest way to keep it un-leakable.
 */
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<LeadSearch>;
}) {
  const sp = await searchParams;

  if (!isDatabaseConfigured()) {
    return (
      <>
        <Topbar total={null} />
        <div className={styles.view}>
          <div className={styles.notice}>
            <strong>No database configured</strong>
            There is no <code>DATABASE_URL</code> in this environment, so there are no leads to
            show. The public form degrades too — <code>/api/leads</code> answers 503 and visitors
            fall back to composing an email, so nothing is being lost while this is unset.
          </div>
        </div>
      </>
    );
  }

  const db = getDb();
  const where = buildLeadFilters(sp);

  /* Keyset pagination on created_at, which leads_created_idx already covers.
     OFFSET would get slower the deeper you page; a cursor does not. */
  const page = [...where];
  const before = sp.before ? new Date(sp.before) : null;
  if (before && !Number.isNaN(before.getTime())) page.push(lt(leads.createdAt, before));

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: leads.id,
        createdAt: leads.createdAt,
        name: leads.name,
        email: leads.email,
        company: leads.company,
        country: leads.country,
        source: leads.source,
        status: leads.status,
      })
      .from(leads)
      .where(page.length ? and(...page) : undefined)
      .orderBy(desc(leads.createdAt))
      .limit(PAGE_SIZE + 1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(where.length ? and(...where) : undefined),
  ]);

  const hasMore = rows.length > PAGE_SIZE;
  const visible = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? visible[visible.length - 1].createdAt.toISOString() : null;

  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...extra })) if (v) p.set(k, v);
    return p.toString();
  };

  return (
    <>
      <Topbar total={count} exportQs={qs({ before: undefined })} />

      <div className={styles.view}>
        <section className={styles.panel}>
          <form className={styles.filters} method="get">
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="f-q">Search</label>
              <input
                className={styles.control}
                id="f-q"
                name="q"
                type="search"
                placeholder="Email, name or company"
                defaultValue={sp.q ?? ''}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="f-source">Source</label>
              <select className={styles.control} id="f-source" name="source" defaultValue={sp.source ?? ''}>
                <option value="">All sources</option>
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>{SOURCE_LABELS[s] ?? s}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="f-status">Status</label>
              <select className={styles.control} id="f-status" name="status" defaultValue={sp.status ?? ''}>
                <option value="">All statuses</option>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit">Filter</button>
            <Link className={`${styles.btn} ${styles.btnGhost}`} href="/admin/leads">Reset</Link>
          </form>

          {visible.length === 0 ? (
            <p className={styles.empty}>
              <strong>No leads match</strong>
              {count === 0 ? 'Nothing has been captured yet.' : 'Try widening the filters.'}
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Received</th>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Company</th>
                    <th scope="col">Country</th>
                    <th scope="col">Source</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id}>
                      <td className={`${styles.mono} ${styles.nowrap}`}>{formatDate(r.createdAt)}</td>
                      <td>
                        <Link className={styles.rowLink} href={`/admin/leads/${r.id}`}>
                          {r.name || 'View'}
                        </Link>
                      </td>
                      <td className={styles.mono}>{r.email}</td>
                      <td>{r.company || <span className={styles.muted}>—</span>}</td>
                      <td>{r.country || <span className={styles.muted}>—</span>}</td>
                      <td className={styles.src}>{SOURCE_LABELS[r.source] ?? r.source}</td>
                      <td>
                        <span className={`${styles.pill} ${styles[`s_${r.status}`]}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.panelFoot}>
            <span>
              Showing {visible.length} of {count}
              {sp.before ? ' (paged)' : ''}
            </span>
            <span className={styles.pager}>
              {sp.before ? (
                <Link className={styles.pagerLink} href={`/admin/leads?${qs({ before: undefined })}`}>
                  ← Newest
                </Link>
              ) : (
                <span className={styles.pagerOff}>← Newest</span>
              )}
              {nextCursor ? (
                <Link className={styles.pagerLink} href={`/admin/leads?${qs({ before: nextCursor })}`}>
                  Older →
                </Link>
              ) : (
                <span className={styles.pagerOff}>Older →</span>
              )}
            </span>
          </div>
        </section>
      </div>
    </>
  );
}

function Topbar({ total, exportQs }: { total: number | null; exportQs?: string }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.tbInner}>
        <div>
          <h1 className={styles.tbTitle}>Leads</h1>
          <p className={styles.tbSub}>
            {total === null ? 'Database not configured' : `${total} captured`}
          </p>
        </div>
        {exportQs !== undefined && (
          <a
            className={`${styles.btn} ${styles.btnGhost}`}
            href={`/admin/leads/export${exportQs ? `?${exportQs}` : ''}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v12" />
              <path d="m7 11 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            Export CSV
          </a>
        )}
      </div>
    </header>
  );
}
