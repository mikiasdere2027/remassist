import Link from 'next/link';
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getDb, isDatabaseConfigured } from '@/db';
import { leads, users } from '@/db/schema';
import { ALL_LEAD_SOURCES } from '@/lib/leads/schema';
import { LEAD_STATUSES, SOURCE_LABELS, formatDate, formatRelativeTime } from '@/lib/leads/display';
import { LEAD_VIEWS, buildLeadFilters, type LeadSearch } from '@/lib/leads/query';
import { requireUser } from '@/lib/auth/require';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { getTeam } from '@/lib/crm/leads';
import { PRIORITY_LABELS, STATUS_LABELS, initials, type Priority } from '@/lib/crm/display';
import AdminTopbar from '../AdminTopbar';
import styles from '../../admin.module.css';
import s from '../crm.module.css';

/**
 * Leads — the CRM list (phase 1).
 *
 * Quick views across the top (all, mine, unassigned, follow-up due, hot), the
 * filters under them, and one card row per lead showing who owns it, how it
 * scores and when it is next due. Server-rendered from Postgres; filters are
 * plain GET parameters, so every view is a link that can be bookmarked, and
 * the CSV export applies exactly the same filters (lib/leads/query.ts).
 */
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<LeadSearch> }) {
  const sp = await searchParams;
  const filtered = Boolean(sp.q || sp.source || sp.status || sp.owner);

  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminTopbar title="Leads" subtitle="Database not configured" />
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

  const me = await requireUser();
  const ws = currentWorkspaceId();
  const db = getDb();
  const where = buildLeadFilters(sp, { userId: me.id, workspaceId: ws });

  /* Keyset pagination on created_at, which leads_created_idx already covers. */
  const page = [...where];
  const before = sp.before ? new Date(sp.before) : null;
  if (before && !Number.isNaN(before.getTime())) page.push(lt(leads.createdAt, before));

  const owner = alias(users, 'owner');
  const [rows, [{ count }], team, viewCounts] = await Promise.all([
    db
      .select({
        id: leads.id,
        createdAt: leads.createdAt,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        company: leads.company,
        serviceInterest: leads.serviceInterest,
        source: leads.source,
        status: leads.status,
        score: leads.score,
        priority: leads.priority,
        nextFollowUpAt: leads.nextFollowUpAt,
        ownerName: owner.name,
        ownerEmail: owner.email,
      })
      .from(leads)
      .leftJoin(owner, eq(owner.id, leads.ownerId))
      .where(page.length ? and(...page) : undefined)
      .orderBy(desc(leads.createdAt))
      .limit(PAGE_SIZE + 1),
    db.select({ count: sql<number>`count(*)::int` }).from(leads).where(where.length ? and(...where) : undefined),
    getTeam(),
    /* One count per quick view, for the numbers on the tabs. */
    Promise.all(
      LEAD_VIEWS.map(async (v) => {
        const w = buildLeadFilters({ view: v.key || undefined }, { userId: me.id, workspaceId: ws });
        const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(leads).where(and(...w));
        return [v.key, n] as const;
      }),
    ).then((pairs) => new Map(pairs)),
  ]);

  const hasMore = rows.length > PAGE_SIZE;
  const visible = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? visible[visible.length - 1].createdAt.toISOString() : null;
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
            <a className={`${styles.btn} ${styles.btnGhost}`} href={`/admin/leads/export${qs({ before: undefined }) ? `?${qs({ before: undefined })}` : ''}`}>
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
                options={ALL_LEAD_SOURCES.map((src) => ({ value: src, label: SOURCE_LABELS[src] ?? src }))} />
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
                  const due = r.nextFollowUpAt;
                  const overdue = due && due.getTime() < now;
                  const ownerLabel = r.ownerName?.trim() || r.ownerEmail;
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
                          <time dateTime={r.createdAt.toISOString()} title={formatDate(r.createdAt)}>
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
