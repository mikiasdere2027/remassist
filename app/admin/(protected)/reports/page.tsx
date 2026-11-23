import Link from 'next/link';
import { isDatabaseConfigured } from '@/db';
import { requireUser } from '@/lib/auth/require';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { RANGES, fmtPct, heatmap, rangeFor, rangeStart } from '@/lib/crm/reports';
import { REPORT_KEYS, reportTable, type ReportTable } from '@/lib/crm/reportTables';
import { funnelCounts, leadsPerDay } from '@/lib/crm/reportsData';
import { funnel } from '@/lib/crm/reports';
import { isoDay } from '@/lib/crm/engagements';
import AdminTopbar from '../AdminTopbar';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

/**
 * Reports — how the pipeline is performing. One date range for the page;
 * every table downloads as CSV with exactly the rows shown.
 */
export const dynamic = 'force-dynamic';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  await requireUser();
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminTopbar title="Reports" subtitle="Database not configured" />
        <div className={admin.view}><p className={admin.empty}>No database is configured in this environment.</p></div>
      </>
    );
  }
  const ws = currentWorkspaceId();
  const range = rangeFor(sp.range);
  const from = rangeStart(range.key);
  const today = isoDay(new Date());
  const WEEKS = 12;
  const [tables, f, perDay] = await Promise.all([
    Promise.all(REPORT_KEYS.map((k) => reportTable(k, ws, from))),
    funnelCounts(ws, from),
    leadsPerDay(ws, new Date(Date.now() - (WEEKS * 7 + 7) * 86_400_000)),
  ]);
  const steps = funnel([
    { key: 'leads', label: 'Leads', count: f.leads },
    { key: 'contacted', label: 'Contacted', count: f.contacted },
    { key: 'qualified', label: 'Qualified', count: f.qualified },
    { key: 'converted', label: 'Converted', count: f.converted },
    { key: 'won', label: 'Won', count: f.won },
  ]);
  const hm = heatmap(perDay, today, WEEKS);
  const byKey = new Map(tables.map((t) => [t.key, t]));

  return (
    <>
      <AdminTopbar title="Reports" subtitle="Where leads come from, how fast the team responds, and what turns into revenue" />
      <div className={admin.view}>
        <div className={s.listStack}>
          <nav className={s.tabs} aria-label="Date range">
            {RANGES.map((r) => (
              <Link key={r.key} href={`/admin/reports?range=${r.key}`} className={`${s.tab} ${range.key === r.key ? s.tabOn : ''}`}
                aria-current={range.key === r.key ? 'page' : undefined}>
                {r.label}
              </Link>
            ))}
          </nav>

          <div className={s.reportGrid}>
            <section className={s.card}>
              <ReportHead t={byKey.get('funnel')!} range={range.key} />
              <div className={s.cardBody}>
                <ol className={s.funnel}>
                  {steps.map((st) => (
                    <li key={st.key}>
                      <span className={s.funnelLabel}>{st.label}</span>
                      <span className={s.funnelTrack}>
                        <span className={s.funnelBar} style={{ width: `${st.ofTop ?? 0}%` }} />
                      </span>
                      <span className={s.funnelNum}><b>{st.count}</b> {st.ofPrev !== null && <span className={s.cardNote}>{fmtPct(st.ofPrev)} of previous</span>}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            <section className={s.card}>
              <div className={s.cardHead}>
                <div>
                  <h2 className={s.cardTitle}>Leads by day</h2>
                  <span className={s.cardNote}>Last {WEEKS} weeks, each square one day</span>
                </div>
                <span className={s.cardNote}>{hm.busiest ? `Busiest: ${hm.busiest.day} (${hm.busiest.n})` : 'No leads yet'}</span>
              </div>
              <div className={s.cardBody}>
                <div className={s.heatWrap}>
                  <div className={s.heatDays} aria-hidden="true">{WEEKDAYS.map((d) => <span key={d}>{d}</span>)}</div>
                  <div className={s.heat} role="img" aria-label={`Leads per day for the last ${WEEKS} weeks`}>
                    {hm.cells.map((c) => (
                      <span key={c.day} className={`${s.heatCell} ${c.future ? s.heatFuture : s[`heat${c.level}`]}`}
                        title={c.future ? '' : `${c.day}: ${c.n} ${c.n === 1 ? 'lead' : 'leads'}`} />
                    ))}
                  </div>
                </div>
                <div className={s.heatLegend} aria-hidden="true">
                  Less {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`${s.heatCell} ${s[`heat${l}`]}`} />)} More
                </div>
              </div>
            </section>
          </div>

          {(['sources', 'response', 'owners', 'services', 'stages', 'losses', 'campaigns'] as const).map((k) => (
            <section key={k} className={s.card}>
              <ReportHead t={byKey.get(k)!} range={range.key} />
              <Table t={byKey.get(k)!} />
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

function ReportHead({ t, range }: { t: ReportTable; range: string }) {
  return (
    <div className={s.cardHead}>
      <div>
        <h2 className={s.cardTitle}>{t.title}</h2>
        <span className={s.cardNote}>{t.note}</span>
      </div>
      <a className={s.doneToggle} href={`/admin/reports/export?report=${t.key}&range=${range}`} download>Download CSV</a>
    </div>
  );
}

function Table({ t }: { t: ReportTable }) {
  if (t.rows.length === 0) return <p className={admin.empty}><strong>Nothing in this period</strong>Try a longer date range.</p>;
  return (
    <div className={admin.tableWrap}>
      <table className={admin.table}>
        <thead>
          <tr>{t.header.map((h, i) => <th key={h} scope="col" className={t.numeric.includes(i) ? s.num : undefined}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {t.rows.map((r, ri) => (
            <tr key={ri}>{r.map((v, i) => <td key={i} className={t.numeric.includes(i) ? s.num : undefined}>{v}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
