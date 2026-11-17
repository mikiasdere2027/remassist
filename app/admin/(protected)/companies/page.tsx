import Link from 'next/link';
import { isDatabaseConfigured } from '@/db';
import { requireUser } from '@/lib/auth/require';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { listCompanies } from '@/lib/crm/deals';
import { formatMoney } from '@/lib/crm/money';
import { initials } from '@/lib/crm/display';
import AdminTopbar from '../AdminTopbar';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

/** Companies — every organisation in the CRM, prospects and customers. */
export const dynamic = 'force-dynamic';

const LIFECYCLE: Record<string, string> = { prospect: 'Prospect', customer: 'Customer', former: 'Former customer' };

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const sp = await searchParams;
  await requireUser();
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminTopbar title="Companies" subtitle="Database not configured" />
        <div className={admin.view}><p className={admin.empty}>No database is configured in this environment.</p></div>
      </>
    );
  }
  const all = await listCompanies(currentWorkspaceId(), sp.q);
  const rows = sp.type ? all.filter((c) => c.lifecycle === sp.type) : all;
  const count = (t?: string) => (t ? all.filter((c) => c.lifecycle === t).length : all.length);
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
                      <span className={`${s.badge} ${c.lifecycle === 'customer' ? s.p_low : s.p_medium}`}>{LIFECYCLE[c.lifecycle]}</span>
                    </Cell>
                    <Cell label="Contacts">{c.contacts}</Cell>
                    <Cell label="Open deals">{c.openDeals > 0 ? `${c.openDeals} · ${formatMoney(c.openValue)}/mo` : '—'}</Cell>
                    <Cell label="Won">{c.wonValue > 0 ? `${formatMoney(c.wonValue)}/mo` : '—'}</Cell>
                    <Cell label="Owner">{c.ownerName?.trim() || c.ownerEmail || <span className={s.muted}>Unassigned</span>}</Cell>
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
