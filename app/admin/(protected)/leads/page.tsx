import Link from 'next/link';
import { apiServer } from '@/lib/api/server';
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_VIEWS,
  leadExportHref,
  leadQuery,
  type Assignee,
  type LeadPage,
  type LeadViewCounts,
} from '@/lib/api/leads';
import { SOURCE_LABELS, formatDate, formatRelativeTime } from '@/lib/leads/display';
import { requireUser } from '@/lib/auth/require';
import { PRIORITY_LABELS, STATUS_LABELS, initials, type Priority } from '@/lib/crm/display';
import AdminTopbar from '../AdminTopbar';
import styles from '../../admin.module.css';
import s from '../crm.module.css';

/**
 * Leads — the CRM list (phase 1).
 *
 * Quick views across the top (all, mine, unassigned, follow-up due, hot), the
 * filters under them, and one card row per lead showing who owns it, how it
 * scores and when it is next due. Server-rendered from the API
 * (GET /v1/admin/leads, /views, /assignees); filters are plain GET
 * parameters, so every view is a link that can be bookmarked, and the CSV
 * export applies exactly the same filters.
 */
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LeadSearch = {
  q?: string;
  source?: string;
  status?: string;
  view?: string;
  owner?: string;
  before?: string;
};

/** Drop anything the API would reject, so a mistyped URL shows all leads, not an error. */
function cleanSearch(raw: LeadSearch): LeadSearch {
  const sp: LeadSearch = {};
  if (raw.q?.trim()) sp.q = raw.q.trim().slice(0, 200);
  if (raw.source && (LEAD_SOURCES as readonly string[]).includes(raw.source)) sp.source = raw.source;
  if (raw.status && (LEAD_STATUSES as readonly string[]).includes(raw.status)) sp.status = raw.status;
  if (raw.view && LEAD_VIEWS.some((v) => v.key && v.key === raw.view)) sp.view = raw.view;
  if (raw.owner && (raw.owner === 'none' || UUID.test(raw.owner))) sp.owner = raw.owner;
  if (raw.before && raw.before.length <= 200) sp.before = raw.before;
  return sp;
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<LeadSearch> }) {
  const sp = cleanSearch(await searchParams);
  const filtered = Boolean(sp.q || sp.source || sp.status || sp.owner);

  const me = await requireUser();
  const [page, team, counts] = await Promise.all([
    apiServer<LeadPage>(`/admin/leads?${leadQuery(sp)}&limit=${PAGE_SIZE}`),
    apiServer<Assignee[]>('/admin/leads/assignees'),
    apiServer<LeadViewCounts>('/admin/leads/views'),
  ]);
  const visible = page.items;
  const count = page.total;
  const nextCursor = page.nextCursor;
  const viewCounts = new Map<string, number>([
    ['', counts.all],
    ['mine', counts.mine],
    ['unassigned', counts.unassigned],
    ['followup', counts.followup],
    ['hot', counts.hot],
  ]);
  const now = Date.now();

  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...extra })) if (v) p.set(k, v);
    return p.toString();
  };
  const currentView = LEAD_VIEWS.some((v) => v.key === sp.view) ? sp.view ?? '' : '';

  return (
    <>
      <AdminTopbar
        title={`Leads (${count})`}
        subtitle="Every enquiry, who owns it, and what happens next"
        action={
          <span className={s.headerActions}>
            <Link className={`${styles.btn} ${styles.btnGhost}`} href="/admin/leads/import">Import</Link>
            <a className={`${styles.btn} ${styles.btnGhost}`} href={leadExportHref(sp)} download>
              Export CSV
            </a>
            <Link className={styles.btnHeader} href="/admin/leads/new">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              Add lead
            </Link>
          </span>
        }
      />

      <div className={styles.view}>
        <div className={s.listStack}>
          <nav className={s.tabs} aria-label="Lead views">
            {LEAD_VIEWS.map((v) => (
              <Link
                key={v.key}
                href={`/admin/leads${v.key ? `?view=${v.key}` : ''}`}
                className={`${s.tab} ${currentView === v.key ? s.tabOn : ''}`}
                aria-current={currentView === v.key ? 'page' : undefined}
              >
                {v.label} <span className={s.tabCount}>{viewCounts.get(v.key) ?? 0}</span>
              </Link>
            ))}
          </nav>

          <section className={styles.panel}>
            <form className={styles.filters} method="get">
              {sp.view && <input type="hidden" name="view" value={sp.view} />}
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
              <FilterSelect id="f-owner" name="owner" label="Owner" value={sp.owner} all="Anyone"
                options={[{ value: 'none', label: 'Unassigned' }, ...team.map((m) => ({ value: m.id, label: m.id === me.id ? `${m.name} (me)` : m.name }))]} />
              <FilterSelect id="f-status" name="status" label="Status" value={sp.status} all="All statuses"
                options={LEAD_STATUSES.map((st) => ({ value: st, label: STATUS_LABELS[st] ?? st }))} />
              <FilterSelect id="f-source" name="source" label="Source" value={sp.source} all="All sources"
                options={LEAD_SOURCES.map((src) => ({ value: src, label: SOURCE_LABELS[src] ?? src }))} />
              <button
                className={`${styles.btn} ${styles.btnSoft} ${styles.btnIcon} ${filtered ? styles.filterOn : ''}`}
                type="submit"
                aria-label="Filter"
                title={filtered ? 'Filter is active' : 'Filter'}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>
              </button>
              <Link className={`${styles.btn} ${styles.btnGhost}`} href={sp.view ? `/admin/leads?view=${sp.view}` : '/admin/leads'}>Reset</Link>
            </form>

            {visible.length === 0 ? (
              <p className={styles.empty}>
                <strong>No leads match</strong>
                {count === 0 && !filtered && !sp.view ? 'Nothing has been captured yet.' : 'Try another view or widen the filters.'}
              </p>
            ) : (
              <ul className={s.leadList}>
                {visible.map((r) => {
                  const due = r.nextFollowUpAt ? new Date(r.nextFollowUpAt) : null;
                  const overdue = due && due.getTime() < now;
                  const ownerLabel = r.ownerName?.trim();
                  return (
                    <li key={r.id} className={s.leadRow}>
                      <div className={s.leadWho}>
                        <span className={`${s.avatar} ${s.avatarSm}`} aria-hidden="true">{initials(r.name || r.email)}</span>
                        <div className={s.leadWhoText}>
                          <Link className={s.leadName} href={`/admin/leads/${r.id}`}>
                            {r.name || r.email}
                          </Link>
                          <span className={s.leadSub}>{r.company || r.email}</span>
                        </div>
                      </div>
                      <Cell label="Status">
                        <span className={`${styles.pill} ${styles[`s_${r.status}`]}`}>{STATUS_LABELS[r.status] ?? r.status}</span>
                      </Cell>
                      <Cell label="Service">{r.serviceInterest || <span className={s.muted}>Not given</span>}</Cell>
                      <Cell label="Owner">{ownerLabel || <span className={s.muted}>Unassigned</span>}</Cell>
                      <Cell label="Score">
                        <span className={s.scoreCell}>
                          <b>{r.score ?? '—'}</b>
                          <span className={`${s.badge} ${s[`p_${r.priority}`]}`}>{PRIORITY_LABELS[r.priority as Priority]}</span>
                        </span>
                      </Cell>
                      <Cell label={due ? 'Follow-up' : 'Received'}>
                        {due ? (
                          <time dateTime={due.toISOString()} title={formatDate(due)} className={overdue ? s.overdue : undefined}>
                            {overdue ? 'Overdue · ' : ''}{formatDate(due).slice(0, 10)}
                          </time>
                        ) : (
                          <time dateTime={r.createdAt} title={formatDate(r.createdAt)}>
                            {formatRelativeTime(r.createdAt)} · {SOURCE_LABELS[r.source] ?? r.source}
                          </time>
                        )}
                      </Cell>
                      <Link className={styles.iconBtn} href={`/admin/leads/${r.id}`} aria-label={`Open ${r.name || r.email}`}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className={styles.panelFoot}>
              <span>
                Showing {visible.length} of {count}
                {sp.before ? ' (paged)' : ''}
              </span>
              <span className={styles.pager}>
                {sp.before ? (
                  <Link className={styles.pagerLink} href={`/admin/leads?${qs({ before: undefined })}`}>← Newest</Link>
                ) : (
                  <span className={styles.pagerOff}>← Newest</span>
                )}
                {nextCursor ? (
                  <Link className={styles.pagerLink} href={`/admin/leads?${qs({ before: nextCursor })}`}>Older →</Link>
                ) : (
                  <span className={styles.pagerOff}>Older →</span>
                )}
              </span>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={s.leadCell}>
      <span className={s.leadCellLabel}>{label}</span>
      <span className={s.leadCellValue}>{children}</span>
    </div>
  );
}

function FilterSelect({ id, name, label, value, all, options }: {
  id: string;
  name: string;
  label: string;
  value?: string;
  all: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={id}>{label}</label>
      <span className={`${styles.selectField} ${styles.selectFieldWide}`}>
        <select id={id} name={name} defaultValue={value ?? ''}>
          <option value="">{all}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </span>
    </div>
  );
}
