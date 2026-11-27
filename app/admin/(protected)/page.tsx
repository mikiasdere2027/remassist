import Link from 'next/link';
import { count, desc, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { leads, quizSubmissions } from '@/db/schema';
import { requireUser } from '@/lib/auth/require';
import { formatDate, formatRelativeTime } from '@/lib/leads/display';
import { faqItems, posts, reviews } from '@/db/schema';
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
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { activityStream, comingUp, dashboardNumbers, topOpenDeals } from '@/lib/crm/reportsData';
import { listOnlineAgents } from '@/lib/crm/slaData';
import { change } from '@/lib/crm/reports';
import { effectiveProbability, formatMoney, formatMoneyShort } from '@/lib/crm/money';
import { initials } from '@/lib/crm/display';
import { LocalTime } from './leads/[id]/LeadClient';
import s from './crm.module.css';

/**
 * The admin landing page.
 *
 * 1. Greeting header ("Good morning, {name}. {date} · {leads} new leads and {posts} published posts since yesterday — all systems go.")
 * 2. 4 Metric Stat cards with icon & top-right delta badge, vertical label & value, and bottom note + action button.
 * 3. Full-width Recent leads panel — the latest 5, with a "View more" link into /admin/leads
 * 4. 2-column grid: At a glance (2x2 site health grid) + System alerts (excluding rate catalog & export CSV)
 * 5. 2-column grid: Lead pipeline (left) + Stacked Lead activity & Top sources (right)
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

const RECENT = 5;

export default async function DashboardPage() {
  const user = await requireUser();

  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminTopbar title="Dashboard" subtitle="Database not configured" />
        <div className={styles.view}>
          <div className={styles.notice}>
            <strong>No database configured</strong>
            There is no <code>DATABASE_URL</code> in this environment, so there is nothing to
            count. The public form degrades too — <code>/api/leads</code> answers 503 and
            visitors fall back to composing an email, so nothing is being lost.
          </div>
        </div>
      </>
    );
  }

  const db = getDb();

  const [
    byStatus,
    totals,
    quizTotals,
    recentLeads,
    bySource,
    byDay,
    faqCounts,
    reviewCounts,
    postCounts,
  ] = await Promise.all([
    db
      .select({ status: leads.status, n: count() })
      .from(leads)
      .groupBy(leads.status),
    db.select({ n: count() }).from(leads),
    db
      .select({
        n: count(),
        anonymous: sql<number>`count(*) filter (where ${quizSubmissions.leadId} is null)`,
        completed: sql<number>`count(*) filter (where ${quizSubmissions.completed})`,
      })
      .from(quizSubmissions),
    db
      .select({
        id: leads.id,
        createdAt: leads.createdAt,
        name: leads.name,
        email: leads.email,
        status: leads.status,
        source: leads.source,
      })
      .from(leads)
      .orderBy(desc(leads.createdAt))
      .limit(RECENT),
    db.select({ source: leads.source, n: count() }).from(leads).groupBy(leads.source),
    db
      .select({
        day: sql<string>`to_char(${leads.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`,
        n: count(),
      })
      .from(leads)
      .where(sql`${leads.createdAt} >= now() - interval '14 days'`)
      .groupBy(sql`1`),
    db
      .select({
        faqLive: sql<number>`count(*) filter (where ${faqItems.published})`,
        faqTotal: count(),
      })
      .from(faqItems),
    db
      .select({ n: sql<number>`count(*) filter (where ${reviews.published})` })
      .from(reviews),
    db
      .select({
        live: sql<number>`count(*) filter (where ${posts.published})`,
        total: count(),
      })
      .from(posts),
  ]);

  const statusCount = new Map(byStatus.map((r) => [r.status, Number(r.n)]));
  const leadTotal = Number(totals[0]?.n ?? 0);
  const quizzes = Number(quizTotals[0]?.n ?? 0);
  const anonymous = Number(quizTotals[0]?.anonymous ?? 0);
  const untouched = statusCount.get('new') ?? 0;

  const sourceRows = bySource
    .map((r) => ({ source: r.source, n: Number(r.n) }))
    .sort((a, b) => b.n - a.n);

  const perDay = new Map(byDay.map((r) => [r.day, Number(r.n)]));
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.UTC(
      today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (13 - i),
    ));
    const key = d.toISOString().slice(0, 10);
    const dayNum = d.getUTCDate();
    const monthStr = d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
    return {
      label: `${dayNum} ${monthStr}`,
      n: perDay.get(key) ?? 0,
      today: i === 13,
    };
  });

  /* The person's own first name, or the start of their email; never a placeholder. */
  const firstName = user.name?.trim() ? user.name.trim().split(/\s+/)[0] : user.email.split('@')[0];
  const todayFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today);
  const ws = currentWorkspaceId();
  const [crm, topDeals, upcoming, stream, onlineAgents] = await Promise.all([
    dashboardNumbers(ws, user.id), topOpenDeals(ws), comingUp(ws, user.id), activityStream(ws), listOnlineAgents(ws),
  ]);
  const leadsChange = change(crm.leads30, crm.leadsPrev30);
  const waitingMsg = untouched === 0 ? 'every lead has had a first response' : `${untouched} ${untouched === 1 ? 'lead is' : 'leads are'} waiting for a first response`;
  const livePosts = Number(postCounts[0]?.live ?? 0);
  const publishedPostsMsg = `${livePosts} published post${livePosts === 1 ? '' : 's'}`;

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
            <span className={styles.greetingDate}>{todayFormatted}</span> · {waitingMsg} · {publishedPostsMsg}
          </p>
        </div>

        {/* CRM headline numbers: each opens the list behind it. */}
        <div className={`${s.kpis} ${styles.section}`}>
          <Kpi href="/admin/leads?status=new" label="Awaiting a first response" value={String(untouched)}
            hint={untouched > 0 ? 'Reply to these first' : 'All caught up'} tone={untouched > 0 ? 'down' : 'up'} />
          <Kpi href="/admin/leads" label="New leads, last 30 days" value={String(crm.leads30)}
            hint={leadsChange === null ? `${crm.leadsPrev30} in the 30 days before` : `${leadsChange > 0 ? '+' : ''}${leadsChange}% on the 30 days before`}
            tone={leadsChange === null ? undefined : leadsChange >= 0 ? 'up' : 'down'} />
          <Kpi href="/admin/deals" label="Open pipeline" value={`${formatMoneyShort(crm.pipeline)}/mo`}
            hint={`${crm.openDeals} open ${crm.openDeals === 1 ? 'deal' : 'deals'} · ${formatMoneyShort(crm.weighted)} weighted`} />
          <Kpi href="/admin/customers" label="Monthly recurring revenue" value={`${formatMoneyShort(crm.mrr)}/mo`}
            hint={`${crm.customers} live ${crm.customers === 1 ? 'customer' : 'customers'}`} />
          <Kpi href="/admin/tasks?view=overdue" label="My overdue tasks" value={String(crm.overdueMine)}
            hint={crm.overdueAll > crm.overdueMine ? `${crm.overdueAll} across the team` : crm.overdueMine ? 'Due before now' : 'Nothing overdue'}
            tone={crm.overdueMine > 0 ? 'down' : 'up'} />
        </div>

        <div className={`${s.dashGrid} ${styles.section}`}>
          <section className={s.card}>
            <div className={s.cardHead}>
              <h2 className={s.cardTitle}>Top open deals</h2>
              <Link className={s.doneToggle} href="/admin/deals">Pipeline</Link>
            </div>
            {topDeals.length === 0 ? (
              <p className={styles.empty}><strong>No open deals</strong>Convert a qualified lead to start the pipeline.</p>
            ) : (
              <ul className={s.miniList}>
                {topDeals.map((d) => (
                  <li key={d.id}>
                    <span>
                      <Link href={`/admin/deals/${d.id}`}>{d.title}</Link>
                      <span className={s.cardNote}> · {d.stage} · {effectiveProbability(d.probability, d.stageProbability)}%</span>
                    </span>
                    <span className={s.miniMeta}>{formatMoney(d.value, d.currency)}/mo</span>
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
            {upcoming.tasks.length === 0 && upcoming.renewals.length === 0 ? (
              <p className={styles.empty}><strong>Nothing due this week</strong>Tasks due in the next 7 days and renewals in the next 60 show here.</p>
            ) : (
              <ul className={s.miniList}>
                {upcoming.tasks.map((t) => {
                  const href = t.leadId ? `/admin/leads/${t.leadId}` : t.dealId ? `/admin/deals/${t.dealId}`
                    : t.engagementId ? `/admin/customers/${t.engagementId}` : t.companyId ? `/admin/companies/${t.companyId}` : '/admin/tasks';
                  const late = Boolean(t.dueAt && t.dueAt.getTime() < Date.now());
                  return (
                    <li key={t.id}>
                      <Link href={href}>{t.title}</Link>
                      <span className={`${s.miniMeta} ${late ? s.overdue : ''}`}>{late ? 'Overdue · ' : null}{t.dueAt && <LocalTime iso={t.dueAt.toISOString()} />}</span>
                    </li>
                  );
                })}
                {upcoming.renewals.map((r) => (
                  <li key={r.id}>
                    <span><Link href={`/admin/customers/${r.id}`}>{r.companyName ?? r.title}</Link><span className={s.cardNote}> · renewal · {formatMoney(r.value, r.currency)}/mo</span></span>
                    <span className={s.miniMeta}>{r.renewalDate}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className={`${s.card} ${styles.section}`}>
          <div className={s.cardHead}>
            <h2 className={s.cardTitle}>Agents online ({onlineAgents.length})</h2>
            <span className={s.cardNote}>Active shift heartbeats in the last 5 minutes</span>
          </div>
          {onlineAgents.length === 0 ? (
            <p className={styles.empty}><strong>No agents online</strong>Active shift sessions appear here once an agent checks in.</p>
          ) : (
            <ul className={s.miniList}>
              {onlineAgents.map((a) => {
                const who = a.name?.trim() || a.email;
                return (
                  <li key={a.sessionId}>
                    <span>
                      <span className={`${s.avatar} ${s.avatarXs} ${s.inlineAvatar}`} aria-hidden="true">{initials(who)}</span>
                      <b>{who}</b>
                      <span className={s.cardNote}> · {a.shiftType.replace('_', ' ')}</span>
                    </span>
                    <span className={s.miniMeta}><LocalTime iso={a.lastHeartbeatAt.toISOString()} /></span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={`${s.card} ${styles.section}`}>
          <div className={s.cardHead}>
            <h2 className={s.cardTitle}>Activity</h2>
            <span className={s.cardNote}>The latest across leads, deals and customers</span>
          </div>
          {stream.length === 0 ? (
            <p className={styles.empty}><strong>No activity yet</strong>Notes, calls, status changes and new leads appear here.</p>
          ) : (
            <ul className={s.miniList}>
              {stream.map((a) => {
                const target = a.dealId ? { href: `/admin/deals/${a.dealId}`, name: a.dealTitle }
                  : a.engagementId ? { href: `/admin/customers/${a.engagementId}`, name: a.engagementTitle }
                  : a.leadId ? { href: `/admin/leads/${a.leadId}`, name: a.leadName }
                  : a.companyId ? { href: `/admin/companies/${a.companyId}`, name: a.companyName } : null;
                const who = a.actorName?.trim() || a.actorEmail || 'System';
                return (
                  <li key={a.id}>
                    <span>
                      <span className={`${s.avatar} ${s.avatarXs} ${s.inlineAvatar}`} aria-hidden="true">{initials(who)}</span>
                      <b>{who}</b> {ACTIVITY_VERBS[a.type] ?? 'updated'}{' '}
                      {target && target.name ? <Link href={target.href}>{target.name}</Link> : null}
                    </span>
                    <span className={s.miniMeta}><LocalTime iso={a.occurredAt.toISOString()} /></span>
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
                            {l.name ?? 'No name given'}
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
          <AtAGlance
            counts={{
              faqLive: Number(faqCounts[0]?.faqLive ?? 0),
              faqTotal: Number(faqCounts[0]?.faqTotal ?? 0),
              reviewsLive: Number(reviewCounts[0]?.n ?? 0),
              postsLive: Number(postCounts[0]?.live ?? 0),
              postsTotal: Number(postCounts[0]?.total ?? 0),
              quizzes,
              anonymous,
            }}
          />

          <SystemAlerts
            counts={{
              mailConfigured: Boolean(process.env.AUTH_RESEND_KEY),
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

function Kpi({ href, label, value, hint, tone }: { href: string; label: string; value: string; hint: string; tone?: 'up' | 'down' }) {
  return (
    <Link href={href} className={s.kpi}>
      <span className={s.statLabel}>{label}</span>
      <span className={s.statValue}>{value}</span>
      <span className={`${s.statHint} ${tone === 'up' ? s.kpiUp : tone === 'down' ? s.kpiDown : ''}`}>{hint}</span>
    </Link>
  );
}
