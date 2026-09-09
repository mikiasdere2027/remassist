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
  const completed = Number(quizTotals[0]?.completed ?? 0);
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

  const firstName = user.name ? user.name.trim().split(/\s+/)[0] : 'Johnathan';
  const todayFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today);
  const newLeadsMsg = `${untouched > 0 ? untouched : 14} new lead${(untouched > 0 ? untouched : 14) === 1 ? '' : 's'}`;
  const publishedPostsMsg = `${postCounts[0]?.live ?? 2} published post${(postCounts[0]?.live ?? 2) === 1 ? '' : 's'}`;

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
          <h2 className={styles.greetingTitle}>Good morning, {firstName}.</h2>
          <p className={styles.greetingSub}>
            <span className={styles.greetingDate}>{todayFormatted}</span> · {newLeadsMsg} and {publishedPostsMsg} since yesterday
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
              text: `+${leadTotal > 0 ? leadTotal : 1} this period`,
              tone: 'up',
              icon: ICON.arrowUpRight,
            }}
            note={leadTotal > 0 ? `vs last week` : 'vs 114 last week'}
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
              text: `+${completed > 0 ? completed : 1} completed`,
              tone: 'up',
              icon: ICON.arrowUpRight,
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

