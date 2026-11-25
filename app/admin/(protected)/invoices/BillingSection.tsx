import Link from 'next/link';
import { isoDay } from '@/lib/crm/engagements';
import { INVOICE_STATUS_LABELS, balance, displayStatus } from '@/lib/crm/invoices';
import { getBillingProfile, invoicesForCompany } from '@/lib/crm/invoicesData';
import { formatMoney } from '@/lib/crm/money';
import type { WorkspaceId } from '@/lib/crm/workspace';
import { BillingProfileForm } from './InvoiceClient';
import { newInvoice, saveBillingProfileAction } from './actions';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

/**
 * A company's invoices and billing details — on the customer's Billing tab
 * and on the company page. One billing profile per company, shared by all of
 * its engagements.
 */
export default async function BillingSection({ ws, companyId, engagementId, canEdit }: {
  ws: WorkspaceId;
  companyId: string;
  engagementId: string | null;
  canEdit: boolean;
}) {
  const [rows, profile] = await Promise.all([invoicesForCompany(ws, companyId), getBillingProfile(ws, companyId)]);
  const today = isoDay(new Date());
  const owed = rows.filter((r) => r.status === 'issued' || r.status === 'partially_paid')
    .reduce((n, r) => n + balance(r.totalCents, r.paidCents, r.creditedCents), 0);

  return (
    <>
      <section className={s.card}>
        <div className={s.cardHead}>
          <h2 className={s.cardTitle}>Invoices</h2>
          <span className={s.cardNote}>{owed ? `${formatMoney(owed)} owed` : rows.length ? 'Nothing owed' : ''}</span>
          {canEdit && (
            <form action={newInvoice.bind(null, companyId, engagementId)}>
              <button type="submit" className={s.doneToggle}>New invoice</button>
            </form>
          )}
        </div>
        {rows.length === 0 ? (
          <p className={admin.empty}><strong>No invoices yet</strong>Monthly invoices are drafted from Invoices → Monthly invoices; one-offs start here.</p>
        ) : (
          <div className={admin.tableWrap}>
            <table className={admin.table}>
              <thead><tr><th scope="col">Invoice</th><th scope="col">Status</th><th scope="col">Due</th><th scope="col" className={s.num}>Total</th><th scope="col" className={s.num}>Owed</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const st = displayStatus(r.status, r.dueDate, today);
                  const left = r.status === 'void' || r.status === 'draft' ? 0 : balance(r.totalCents, r.paidCents, r.creditedCents);
                  return (
                    <tr key={r.id}>
                      <td>
                        <Link className={admin.rowLink} href={`/admin/invoices/${r.id}`}><span className={admin.cellPrimary}>{r.number ?? 'Draft'}</span></Link>
                        {r.periodStart && <span className={admin.cellSecondary}>{r.periodStart.slice(0, 7)}</span>}
                      </td>
                      <td><span className={`${s.badge} ${s[`s_${st}`]}`}>{INVOICE_STATUS_LABELS[st]}</span></td>
                      <td className={admin.nowrap}>{r.dueDate ?? '—'}</td>
                      <td className={s.num}>{formatMoney(r.totalCents, r.currency)}</td>
                      <td className={s.num}>{left ? formatMoney(left, r.currency) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={s.card}>
        <div className={s.cardHead}>
          <h2 className={s.cardTitle}>Billing details</h2>
          <span className={s.cardNote}>Printed on invoices from the next one issued</span>
        </div>
        {canEdit ? (
          <BillingProfileForm
            action={saveBillingProfileAction.bind(null, companyId)}
            values={{
              legalName: profile?.legalName ?? '', billingEmail: profile?.billingEmail ?? '', address: profile?.address ?? '', taxId: profile?.taxId ?? '',
              currency: profile?.currency ?? 'USD', paymentTermsDays: profile?.paymentTermsDays ?? 15,
              tax: profile?.taxBps ? String(profile.taxBps / 100) : '', notes: profile?.notes ?? '',
            }}
          />
        ) : (
          <p className={s.padNote}>{profile ? [profile.legalName, profile.billingEmail].filter(Boolean).join(' · ') : 'Not set.'}</p>
        )}
      </section>
    </>
  );
}
