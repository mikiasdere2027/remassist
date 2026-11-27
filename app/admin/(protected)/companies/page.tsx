import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { apiServer } from '@/lib/api/server';
import type { CompanyListItem } from '@/lib/api/crm';
import { formatMoney } from '@/lib/crm/money';
import { initials } from '@/lib/crm/display';
import AdminTopbar from '../AdminTopbar';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

/** Companies — every organisation in the CRM, prospects and customers. */
export const dynamic = 'force-dynamic';

const LIFECYCLE: Record<string, string> = { prospect: 'Prospect', customer: 'Customer', former: 'Former customer' };

/** Derived by the backend from the company's engagements (GLOSSARY.md: Customer). */
const lifecycleOf = (c: CompanyListItem) => c.lifecycle;

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const sp = await searchParams;
  await requireUser();
  const query = new URLSearchParams({ limit: '200' });
  if (sp.q) query.set('q', sp.q);
  const { items: all } = await apiServer<{ items: CompanyListItem[] }>(`/admin/companies?${query}`);
  const rows = sp.type ? all.filter((c) => lifecycleOf(c) === sp.type) : all;
  const count = (t?: string) => (t ? all.filter((c) => lifecycleOf(c) === t).length : all.length);
  const tabs = [
    { key: '', label: 'All' },
    { key: 'customer', label: 'Customers' },
    { key: 'prospect', label: 'Prospects' },
  ];
  const href = (type: string) => {
    const p = new URLSearchParams();
    if (type) p.set('type', type);
    if (sp.q) p.set('q', sp.q);
    const q = p.toString();
    return `/admin/companies${q ? `?${q}` : ''}`;
  };

  return (
    <>
      <AdminTopbar title={`Companies (${all.length})`} subtitle="Prospects and customers, with their people and deals" />
      <div className={admin.view}>
        <div className={s.listStack}>
          <div className={s.toolbar}>
            <nav className={s.tabs} aria-label="Company types">
              {tabs.map((t) => (
                <Link key={t.key} href={href(t.key)} className={`${s.tab} ${(sp.type ?? '') === t.key ? s.tabOn : ''}`} aria-current={(sp.type ?? '') === t.key ? 'page' : undefined}>
                  {t.label} <span className={s.tabCount}>{count(t.key || undefined)}</span>
                </Link>
              ))}
            </nav>
            <form method="get" className={admin.filters} style={{ padding: 0, border: 0 }}>
              {sp.type && <input type="hidden" name="type" value={sp.type} />}
              <div className={admin.field}>
                <label className={admin.fieldLabel} htmlFor="c-q">Search</label>
                <input id="c-q" name="q" type="search" className={`${admin.control} ${admin.controlSearch}`} placeholder="Name or website" defaultValue={sp.q ?? ''} />
              </div>
              <button className={`${admin.btn} ${admin.btnSoft}`} type="submit">Search</button>
            </form>
          </div>

          <section className={admin.panel}>
            {rows.length === 0 ? (
              <p className={admin.empty}>
                <strong>No companies {sp.q ? 'match' : 'yet'}</strong>
                Companies are created when a lead is converted or a deal is added.
              </p>
            ) : (
              <ul className={s.leadList}>
                {rows.map((c) => (
                  <li key={c.id} className={`${s.leadRow} ${s.companyRow}`}>
                    <div className={s.leadWho}>
                      <span className={`${s.avatar} ${s.avatarSm}`} aria-hidden="true">{initials(c.name)}</span>
                      <div className={s.leadWhoText}>
                        <Link className={s.leadName} href={`/admin/companies/${c.id}`}>{c.name}</Link>
                        <span className={s.leadSub}>{c.domain ?? c.country ?? 'No website'}</span>
                      </div>
                    </div>
                    <Cell label="Type">
                      <span className={`${s.badge} ${lifecycleOf(c) === 'customer' ? s.p_low : s.p_medium}`}>{LIFECYCLE[lifecycleOf(c)]}</span>
                    </Cell>
                    <Cell label="Contacts">{c.contacts}</Cell>
                    <Cell label="Open deals">{c.openDeals > 0 ? `${c.openDeals} · ${formatMoney(c.openValueCents)}/mo` : '—'}</Cell>
                    <Cell label="Won">{c.wonValueCents > 0 ? `${formatMoney(c.wonValueCents)}/mo` : '—'}</Cell>
                    <Cell label="Owner">{c.ownerName?.trim() || <span className={s.muted}>Unassigned</span>}</Cell>
                    <Link className={admin.iconBtn} href={`/admin/companies/${c.id}`} aria-label={`Open ${c.name}`}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
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
