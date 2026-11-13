import Link from 'next/link';
import { SOURCE_LABELS } from '@/lib/leads/display';
import styles from '../admin.module.css';

/**
 * The dashboard's lower panels: At a glance site health grid, System alerts
 * (excluding rate catalog and export leads as CSV), Lead pipeline stepper + table,
 * 14-day lead activity volume chart, and Top sources.
 */

const SOURCE_ICON: Record<string, React.ReactNode> = {
  qualify_quiz: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 11l3 3 7-7" />
      <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
    </svg>
  ),
  ask_widget: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.5-5A8 8 0 1 1 21 12z" />
    </svg>
  ),
  contact_form: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),
  pricing_cta: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2v20M17 6.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.7 5 3.2 5 1.3 5 3.3-2.2 3-5 3-5-1.1-5-3" />
    </svg>
  ),
};

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/** A source, named beside a tinted glyph. Falls back to the raw key. */
export function SourceTag({ source }: { source: string }) {
  return (
    <span className={styles.srcTag}>
      <span className={styles.sourceChip}>
        {SOURCE_ICON[source] ?? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /></svg>
        )}
      </span>
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}

/**
 * At a glance: 2x2 health card grid as shown in the reference design.
 */
export function AtAGlance({ counts }: {
  counts: {
    faqLive: number; faqTotal: number;
    reviewsLive: number; postsLive: number; postsTotal: number;
    quizzes: number; anonymous: number;
  };
}) {
  const postsFullyLive = counts.postsLive >= counts.postsTotal && counts.postsTotal > 0;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h2 className={styles.panelTitle}>At a glance</h2>
          <p className={styles.panelSub}>Site health overview</p>
        </div>
      </div>

      <div className={styles.glanceGrid}>
        <Link className={styles.glanceTile} href="/admin/content/faq">
          {/* Icon on the left, full tile height; title + figure stacked in the this is th sction 
              right column. */}
          <span className={styles.healthIconGood}>
            <CheckCircleIcon />
          </span>
          <span className={styles.glanceTileBody}>
            <span className={styles.glanceTileTitle}>FAQ answers live</span>
            <span className={styles.glanceTileVal}>
              {counts.faqLive} of {counts.faqTotal}
            </span>
          </span>
        </Link>

        <Link className={styles.glanceTile} href="/admin/content/reviews">
          <span className={styles.healthIconGood}>
            <CheckCircleIcon />
          </span>
          <span className={styles.glanceTileBody}>
            <span className={styles.glanceTileTitle}>Reviews shown</span>
            <span className={styles.glanceTileVal}>{counts.reviewsLive}</span>
          </span>
        </Link>

        <Link className={styles.glanceTile} href="/admin/content/posts">
          <span className={postsFullyLive ? styles.healthIconGood : styles.healthIconWarn}>
            {postsFullyLive ? <CheckCircleIcon /> : <AlertCircleIcon />}
          </span>
          <span className={styles.glanceTileBody}>
            <span className={styles.glanceTileTitle}>Posts published</span>
            <span className={styles.glanceTileVal}>
              {counts.postsLive} of {counts.postsTotal}
            </span>
          </span>
        </Link>

        <Link className={styles.glanceTile} href="/admin/quizzes">
          <span className={styles.healthIconGood}>
            <CheckCircleIcon />
          </span>
          <span className={styles.glanceTileBody}>
            <span className={styles.glanceTileTitle}>Fit finder submissions</span>
            <span className={styles.glanceTileVal}>{counts.quizzes} stored</span>
          </span>
        </Link>
      </div>
    </section>
  );
}

/**
 * System alerts: important site and configuration alerts.
 * Explicitly excludes "Rate catalog" and "Export every lead as CSV" per request.
 */
export function SystemAlerts({ counts }: {
  counts: {
    mailConfigured: boolean;
    anonymous: number;
  };
}) {
  const alerts: Array<{
    id: string;
    title: string;
    desc: string;
    btnLabel: string;
    href: string;
  }> = [];

  if (!counts.mailConfigured) {
    alerts.push({
      id: 'mail',
      title: 'No email provider is configured',
      desc: 'New-lead alerts, invitations and password resets are not emailed. Set RESEND_API_KEY on the API server.',
      btnLabel: 'Fix settings',
      href: '/admin/settings',
    });
  }

  if (counts.anonymous > 0) {
    alerts.push({
      id: 'quizzes',
      title: `${counts.anonymous} quiz submission${counts.anonymous === 1 ? '' : 's'} has no contact details`,
      desc: 'Interest with nobody to reply to.',
      btnLabel: 'Review now',
      href: '/admin/quizzes?only=anonymous',
    });
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h2 className={styles.panelTitle}>System alerts</h2>
          <p className={styles.panelSub}>Important system and site alerts</p>
        </div>
        <Link className={styles.panelLink} href="/admin/settings">View all →</Link>
      </div>

      <div className={styles.alertList}>
        {alerts.length === 0 ? (
          <div className={styles.alertEmpty}>
            <span className={styles.healthIconGood}>
              <CheckCircleIcon />
            </span>
            <div>
              <strong className={styles.alertTitle}>All systems operational</strong>
              <div className={styles.alertDesc}>No active alerts require attention.</div>
            </div>
          </div>
        ) : (
          alerts.map((a) => (
            <div key={a.id} className={styles.alertItem}>
              <div className={styles.alertContent}>
                <span className={styles.alertIconWarn}>
                  <AlertTriangleIcon />
                </span>
                <div className={styles.alertText}>
                  <strong className={styles.alertTitle}>{a.title}</strong>
                  <span className={styles.alertDesc}>{a.desc}</span>
                </div>
              </div>
              <Link href={a.href} className={styles.alertBtn}>
                {a.btnLabel}
              </Link>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

/**
 * Lead pipeline with a 4-step stepper and detailed conversion breakdown.
 */
/** Each pipeline stage's brand colour — New is light blue, Contacted orange,
    Qualified dark blue, Won green. Used for the step dots, the breakdown table
    bullets and, blended, for the stepper line's gradient. */
const PIPELINE_COLORS: Record<string, string> = {
  new: '#34bdf0',
  contacted: '#e5a82e',
  qualified: '#326dda',
  won: '#12b76a',
  lost: '#d92d20',
  spam: '#667180',
};

export function LeadPipeline({
  statusCounts,
  leadTotal,
}: {
  statusCounts: Map<string, number>;
  leadTotal: number;
}) {
  const steps = [
    { key: 'new', label: 'New', color: PIPELINE_COLORS.new, count: statusCounts.get('new') ?? 0 },
    { key: 'contacted', label: 'Contacted', color: PIPELINE_COLORS.contacted, count: statusCounts.get('contacted') ?? 0 },
    { key: 'qualified', label: 'Qualified', color: PIPELINE_COLORS.qualified, count: statusCounts.get('qualified') ?? 0 },
    { key: 'won', label: 'Won', color: PIPELINE_COLORS.won, count: statusCounts.get('won') ?? 0 },
  ];

  /* Uniform dot size — the line is a clean connector, not a funnel. */
  const dots = [
    { ...steps[0], size: 16 },
    { ...steps[1], size: 16 },
    { ...steps[2], size: 16 },
    { ...steps[3], size: 16 },
  ];

  const inPipeline = steps.reduce((sum, s) => sum + s.count, 0);

  const statuses = [
    { key: 'new', label: 'New', dotColor: PIPELINE_COLORS.new },
    { key: 'contacted', label: 'Contacted', dotColor: PIPELINE_COLORS.contacted },
    { key: 'qualified', label: 'Qualified', dotColor: PIPELINE_COLORS.qualified },
    { key: 'won', label: 'Won', dotColor: PIPELINE_COLORS.won },
    { key: 'lost', label: 'Lost', dotColor: PIPELINE_COLORS.lost },
    { key: 'spam', label: 'Spam', dotColor: PIPELINE_COLORS.spam },
  ];

  const won = statusCounts.get('won') ?? 0;
  const overallConversion = leadTotal > 0 ? Math.round((won / leadTotal) * 100) : 0;

  /* Dynamic funnel thickness: grows from thin (4px) to thick (16px) to show the funnel,
     but if a stage has 0 leads, it stays so thin (2.5px). */
  const t0 = steps[0].count > 0 ? 4 : 2.5;
  const t1 = steps[1].count > 0 ? 8 : 2.5;
  const t2 = steps[2].count > 0 ? 12 : 2.5;
  const t3 = steps[3].count > 0 ? 16 : 2.5;

  const pathD = `M 0 ${12 - t0 / 2} L 100 ${12 - t1 / 2} L 200 ${12 - t2 / 2} L 300 ${12 - t3 / 2} L 300 ${12 + t3 / 2} L 200 ${12 + t2 / 2} L 100 ${12 + t1 / 2} L 0 ${12 + t0 / 2} Z`;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h2 className={styles.panelTitle}>Lead pipeline</h2>
          <p className={styles.panelSub}>
            <b className={styles.pipelineSubCount}>{inPipeline} of {leadTotal}</b> leads are in the pipeline
          </p>
        </div>
        <span className={`${styles.pill} ${styles.pillNeutral}`}>
          Overall conversion &nbsp;<b>{overallConversion}%</b>
        </span>
      </div>

      <div className={styles.pipelineWrap}>
        {/* Stepper */}
        <div className={styles.pipelineStepper}>
          <svg
            className={styles.pipelineSvg}
            viewBox="0 0 300 24"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="pipelineFunnelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={steps[0].count > 0 ? steps[0].color : '#cbd5e1'} />
                <stop offset="33.3%" stopColor={steps[1].count > 0 ? steps[1].color : '#cbd5e1'} />
                <stop offset="66.6%" stopColor={steps[2].count > 0 ? steps[2].color : '#cbd5e1'} />
                <stop offset="100%" stopColor={steps[3].count > 0 ? steps[3].color : '#cbd5e1'} />
              </linearGradient>
            </defs>
            <path d={pathD} fill="url(#pipelineFunnelGrad)" opacity="0.9" />
          </svg>
          {dots.map((step) => {
            const hasLeads = step.count > 0;
            const dotColor = hasLeads ? step.color : '#cbd5e1';
            return (
              <div key={step.key} className={styles.pipelineStep}>
                <span className={styles.pipelineStepLabel}>{step.label}</span>
                <span className={styles.pipelineDotSlot}>
                  <span
                    className={`${styles.pipelineDot} ${hasLeads ? styles.pipelineDotActive : ''}`}
                    style={{
                      borderColor: dotColor,
                      backgroundColor: hasLeads ? dotColor : '#fff',
                      boxShadow: hasLeads
                        ? `0 0 0 4px #fff, 0 0 0 6px ${dotColor}33`
                        : `0 0 0 4px #fff`,
                    }}
                  />
                </span>
                <span className={styles.pipelineStepCount}>{step.count}</span>
              </div>
            );
          })}
        </div>

        {/* Breakdown table */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Status</th>
                <th>Leads</th>
                <th>Conversion</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((s) => {
                const n = statusCounts.get(s.key) ?? 0;
                const pct = leadTotal > 0 ? Math.round((n / leadTotal) * 100) : 0;
                return (
                  <tr key={s.key}>
                    <td>
                      <Link className={styles.rowLink} href={`/admin/leads?status=${s.key}`}>
                        <span className={styles.pipelineRowStatus}>
                          <span
                            className={styles.statusBullet}
                            style={{ backgroundColor: s.dotColor }}
                          />
                          {s.label}
                        </span>
                      </Link>
                    </td>
                    <td className={styles.mono}>{n}</td>
                    <td className={styles.barCell}>
                      <span className={styles.bar} aria-hidden="true">
                        <span className={styles.barFill} style={{ width: `${pct}%` }} />
                      </span>
                      <span className={styles.barPct}>{pct}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/**
 * 14-day lead activity volume chart.
 */
export function LeadActivity({ days }: { days: Array<{ label: string; n: number; today: boolean }> }) {
  const peak = Math.max(1, ...days.map((d) => d.n));
  /* The range the chart covers, as the Test Admin prototype drew it — the
     pill spans the first day's label to the last day's label. */
  const from = days[0]?.label ?? '—';
  const to = days[days.length - 1]?.label ?? '—';
  const range = `${from} – ${to}`;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h2 className={styles.panelTitle}>Lead activity — last 14 days</h2>
          <p className={styles.panelSub}>Site-wide submissions, one bar per day</p>
        </div>
        <span className={`${styles.pill} ${styles.pillNeutral}`}>{range}</span>
      </div>
      <div className={styles.chart}>
        {days.map((d) => (
          <div
            className={`${styles.chartCol} ${d.today ? styles.chartToday : ''}`}
            key={d.label}
            title={`${d.n} lead${d.n === 1 ? '' : 's'} on ${d.label}`}
          >
            <div
              className={styles.chartBar}
              style={{ height: `${Math.max(4, Math.round((d.n / peak) * 100))}%` }}
            />
            <span className={styles.cday}>{d.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// Alias for backward compatibility if any imports used LeadVolume
export const LeadVolume = LeadActivity;

/**
 * Top sources breakdown.
 */
export function TopSources({
  rows,
  total,
}: {
  rows: Array<{ source: string; n: number }>;
  total: number;
}) {
  const standardSources = [
    { key: 'contact_form', label: 'Contact form' },
    { key: 'qualify_quiz', label: 'Fit finder' },
    { key: 'other', label: 'Other sources' },
  ];

  const sourceMap = new Map(rows.map((r) => [r.source, r.n]));
  const otherTotal = rows
    .filter((r) => r.source !== 'contact_form' && r.source !== 'qualify_quiz')
    .reduce((sum, r) => sum + r.n, 0);

  const displayList = standardSources.map((s) => {
    const count = s.key === 'other' ? otherTotal : (sourceMap.get(s.key) ?? 0);
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return { label: s.label, count, pct };
  });

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h2 className={styles.panelTitle}>Top sources</h2>
          <p className={styles.panelSub}>Where leads came from</p>
        </div>
        <span className={`${styles.pill} ${styles.pillNeutral}`}>
          Total leads &nbsp;<b>{total}</b>
        </span>
      </div>

      <div className={styles.sources}>
        {displayList.map((item) => (
          <div key={item.label}>
            <div className={styles.srcLabel}>
              <span>{item.label}</span>
              <b>
                {item.count} &nbsp; {item.pct}%
              </b>
            </div>
            <div className={styles.srcTrack}>
              <div
                className={styles.srcFill}
                style={{ width: `${item.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
