import Link from 'next/link';
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

/**
 * The admin landing page. Every number comes from GET /v1/admin/dashboard.
 *
 * 1. Greeting header ("Welcome back, {name}. {date} · {n} new leads in the last 24 hours, {n} awaiting a first response")
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

export default async function DashboardPage() {
  const [user, stats] = await Promise.all([
    requireUser(),
    apiServer<DashboardStats>('/admin/dashboard'),
  ]);

  const statusCount = new Map(Object.entries(stats.leads.byStatus));
  const leadTotal = stats.leads.total;
  const quizzes = stats.quizzes.total;
  const anonymous = stats.quizzes.anonymous;
  const completed = stats.quizzes.completed;
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

        {/* ROW 1: 4 Stat Cards */}
        <div className={styles.stats}>
          <StatCard
            href="/admin/leads"
            value={leadTotal}
            label="Leads captured"
            icon={ICON.inbox}
            delta={{
              text: `+${last24h} in 24 h`,
              tone: last24h > 0 ? 'up' : 'neutral',
              icon: ICON.arrowUpRight,
            }}
            note="All time"
            btnLabel="View leads →"
          />
          <StatCard
            href="/admin/leads?status=new"
            value={untouched}
            label="Awaiting a first response"
            icon={ICON.clock}
            delta={
              untouched > 0
                ? { text: 'Needs attention', tone: 'needs', icon: ICON.alertCircle }
                : { text: 'All caught up', tone: 'up', icon: ICON.check }
            }
            note={untouched > 0 ? 'Requires reply' : 'All caught up'}
            btnLabel={untouched > 0 ? 'Respond →' : undefined}
          />
          <StatCard
            href="/admin/quizzes"
            value={quizzes}
            label="Fit finder submissions"
            icon={ICON.checkSquare}
            delta={{
              text: `${completed} completed`,
              tone: 'neutral',
              icon: ICON.check,
            }}
            note={`• ${completed} completed`}
            btnLabel="Review →"
          />
          <StatCard
            href="/admin/quizzes?only=anonymous"
            value={anonymous}
            label="Quizzes with no contact details"
            icon={ICON.bookmark}
            delta={
              anonymous > 0
                ? { text: 'Needs attention', tone: 'needs', icon: ICON.alertCircle }
                : { text: 'All caught up', tone: 'up', icon: ICON.check }
            }
            note={anonymous > 0 ? 'Interest with nobody to reply' : 'Everyone left details'}
            btnLabel="Fix →"
          />
        </div>

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

function StatCard({
  href,
  value,
  label,
  icon,
  delta,
  note,
  btnLabel,
}: {
  href: string;
  value: number;
  label: string;
  icon: React.ReactNode;
  delta?: {
    text: string;
    tone: 'up' | 'needs' | 'neutral';
    icon?: React.ReactNode;
  };
  note?: string;
  btnLabel?: string;
}) {
  return (
    <Link className={styles.statCard} href={href}>
      <div>
        <div className={styles.statTop}>
          <span className={styles.statIco}>{icon}</span>
          {delta && (
            <span
              className={`${styles.statDelta} ${
                delta.tone === 'up'
                  ? styles.deltaUp
                  : delta.tone === 'needs'
                  ? styles.deltaNeeds
                  : styles.deltaNeutral
              }`}
            >
              {delta.icon}
              {delta.text}
            </span>
          )}
        </div>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statValue}>{value}</div>
      </div>
      <div className={styles.statFoot}>
        {note ? <span className={styles.statNote}>{note}</span> : <span />}
        {btnLabel && <span className={styles.statBtn}>{btnLabel}</span>}
      </div>
    </Link>
  );
}

const ICON = {
  inbox: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3.2 1.9" />
    </svg>
  ),
  checkSquare: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 12 2 2 4-4" />
      <rect x="3" y="4" width="18" height="16" rx="2" />
    </svg>
  ),
  bookmark: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  ),
  arrowUpRight: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  ),
  alertCircle: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 13 4 4L19 7" />
    </svg>
  ),
};

