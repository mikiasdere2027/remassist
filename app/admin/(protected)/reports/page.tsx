import { requireUser } from '@/lib/auth/require';
import { apiServer } from '@/lib/api/server';
import { reportCsvUrl, type ReportTable, type ReportsPage as Reports } from '@/lib/api/crm';
import { fmtPct } from '@/lib/crm/display';
import AdminTopbar from '../AdminTopbar';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

/**
 * Reports — how the pipeline is performing. One date range for the page;
 * every table downloads as CSV with exactly the rows shown (the backend
 * builds both from the same table). Mikias's page, reading from the API.
 */
export const dynamic = 'force-dynamic';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const RANGE_KEYS = ['30', '90', '365', 'all'];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const [sp] = await Promise.all([searchParams, requireUser()]);
  const range = RANGE_KEYS.includes(sp.range ?? '') ? sp.range! : '90';
  const r = await apiServer<Reports>(`/admin/reports?range=${range}`);
  const byKey = new Map(r.tables.map((t) => [t.key, t]));
  const hm = r.heatmap;

  return (
    <>
      <AdminTopbar title="Reports" subtitle="Where leads come from, how fast the team responds, and what turns into revenue" />
      <div className={admin.view}>
        <div className={s.listStack}>
          <nav className={s.tabs} aria-label="Date range">
            {/* Plain links (a full load): switching range with next/link's in-app
                navigation sometimes stalled on this page (Next 15.5), leaving the
                old range showing. See docs/FRONTEND-GAPS.md. */}
            {r.ranges.map((x) => (
              <a key={x.key} href={`/admin/reports?range=${x.key}`} className={`${s.tab} ${r.range === x.key ? s.tabOn : ''}`}
                aria-current={r.range === x.key ? 'page' : undefined}>
                {x.label}
              </a>
            ))}
          </nav>

          <div className={s.reportGrid}>
            <section className={s.card}>
              <ReportHead t={byKey.get('funnel')!} range={r.range} />
              <div className={s.cardBody}>
                <ol className={s.funnel}>
                  {r.funnel.map((st) => (
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
                  <span className={s.cardNote}>Last {hm.weeks} weeks, each square one day</span>
                </div>
                <span className={s.cardNote}>{hm.busiest ? `Busiest: ${hm.busiest.day} (${hm.busiest.n})` : 'No leads yet'}</span>
              </div>
              <div className={s.cardBody}>
                <div className={s.heatWrap}>
                  <div className={s.heatDays} aria-hidden="true">{WEEKDAYS.map((d) => <span key={d}>{d}</span>)}</div>
                  <div className={s.heat} role="img" aria-label={`Leads per day for the last ${hm.weeks} weeks`}>
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


          {(['sources', 'response', 'owners', 'services', 'stages', 'losses', 'campaigns'] as const).map((k) => {
            const t = byKey.get(k);
            return t ? (
              <section key={k} className={s.card}>
                <ReportHead t={t} range={r.range} />
                <Table t={t} />
              </section>
            ) : null;
          })}
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
      <a className={s.doneToggle} href={reportCsvUrl(t.key, range)} download>Download CSV</a>
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
          {t.rows.map((row, ri) => (
            <tr key={ri}>{row.map((v, i) => <td key={i} className={t.numeric.includes(i) ? s.num : undefined}>{v}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
