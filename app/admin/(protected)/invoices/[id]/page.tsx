import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isDatabaseConfigured } from '@/db';
import { requireUser } from '@/lib/auth/require';
import { canEditLeads, canManageCrmSettings } from '@/lib/auth/roles';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { isoDay } from '@/lib/crm/engagements';
import { workspaceSettings } from '@/lib/crm/engagementsData';
import { getDb } from '@/db';
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS, balance, canSettle, displayStatus, readBilling } from '@/lib/crm/invoices';
import { getInvoice, previewParties } from '@/lib/crm/invoicesData';
import { formatMoney } from '@/lib/crm/money';
import { SITE_URL } from '@/lib/site';
import InvoiceDocument from '@/components/crm/InvoiceDocument';
import AdminTopbar from '../../AdminTopbar';
import { BackLink, KV } from '../../CrmParts';
import { LocalTime } from '../../leads/[id]/LeadClient';
import { InvoiceActions, InvoiceEditor, PaymentForm, ReasonAmountForm } from '../InvoiceClient';
import { creditNoteAction, deleteInvoiceDraft, issueInvoiceAction, recordPaymentAction, saveInvoice, voidInvoiceAction } from '../actions';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

/**
 * One invoice: the editor while it is a draft, the frozen document once
 * issued; on the right its balance, the client link, payments and credits.
 */
export const dynamic = 'force-dynamic';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDatabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const me = await requireUser();
  const ws = currentWorkspaceId();
  const row = await getInvoice(ws, id);
  if (!row) notFound();
  const inv = row.invoice;
  const draft = inv.status === 'draft';
  const [parties, settings] = await Promise.all([
    inv.parties ? Promise.resolve(inv.parties) : previewParties(ws, inv.companyId),
    workspaceSettings(getDb(), ws),
  ]);
  const billing = readBilling(settings);
  const today = isoDay(new Date());
  const st = displayStatus(inv.status, inv.dueDate, today);
  const owed = balance(inv.totalCents, inv.paidCents, inv.creditedCents);
  const money = (c: number) => formatMoney(c, inv.currency);
  const canEdit = canEditLeads(me.role);
  const isAdmin = canManageCrmSettings(me.role);
  const link = `${SITE_URL}/i/${inv.publicToken}`;

  return (
    <>
      <AdminTopbar title={inv.number ? `Invoice ${inv.number}` : 'Draft invoice'} subtitle={[row.companyName, INVOICE_STATUS_LABELS[st]].join(' · ')} />
      <div className={admin.view}>
        <BackLink href="/admin/invoices">Back to invoices</BackLink>
        <div className={s.proposalLayout}>
          <div className={s.mainCol}>
            {draft && canEdit && (
              <section className={s.card}>
                <div className={s.cardHead}>
                  <h2 className={s.cardTitle}>Edit the draft</h2>
                  <span className={s.cardNote}>Nothing is sent until you issue it</span>
                </div>
                <InvoiceEditor
                  action={saveInvoice.bind(null, inv.id)}
                  values={{
                    lines: inv.lines, discount: inv.discountBps ? String(inv.discountBps / 100) : '', tax: inv.taxBps ? String(inv.taxBps / 100) : '',
                    notes: inv.notes ?? '', periodStart: inv.periodStart ?? '', periodEnd: inv.periodEnd ?? '', currency: inv.currency,
                  }}
                />
              </section>
            )}
            <section>
              <h2 className={s.sectionTitle} style={{ margin: '0 0 10px' }}>{draft ? 'Preview (as saved)' : 'What the client sees'}</h2>
              <InvoiceDocument
                inv={inv}
                parties={parties}
                credits={row.creditNotes.map(({ c }) => ({ number: c.number, amountCents: c.amountCents, reason: c.reason }))}
                footer={billing.footer || null}
              />
            </section>
          </div>

          <aside className={s.railCol} aria-label="Invoice status">
            <section className={s.card}>
              <div className={s.cardBody}>
                <div className={s.statRow}>
                  <span className={s.kvLabel}>Status</span>
                  <span className={`${s.badge} ${s[`s_${st}`]}`}>{INVOICE_STATUS_LABELS[st]}</span>
                </div>
                <span className={s.scoreBig}>{money(inv.status === 'void' ? 0 : draft ? inv.totalCents : owed)}<span className={s.cardNote}> {draft ? 'total' : 'owed'}</span></span>
                <KV label="Customer">
                  {row.engagementTitle && inv.engagementId
                    ? <Link href={`/admin/customers/${inv.engagementId}`}>{row.companyName} · {row.engagementTitle}</Link>
                    : <Link href={`/admin/companies/${inv.companyId}`}>{row.companyName}</Link>}
                </KV>
                <KV label="Total">{money(inv.totalCents)}</KV>
                {inv.issueDate && <KV label="Issued">{inv.issueDate}</KV>}
                {inv.dueDate && <KV label="Due">{inv.dueDate}</KV>}
                {inv.viewedAt && <KV label="Client opened"><LocalTime iso={inv.viewedAt.toISOString()} /></KV>}
                {inv.voidedAt && <KV label="Voided"><LocalTime iso={inv.voidedAt.toISOString()} mode="date" />{inv.voidReason ? ` — ${inv.voidReason}` : ''}</KV>}
                {!parties.buyer.email && <p className={s.cardNote}>No billing email for this customer. <Link href={`/admin/companies/${inv.companyId}`}>Add billing details</Link>.</p>}
                {!billing.bankDetails && <p className={s.cardNote}>Your bank details are not set, so the invoice has no payment instructions. An admin can add them in CRM settings.</p>}
              </div>
              {canEdit && (
                <InvoiceActions status={inv.status} link={link} issue={issueInvoiceAction.bind(null, inv.id)} remove={deleteInvoiceDraft.bind(null, inv.id)} />
              )}
            </section>

            {!draft && (
              <section className={s.card}>
                <div className={s.cardHead}><h2 className={s.cardTitle}>Payments</h2></div>
                {row.payments.length === 0 ? <p className={s.padNote}>None yet.</p> : (
                  <ul className={s.miniList}>
                    {row.payments.map(({ p, by }) => (
                      <li key={p.id}>
                        <span>{p.receivedOn} · {PAYMENT_METHOD_LABELS[p.method]}{p.reference ? ` · ${p.reference}` : ''}</span>
                        <span className={s.miniMeta}>{money(p.amountCents)}{by ? ` · ${by}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {canEdit && canSettle(inv.status) && (
                  <PaymentForm action={recordPaymentAction.bind(null, inv.id)} owed={(owed / 100).toFixed(2)} today={today} />
                )}
              </section>
            )}

            {!draft && (row.creditNotes.length > 0 || (isAdmin && canSettle(inv.status))) && (
              <section className={s.card}>
                <div className={s.cardHead}><h2 className={s.cardTitle}>Credit notes</h2></div>
                {row.creditNotes.length > 0 && (
                  <ul className={s.miniList}>
                    {row.creditNotes.map(({ c, by }) => (
                      <li key={c.id}>
                        <span>{c.number} · {c.reason}</span>
                        <span className={s.miniMeta}>−{money(c.amountCents)}{by ? ` · ${by}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {isAdmin && canSettle(inv.status) && (
                  <ReasonAmountForm action={creditNoteAction.bind(null, inv.id)} label="Reason (printed on the invoice)" submit="Issue credit note" withAmount okText="Credit note issued"
                    confirmText="Issue a credit note? It reduces what the customer owes and cannot be undone." />
                )}
              </section>
            )}

            {isAdmin && (inv.status === 'issued') && inv.paidCents === 0 && inv.creditedCents === 0 && (
              <section className={s.card}>
                <div className={s.cardHead}>
                  <h2 className={s.cardTitle}>Void</h2>
                  <span className={s.cardNote}>Cancels the invoice; its number stays used</span>
                </div>
                <ReasonAmountForm action={voidInvoiceAction.bind(null, inv.id)} label="Why it is being voided" submit="Void invoice" withAmount={false} okText="Voided"
                  confirmText="Void this invoice? This cannot be undone." />
              </section>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
