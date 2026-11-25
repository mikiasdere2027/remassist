import Link from 'next/link';
import { isDatabaseConfigured } from '@/db';
import { requireUser } from '@/lib/auth/require';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { isoDay } from '@/lib/crm/engagements';
import { AGEING, AGEING_LABELS, INVOICE_STATUS_LABELS, balance, displayStatus } from '@/lib/crm/invoices';
import { listInvoices, receivablesSummary, type InvoiceFilter } from '@/lib/crm/invoicesData';
import { formatMoney } from '@/lib/crm/money';
import AdminTopbar from '../AdminTopbar';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

/** Invoices — what is owed, how late, and every invoice newest first. */
export const dynamic = 'force-dynamic';

const FILTERS: Array<{ key: InvoiceFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'open', label: 'Unpaid' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
  { key: 'void', label: 'Void' },
];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const sp = await searchParams;
  await requireUser();
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminTopbar title="Invoices" subtitle="Database not configured" />
        <div className={admin.view}><p className={admin.empty}>No database is configured in this environment.</p></div>
      </>
    );
  }
  const filter = (FILTERS.find((f) => f.key === sp.filter)?.key ?? 'all') as InvoiceFilter;
  const q = (sp.q ?? '').trim().slice(0, 100) || undefined;
  const ws = currentWorkspaceId();
  const today = isoDay(new Date());
  const [rows, sum] = await Promise.all([listInvoices(ws, filter, today, q), receivablesSummary(ws, today)]);
  const money = (c: number) => formatMoney(c, 'USD');
  const exportHref = `/admin/invoices/export?filter=${filter}${q ? `&q=${encodeURIComponent(q)}` : ''}`;

  return (
    <>
      <AdminTopbar title="Invoices" subtitle="Billing, payments and what is still owed" />
      <div className={admin.view}>
        <div className={s.listStack}>
          <div className={s.summary}>
            <div className={s.stat}>
              <span className={s.statLabel}>Outstanding</span>
              <span className={s.statValue}>{money(sum.outstandingCents)}</span>
              <span className={s.statHint}>{sum.openCount} unpaid {sum.openCount === 1 ? 'invoice' : 'invoices'}</span>
            </div>
            <div className={s.stat}>
              <span className={s.statLabel}>Overdue</span>
              <span className={s.statValue} style={sum.overdueCents ? { color: 'var(--critical-600)' } : undefined}>{money(sum.overdueCents)}</span>
              <span className={s.statHint}>{sum.overdueCount} past the due date</span>
            </div>
            <div className={s.stat}>
              <span className={s.statLabel}>Invoiced this month</span>
              <span className={s.statValue}>{money(sum.invoicedThisMonthCents)}</span>
              <span className={s.statHint}>{sum.draftCount} {sum.draftCount === 1 ? 'draft' : 'drafts'} waiting</span>
            </div>
            <div className={s.stat}>
              <span className={s.statLabel}>Collected this month</span>
              <span className={s.statValue}>{money(sum.collectedThisMonthCents)}</span>
              <span className={s.statHint}>Payments received</span>
            </div>
          </div>

          <div className={s.ageing} aria-label="Unpaid invoices by how late they are">
            {AGEING.map((b) => (
              <div key={b} className={b !== 'current' && sum.ageing[b] > 0 ? s.ageLate : undefined}>
                <span>{AGEING_LABELS[b]}</span>
                <b>{money(sum.ageing[b])}</b>
              </div>
            ))}
          </div>

          <div className={s.toolbar}>
            <nav className={s.tabs} aria-label="Invoice status">
              {FILTERS.map((f) => (
                <Link key={f.key} href={f.key === 'all' ? '/admin/invoices' : `/admin/invoices?filter=${f.key}`}
                  className={`${s.tab} ${filter === f.key ? s.tabOn : ''}`} aria-current={filter === f.key ? 'page' : undefined}>
                  {f.label}
                </Link>
              ))}
            </nav>
            <div className={s.headerActions}>
              <form action="/admin/invoices" method="get" role="search">
                {filter !== 'all' && <input type="hidden" name="filter" value={filter} />}
                <input name="q" className={s.input} defaultValue={q} placeholder="Number or company" aria-label="Search invoices" />
              </form>
              <a href={exportHref} className={`${admin.btn} ${admin.btnGhost}`}>Export CSV</a>
              <Link href="/admin/invoices/run" className={`${admin.btn} ${admin.btnPrimary}`}>Monthly invoices</Link>
            </div>
          </div>

          <section className={admin.panel}>
            {rows.length === 0 ? (
              <p className={admin.empty}>
                <strong>No invoices {filter === 'all' && !q ? 'yet' : 'here'}</strong>
                Use Monthly invoices to draft this month&rsquo;s for every customer, or start one from a customer&rsquo;s page.
              </p>
            ) : (
              <div className={admin.tableWrap}>
                <table className={admin.table}>
                  <thead>
                    <tr>
                      <th scope="col">Invoice</th><th scope="col">Status</th><th scope="col">Issued</th><th scope="col">Due</th>
                      <th scope="col" className={s.num}>Total</th><th scope="col" className={s.num}>Owed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const st = displayStatus(r.status, r.dueDate, today);
                      const owed = r.status === 'void' || r.status === 'draft' ? 0 : balance(r.totalCents, r.paidCents, r.creditedCents);
                      return (
                        <tr key={r.id}>
                          <td>
                            <Link className={admin.rowLink} href={`/admin/invoices/${r.id}`}><span className={admin.cellPrimary}>{r.number ?? 'Draft'}</span></Link>
                            <span className={admin.cellSecondary}>{r.companyName}{r.periodStart ? ` · ${r.periodStart.slice(0, 7)}` : ''}</span>
                          </td>
                          <td><span className={`${s.badge} ${s[`s_${st}`]}`}>{INVOICE_STATUS_LABELS[st]}</span></td>
                          <td>{r.issueDate ?? '—'}</td>
                          <td>{r.dueDate ?? '—'}</td>
                          <td className={s.num}>{formatMoney(r.totalCents, r.currency)}</td>
                          <td className={s.num}>{owed ? formatMoney(owed, r.currency) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <p className={s.cardNote}>Totals above are in USD and count invoices in other currencies at face value.</p>
        </div>
      </div>
    </>
  );
}
