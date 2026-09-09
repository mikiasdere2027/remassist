import Link from 'next/link';
import { and, desc, lt, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { leads } from '@/db/schema';
import { LEAD_SOURCES } from '@/lib/leads/schema';
import { LEAD_STATUSES, SOURCE_LABELS, formatDate, formatRelativeTime } from '@/lib/leads/display';
import { buildLeadFilters, type LeadSearch } from '@/lib/leads/query';
import { SourceTag } from '../DashboardPanels';
import AdminTopbar from '../AdminTopbar';
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

  /* Whether any filter is narrowing the list — drives the bold funnel icon. */
  const filtered = Boolean(sp.q || sp.source || sp.status);

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
                className={`${styles.control} ${styles.controlSearch}`}
                id="f-q"
                name="q"
                type="search"
                placeholder="Email, name or company"
                defaultValue={sp.q ?? ''}
              />
            </div>
            {/* .selectField rather than a bare .control select, so these match
                the dropdowns on the FAQ and catalog screens: same box, but the
                native arrow swapped for an inline chevron that looks the same
                on every platform. A span, not the <label> those two use — the
                field already has its own label above it, and a second one
                wrapping the control would announce the field twice. */}
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="f-source">Source</label>
              <span className={`${styles.selectField} ${styles.selectFieldWide}`}>
                <select id="f-source" name="source" defaultValue={sp.source ?? ''}>
                  <option value="">All sources</option>
                  {LEAD_SOURCES.map((s) => (
                    <option key={s} value={s}>{SOURCE_LABELS[s] ?? s}</option>
                  ))}
                </select>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="f-status">Status</label>
              <span className={`${styles.selectField} ${styles.selectFieldWide}`}>
                <select id="f-status" name="status" defaultValue={sp.status ?? ''}>
                  <option value="">All statuses</option>
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>
            <button
              className={`${styles.btn} ${styles.btnSoft} ${styles.btnIcon} ${filtered ? styles.filterOn : ''}`}
              type="submit"
              aria-label="Filter"
              title={filtered ? 'Filter is active' : 'Filter'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
              </svg>
            </button>
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
                    <th scope="col">Prospect</th>
                    <th scope="col">Contact</th>
                    <th scope="col">Source</th>
                    <th scope="col">Status</th>
                    <th scope="col">Received</th>
                    <th scope="col" aria-label="Open" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id}>
                      {/* The prototype's dominant cell: the person in weight,
                          their company under it in small grey, both inside one
                          link to the detail page. */}
                      <td>
                        <Link className={styles.rowLink} href={`/admin/leads/${r.id}`}>
                          <span className={styles.cellPrimary}>
                            {r.name || <span className={styles.muted}>No name given</span>}
                          </span>
                        </Link>
                        <span className={styles.cellSecondary}>
                          {r.company || <span className={styles.muted}>No company</span>}
                        </span>
                      </td>
                      <td>
                        <span className={styles.mono}>{r.email}</span>
                        {r.country && <span className={styles.cellSecondary}>{r.country}</span>}
                      </td>
                      <td className={styles.nowrap}>
                        <SourceTag source={r.source} />
                      </td>
                      <td>
                        <span className={`${styles.pill} ${styles[`s_${r.status}`]}`}>{r.status}</span>
                      </td>
                      <td className={styles.nowrap}>
                        <time
                          dateTime={new Date(r.createdAt).toISOString()}
                          title={formatDate(r.createdAt)}
                          className={styles.relativeTime}
                        >
                          {formatRelativeTime(r.createdAt)}
                        </time>
                      </td>
                      <td>
                        <Link
                          className={styles.iconBtn}
                          href={`/admin/leads/${r.id}`}
                          aria-label={`Open the lead${r.name ? ` from ${r.name}` : ''}`}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="m9 5 7 7-7 7" />
                          </svg>
                        </Link>
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
    <AdminTopbar
      title="Leads"
      subtitle={
        total === null
          ? 'Database not configured'
          : 'Every submission across the site, in one inbox'
      }
      action={
        exportQs !== undefined ? (
          <a
            className={styles.btnHeader}
            href={`/admin/leads/export${exportQs ? `?${exportQs}` : ''}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="m7 10 5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
            Export CSV
          </a>
        ) : undefined
      }
    />
  );
}