import Link from 'next/link';
import type { CrmDashboard } from '@/lib/api/crm';
import type { DashboardStats } from '@/lib/api/dashboard';
import { apiServer } from '@/lib/api/server';
import { requireUser } from '@/lib/auth/require';
import { formatDate, formatRelativeTime } from '@/lib/leads/display';
import {
  AtAGlance,
  SystemAlerts,
  LeadPipeline,
  LeadActivity,
  SourceTag,
  TopSources,
} from './DashboardPanels';
import styles from '../admin.module.css';
import AdminTopbar from './AdminTopbar';
import { LocalTime } from './leads/[id]/LeadClient';
import { change, initials } from '@/lib/crm/display';
import { formatMoney, formatMoneyShort } from '@/lib/crm/money';
import s from './crm.module.css';

/**
 * The admin landing page. Its numbers come from GET /v1/admin/dashboard and /v1/admin/dashboard/crm.
 *
 * 1. Greeting header ("Welcome back, {name}. {date} · {n} new leads in the last 24 hours, {n} awaiting a first response")
 * 2. CRM headline numbers (each opens its list), top open deals, what is
 *    coming up, and the latest activity (GET /admin/dashboard/crm).
 * 3. Full-width Recent leads panel — the latest 5, with a "View more" link into /admin/leads
 * 4. 2-column grid: At a glance (2x2 site health grid) + System alerts (excluding rate catalog & export CSV)
 * 5. 2-column grid: Lead pipeline (left) + Stacked Lead activity & Top sources (right)
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const [user, stats, crm] = await Promise.all([
    requireUser(),
    apiServer<DashboardStats>('/admin/dashboard'),
    apiServer<CrmDashboard>('/admin/dashboard/crm'),
  ]);
  const n = crm.numbers;
  const leadsChange = change(n.leads30, n.leadsPrev30);

  const statusCount = new Map(Object.entries(stats.leads.byStatus));
  const leadTotal = stats.leads.total;
  const quizzes = stats.quizzes.total;
  const anonymous = stats.quizzes.anonymous;
  const untouched = stats.leads.byStatus.new ?? 0;
  const last24h = stats.leads.last24h;
  const sourceRows = stats.leads.bySource;
  const recentLeads = stats.recentLeads;

  const days = stats.leads.last14Days.map((d, i, all) => {
    const date = new Date(`${d.day}T00:00:00Z`);
    const monthStr = date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
    return { label: `${date.getUTCDate()} ${monthStr}`, n: d.n, today: i === all.length - 1 };
  });

  const today = new Date();
  const firstName = user.name.trim().split(/\s+/)[0] || user.username;
  const todayFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(today);
  const newLeadsMsg = `${last24h} new lead${last24h === 1 ? '' : 's'} in the last 24 hours`;
  const awaitingMsg = `${untouched} awaiting a first response`;

  return (
    <>
      <AdminTopbar
        title="Dashboard"
        subtitle="Everything the system has captured"
        action={
          <Link href="/admin/content/posts/new" className={styles.btnHeader}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New post
          </Link>
        }
      />

      <div className={styles.view}>
        {/* Greeting Section */}
        <div className={styles.greeting}>
          <h2 className={styles.greetingTitle}>Welcome back, {firstName}.</h2>
          <p className={styles.greetingSub}>
            <span className={styles.greetingDate}>{todayFormatted}</span> · {newLeadsMsg}, {awaitingMsg}
          </p>
        </div>

        {/* CRM headline numbers: each opens the list behind it. */}
        <div className={`${s.kpis} ${styles.section}`}>
          <Kpi href="/admin/leads?status=new" label="Awaiting a first response" value={String(untouched)}
            hint={untouched > 0 ? 'Reply to these first' : 'All caught up'} tone={untouched > 0 ? 'down' : 'up'} />
          <Kpi href="/admin/leads" label="New leads, last 30 days" value={String(n.leads30)}
            hint={leadsChange === null ? `${n.leadsPrev30} in the 30 days before` : `${leadsChange > 0 ? '+' : ''}${leadsChange}% on the 30 days before`}
            tone={leadsChange === null ? undefined : leadsChange >= 0 ? 'up' : 'down'} />
          <Kpi href="/admin/deals" label="Open pipeline" value={`${formatMoneyShort(n.pipeline)}/mo`}
            hint={`${n.openDeals} open ${n.openDeals === 1 ? 'deal' : 'deals'} · ${formatMoneyShort(n.weighted)} weighted`} />
          <Kpi href="/admin/customers" label="Monthly recurring revenue" value={`${formatMoneyShort(n.mrr)}/mo`}
            hint={`${n.customers} live ${n.customers === 1 ? 'customer' : 'customers'}`} />
          <Kpi href="/admin/tasks?view=overdue" label="My overdue tasks" value={String(n.overdueMine)}
            hint={n.overdueAll > n.overdueMine ? `${n.overdueAll} across the team` : n.overdueMine ? 'Due before now' : 'Nothing overdue'}
            tone={n.overdueMine > 0 ? 'down' : 'up'} />
        </div>

        <div className={`${s.dashGrid} ${styles.section}`}>
          <section className={s.card}>
            <div className={s.cardHead}>
              <h2 className={s.cardTitle}>Top open deals</h2>
              <Link className={s.doneToggle} href="/admin/deals">Pipeline</Link>
            </div>
            {crm.topDeals.length === 0 ? (
              <p className={styles.empty}><strong>No open deals</strong>Convert a qualified lead to start the pipeline.</p>
            ) : (
              <ul className={s.miniList}>
                {crm.topDeals.map((d) => (
                  <li key={d.id}>
                    <span>
                      <Link href={`/admin/deals/${d.id}`}>{d.title}</Link>
                      <span className={s.cardNote}> · {d.stage} · {d.probability}%</span>
                    </span>
                    <span className={s.miniMeta}>{formatMoney(d.valueCents, d.currency)}/mo</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={s.card}>
            <div className={s.cardHead}>
              <h2 className={s.cardTitle}>Coming up</h2>
              <Link className={s.doneToggle} href="/admin/tasks">My tasks</Link>
            </div>
            {crm.comingUp.tasks.length === 0 && crm.comingUp.renewals.length === 0 ? (
              <p className={styles.empty}><strong>Nothing due this week</strong>Tasks due in the next 7 days and renewals in the next 60 show here.</p>
            ) : (
              <ul className={s.miniList}>
                {crm.comingUp.tasks.map((t) => {
                  const href = t.leadId ? `/admin/leads/${t.leadId}` : t.dealId ? `/admin/deals/${t.dealId}`
                    : t.engagementId ? `/admin/customers/${t.engagementId}` : t.companyId ? `/admin/companies/${t.companyId}` : '/admin/tasks';
                  const late = Boolean(t.dueAt && new Date(t.dueAt).getTime() < today.getTime());
                  return (
                    <li key={t.id}>
                      <Link href={href}>{t.title}</Link>
                      <span className={`${s.miniMeta} ${late ? s.overdue : ''}`}>{late ? 'Overdue · ' : null}{t.dueAt && <LocalTime iso={t.dueAt} />}</span>
                    </li>
                  );
                })}
                {crm.comingUp.renewals.map((r) => (
                  <li key={r.id}>
                    <span><Link href={`/admin/customers/${r.id}`}>{r.companyName ?? r.title}</Link><span className={s.cardNote}> · renewal · {formatMoney(r.valueCents, r.currency)}/mo</span></span>
                    <span className={s.miniMeta}>{r.renewalDate}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className={`${s.card} ${styles.section}`}>
          <div className={s.cardHead}>
            <h2 className={s.cardTitle}>Activity</h2>
            <span className={s.cardNote}>The latest across leads, deals and customers</span>
          </div>
          {crm.activity.length === 0 ? (
            <p className={styles.empty}><strong>No activity yet</strong>Notes, calls, status changes and new leads appear here.</p>
          ) : (
            <ul className={s.miniList}>
              {crm.activity.map((a) => {
                const target = a.dealId ? { href: `/admin/deals/${a.dealId}`, name: a.dealTitle }
                  : a.engagementId ? { href: `/admin/customers/${a.engagementId}`, name: a.engagementTitle }
                  : a.leadId ? { href: `/admin/leads/${a.leadId}`, name: a.leadName }
                  : a.companyId ? { href: `/admin/companies/${a.companyId}`, name: a.companyName } : null;
                return (
                  <li key={a.id}>
                    <span>
                      <span className={`${s.avatar} ${s.avatarXs} ${s.inlineAvatar}`} aria-hidden="true">{initials(a.actorName)}</span>
                      <b>{a.actorName}</b> {ACTIVITY_VERBS[a.type] ?? 'updated'}{' '}
                      {target && target.name ? <Link href={target.href}>{target.name}</Link> : null}
                    </span>
                    <span className={s.miniMeta}><LocalTime iso={a.occurredAt} /></span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ROW 2: Recent leads (Full Width — latest 5) */}
        <section className={`${styles.panel} ${styles.section}`}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Recent leads</h2>
              <p className={styles.panelSub}>Newest submissions across the site</p>
            </div>
            <Link className={styles.panelLink} href="/admin/leads">View more →</Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className={styles.empty}>
              <strong>Nothing captured yet</strong>
              Leads from the contact form, the fit finder and the pricing CTA all land here.
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Source</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th style={{ width: 44 }} aria-label="Open" />
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <Link className={styles.rowLink} href={`/admin/leads/${l.id}`}>
                          <span className={styles.cellPrimary}>
                            {l.name || 'No name given'}
                          </span>
                        </Link>
                        <span className={`${styles.cellSecondary} ${styles.mono}`}>{l.email}</span>
                      </td>
                      <td className={styles.nowrap}>
                        <SourceTag source={l.source} />
                      </td>
                      <td className={styles.nowrap}>
                        <time
                          dateTime={new Date(l.createdAt).toISOString()}
                          title={formatDate(l.createdAt)}
                          className={styles.relativeTime}
                        >
                          {formatRelativeTime(l.createdAt)}
                        </time>
                      </td>
                      <td>
                        <span className={`${styles.pill} ${styles[`s_${l.status}`]}`}>
                          {l.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          className={styles.iconBtn}
                          href={`/admin/leads/${l.id}`}
                          aria-label={`Open the lead${l.name ? ` from ${l.name}` : ''}`}
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
        </section>

        {/* ROW 3: At a glance (Site health 2x2 grid) & System alerts (50/50 split) */}
        <div className={styles.grid2eq}>
          <AtAGlance counts={{ ...stats.content, quizzes, anonymous }} />

          <SystemAlerts
            counts={{
              /* Unknown (older backend) counts as configured: no false alarm. */
              mailConfigured: stats.system?.mailConfigured ?? true,
              anonymous,
            }}
          />
        </div>

        {/* ROW 4: 2 columns - Lead pipeline on left, stacked Activity & Sources on right */}
        <div className={styles.grid2eq}>
          <LeadPipeline statusCounts={statusCount} leadTotal={leadTotal} />
          <div className={styles.colStack}>
            <LeadActivity days={days} />
            <TopSources rows={sourceRows} total={leadTotal} />
          </div>
        </div>
      </div>
    </>
  );
}

const ACTIVITY_VERBS: Record<string, string> = {
  note: 'added a note on',
  call: 'logged a call with',
  email: 'emailed',
  meeting: 'met',
  status_change: 'changed the status of',
  owner_change: 'reassigned',
  stage_change: 'moved',
  file: 'added a file to',
  system: 'updated',
};

/** A headline number that opens the list behind it. */
function Kpi({ href, label, value, hint, tone }: { href: string; label: string; value: string; hint: string; tone?: 'up' | 'down' }) {
  return (
    <Link href={href} className={s.kpi}>
      <span className={s.statLabel}>{label}</span>
      <span className={s.statValue}>{value}</span>
      <span className={`${s.statHint} ${tone === 'up' ? s.kpiUp : tone === 'down' ? s.kpiDown : ''}`}>{hint}</span>
    </Link>
  );
}
