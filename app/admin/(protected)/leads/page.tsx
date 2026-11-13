import Link from 'next/link';
import { apiServer } from '@/lib/api/server';
import {
  LEAD_SOURCES, LEAD_STATUSES, leadExportHref, leadQuery, type LeadPage,
} from '@/lib/api/leads';
import { SOURCE_LABELS, formatDate, formatRelativeTime } from '@/lib/leads/display';
import { SourceTag } from '../DashboardPanels';
import AdminTopbar from '../AdminTopbar';
import styles from '../../admin.module.css';

/**
 * Lead list — GET /v1/admin/leads (filters, search, keyset paging). The
 * backend owns the query; this page only renders it.
 */
export const dynamic = 'force-dynamic';

type LeadSearch = { q?: string; source?: string; status?: string; before?: string };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<LeadSearch>;
}) {
  const raw = await searchParams;
  /* Only values the backend accepts: an unknown enum value would be a 400. */
  const sp: LeadSearch = {
    q: raw.q?.trim() || undefined,
    source: (LEAD_SOURCES as readonly string[]).includes(raw.source ?? '') ? raw.source : undefined,
    status: (LEAD_STATUSES as readonly string[]).includes(raw.status ?? '') ? raw.status : undefined,
    before: raw.before || undefined,
  };

  /* Whether any filter is narrowing the list — drives the bold funnel icon. */
  const filtered = Boolean(sp.q || sp.source || sp.status);

  const { items: visible, total: count, nextCursor } = await apiServer<LeadPage>(
    `/admin/leads?${leadQuery(sp)}`,
  );

  const qs = (extra: Partial<LeadSearch>) => leadQuery({ ...sp, ...extra });

  return (
    <>
      <Topbar exportHref={leadExportHref(sp)} />

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

function Topbar({ exportHref }: { exportHref: string }) {
  return (
    <AdminTopbar
      title="Leads"
      subtitle="Every submission across the site, in one inbox"
      action={
        /* A plain link: the browser downloads the backend's CSV through the
           /api/v1 proxy, sending the session cookie itself. */
        <a className={styles.btnHeader} href={exportHref} download>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="m7 10 5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
          Export CSV
        </a>
      }
    />
  );
}
