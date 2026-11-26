import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { apiServer } from '@/lib/api/server';
import type { CrmSettings, DealBoardData } from '@/lib/api/crm';
import type { Assignee } from '@/lib/api/leads';
import { effectiveProbability, formatMoney, formatMoneyShort, weightedCents } from '@/lib/crm/money';
import { SERVICES } from '@/lib/services';
import AdminTopbar from '../AdminTopbar';
import DealBoard from './DealBoard';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

/**
 * Deals — the pipeline. A board by default (columns per stage with totals),
 * or a list. Won and Lost columns show the last 30 days. Value is monthly
 * recurring; "weighted" multiplies it by each deal's win probability.
 */
export const dynamic = 'force-dynamic';

type Search = { view?: string; owner?: string; service?: string; q?: string };

export default async function DealsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const me = await requireUser();
  const owner = sp.owner === 'me' ? me.id : sp.owner;
  const query = new URLSearchParams();
  if (owner) query.set('owner', owner);
  if (sp.service) query.set('service', sp.service);
  if (sp.q) query.set('q', sp.q);
  const [{ stages, lossReasons: reasons }, board, team] = await Promise.all([
    apiServer<CrmSettings>('/admin/crm/settings'),
    apiServer<DealBoardData>(`/admin/deals${query.size ? `?${query}` : ''}`),
    apiServer<Assignee[]>('/admin/leads/assignees'),
  ]);
  const rows = board.items;

  const stageById = new Map(stages.map((x) => [x.id, x]));
  const open = rows.filter((r) => r.stageKind === 'open');
  const pipeline = open.reduce((n, r) => n + r.monthlyValueCents, 0);
  const weighted = open.reduce((n, r) => n + weightedCents(r.monthlyValueCents, effectiveProbability(r.probability, r.stageProbability)), 0);
  const won = board.thisMonth.won;
  const lost = board.thisMonth.lost;
  const winRate = (won?.n ?? 0) + (lost?.n ?? 0) > 0 ? Math.round(((won?.n ?? 0) / ((won?.n ?? 0) + (lost?.n ?? 0))) * 100) : null;
  const list = sp.view === 'list';
  const services = SERVICES.map((x) => x.name).filter((n) => n !== 'All Services');
  const link = (extra: Partial<Search>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...extra })) if (v) p.set(k, v);
    const q = p.toString();
    return `/admin/deals${q ? `?${q}` : ''}`;
  };

  return (
    <>
      <AdminTopbar
        title="Deals"
        subtitle="The pipeline: what is open, what it is worth, and what closes next"
        action={
          <Link className={admin.btnHeader} href="/admin/deals/new">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            New deal
          </Link>
        }
      />
      <div className={admin.view}>
        <div className={s.listStack}>
          <div className={s.summary}>
            <Stat label="Open pipeline" value={`${formatMoneyShort(pipeline)}/mo`} hint={`${open.length} open ${open.length === 1 ? 'deal' : 'deals'}`} />
            <Stat label="Weighted forecast" value={`${formatMoneyShort(weighted)}/mo`} hint="Value × win probability" />
            <Stat label="Won this month" value={`${formatMoney(won.valueCents)}/mo`} hint={`${won?.n ?? 0} ${won?.n === 1 ? 'deal' : 'deals'}`} />
            <Stat label="Win rate this month" value={winRate === null ? '—' : `${winRate}%`} hint={`${won?.n ?? 0} won · ${lost?.n ?? 0} lost`} />
          </div>

          <div className={s.toolbar}>
            <form className={admin.filters} method="get" style={{ padding: 0, border: 0 }}>
              {list && <input type="hidden" name="view" value="list" />}
              <div className={admin.field}>
                <label className={admin.fieldLabel} htmlFor="d-q">Search</label>
                <input id="d-q" name="q" type="search" className={`${admin.control} ${admin.controlSearch}`} placeholder="Deal or company" defaultValue={sp.q ?? ''} />
              </div>
              <div className={admin.field}>
                <label className={admin.fieldLabel} htmlFor="d-owner">Owner</label>
                <span className={`${admin.selectField} ${admin.selectFieldWide}`}>
                  <select id="d-owner" name="owner" defaultValue={sp.owner ?? ''}>
                    <option value="">Anyone</option>
                    <option value="me">Me</option>
                    <option value="none">Unassigned</option>
                    {team.filter((m) => m.id !== me.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </div>
              <div className={admin.field}>
                <label className={admin.fieldLabel} htmlFor="d-service">Service</label>
                <span className={`${admin.selectField} ${admin.selectFieldWide}`}>
                  <select id="d-service" name="service" defaultValue={sp.service ?? ''}>
                    <option value="">All services</option>
                    {services.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </div>
              <button className={`${admin.btn} ${admin.btnSoft}`} type="submit">Apply</button>
              <Link className={`${admin.btn} ${admin.btnGhost}`} href={list ? '/admin/deals?view=list' : '/admin/deals'}>Reset</Link>
            </form>
            <nav className={s.tabs} aria-label="Deal layout">
              <Link href={link({ view: undefined })} className={`${s.tab} ${!list ? s.tabOn : ''}`} aria-current={!list ? 'page' : undefined}>Board</Link>
              <Link href={link({ view: 'list' })} className={`${s.tab} ${list ? s.tabOn : ''}`} aria-current={list ? 'page' : undefined}>List</Link>
            </nav>
          </div>

          {rows.length === 0 && open.length === 0 && !sp.q && !sp.owner && !sp.service ? (
            <section className={admin.panel}>
              <p className={admin.empty}>
                <strong>No deals yet</strong>
                Convert a qualified lead from its Conversion tab, or add one with New deal.
              </p>
            </section>
          ) : list ? (
            <section className={admin.panel}>
              <div className={admin.tableWrap}>
                <table className={admin.table}>
                  <thead>
                    <tr>
                      <th scope="col">Deal</th><th scope="col">Stage</th><th scope="col">Monthly value</th>
                      <th scope="col">Probability</th><th scope="col">Weighted</th><th scope="col">Expected close</th><th scope="col">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const p = effectiveProbability(r.probability, r.stageProbability);
                      return (
                        <tr key={r.id}>
                          <td>
                            <Link className={admin.rowLink} href={`/admin/deals/${r.id}`}><span className={admin.cellPrimary}>{r.title}</span></Link>
                            <span className={admin.cellSecondary}>{r.companyName ?? 'No company'}</span>
                          </td>
                          <td>{stageById.get(r.stageId)?.name}</td>
                          <td className={admin.nowrap}>{formatMoney(r.monthlyValueCents, r.currency)}</td>
                          <td>{p}%</td>
                          <td className={admin.nowrap}>{formatMoney(weightedCents(r.monthlyValueCents, p), r.currency)}</td>
                          <td className={admin.nowrap}>{r.expectedClose ?? '—'}</td>
                          <td>{r.ownerName?.trim() || 'Unassigned'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <DealBoard
              stages={stages.map((x) => ({ id: x.id, name: x.name, kind: x.kind, probability: x.probability }))}
              deals={rows.map((r) => ({
                id: r.id,
                title: r.title,
                stageId: r.stageId,
                probability: r.probability,
                monthlyValueCents: r.monthlyValueCents,
                currency: r.currency,
                companyName: r.companyName,
                ownerName: r.ownerName?.trim() || null,
                expectedClose: r.expectedClose,
                stageChangedAt: r.stageChangedAt,
              }))}
              lossReasons={reasons.map((x) => ({ id: x.id, label: x.label }))}
            />
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className={s.stat}>
      <span className={s.statLabel}>{label}</span>
      <span className={s.statValue}>{value}</span>
      <span className={s.statHint}>{hint}</span>
    </div>
  );
}
