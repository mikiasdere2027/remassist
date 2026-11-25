import type { InvoiceLineRow, InvoiceParties } from '@/db/schema/crm';
import { formatMoney } from '@/lib/crm/money';
import { balance, lineTotal } from '@/lib/crm/invoices';
import s from './proposal.module.css';

/**
 * The invoice as the client sees it — on the public page (/i/<token>) and
 * as the admin preview, so the two always match. Printable to PDF from the
 * browser. Shares the proposal document's look.
 */
export default function InvoiceDocument({ inv, parties, credits = [], footer }: {
  inv: {
    number: string | null; status: string; issueDate: string | null; dueDate: string | null; periodStart: string | null; periodEnd: string | null;
    currency: string; lines: InvoiceLineRow[]; discountBps: number; taxBps: number;
    subtotalCents: number; discountCents: number; taxCents: number; totalCents: number; paidCents: number; creditedCents: number; notes: string | null;
  };
  parties: InvoiceParties;
  credits?: Array<{ number: string; amountCents: number; reason: string }>;
  footer?: string | null;
}) {
  const money = (c: number) => formatMoney(c, inv.currency);
  const owed = balance(inv.totalCents, inv.paidCents, inv.creditedCents);
  const draft = inv.status === 'draft';
  const pct = (bps: number) => `${(bps / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;

  return (
    <article className={`${s.doc} ${s.branded}`}>
      <div className={s.brandBar}>
        {/* eslint-disable-next-line @next/next/no-img-element -- an SVG that must also print; next/image adds nothing here */}
        <img className={s.logo} src="/images/rem-logo.svg" alt={parties.seller.name} width={172} height={71} />
        <span className={s.docKind}>{draft ? 'Draft invoice' : 'Invoice'}</span>
      </div>
      <header className={s.head}>
        <div>
          <h1 className={s.title}>{draft ? 'Invoice (draft)' : inv.status === 'void' ? `Invoice ${inv.number} — VOID` : `Invoice ${inv.number}`}</h1>
          <p className={s.meta}>
            <span className={s.nowrap}>{inv.issueDate ? `Issued ${inv.issueDate}` : 'Not issued yet'}</span>
            {inv.dueDate && <> · <span className={s.nowrap}>Due {inv.dueDate}</span></>}
            {inv.periodStart && inv.periodEnd && <> · <span className={s.nowrap}>Service period {inv.periodStart} to {inv.periodEnd}</span></>}
          </p>
        </div>
        <div className={s.headline}>
          <span>{inv.status === 'paid' ? 'Paid in full' : inv.status === 'void' ? 'Cancelled' : 'Amount due'}</span>
          <b>{money(inv.status === 'void' ? 0 : owed)}</b>
          {inv.dueDate && owed > 0 && inv.status !== 'void' && <span>by {inv.dueDate}</span>}
        </div>
      </header>

      <section className={s.parties}>
        <div>
          <h2 className={s.h2}>From</h2>
          <p className={s.party}>
            <b>{parties.seller.name}</b>
            {parties.seller.address && <>{'\n'}{parties.seller.address}</>}
            {parties.seller.taxId && <>{'\n'}Tax ID {parties.seller.taxId}</>}
            {parties.seller.email && <>{'\n'}{parties.seller.email}</>}
          </p>
        </div>
        <div>
          <h2 className={s.h2}>Bill to</h2>
          <p className={s.party}>
            <b>{parties.buyer.name}</b>
            {parties.buyer.address && <>{'\n'}{parties.buyer.address}</>}
            {parties.buyer.taxId && <>{'\n'}Tax ID {parties.buyer.taxId}</>}
            {parties.buyer.email && <>{'\n'}{parties.buyer.email}</>}
          </p>
        </div>
      </section>

      <section>
        <table className={s.table}>
          <thead>
            <tr><th scope="col">Description</th><th scope="col" className={s.num}>Qty</th><th scope="col" className={s.num}>Unit price</th><th scope="col" className={s.num}>Amount</th></tr>
          </thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={i}>
                <td>{l.description}</td>
                <td className={s.num}>{l.quantity.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                <td className={s.num}>{money(l.unitCents)}</td>
                <td className={s.num}>{money(lineTotal(l))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {(inv.discountCents > 0 || inv.taxCents > 0) && <tr><td colSpan={3}>Subtotal</td><td className={s.num}>{money(inv.subtotalCents)}</td></tr>}
            {inv.discountCents > 0 && <tr><td colSpan={3}>Discount ({pct(inv.discountBps)})</td><td className={s.num}>−{money(inv.discountCents)}</td></tr>}
            {inv.taxCents > 0 && <tr><td colSpan={3}>Tax ({pct(inv.taxBps)})</td><td className={s.num}>{money(inv.taxCents)}</td></tr>}
            <tr className={s.total}><td colSpan={3}>Total</td><td className={s.num}>{money(inv.totalCents)}</td></tr>
            {credits.map((c) => (
              <tr key={c.number}><td colSpan={3}>Credit note {c.number} — {c.reason}</td><td className={s.num}>−{money(c.amountCents)}</td></tr>
            ))}
            {inv.paidCents > 0 && <tr><td colSpan={3}>Paid</td><td className={s.num}>−{money(inv.paidCents)}</td></tr>}
            {(inv.paidCents > 0 || inv.creditedCents > 0) && inv.status !== 'void' && (
              <tr className={s.total}><td colSpan={3}>Balance due</td><td className={s.num}>{money(owed)}</td></tr>
            )}
          </tfoot>
        </table>
      </section>

      {inv.notes && <p className={s.intro}>{inv.notes}</p>}

      {parties.seller.bankDetails && inv.status !== 'void' && (
        <section>
          <h2 className={s.h2}>How to pay</h2>
          <p className={s.terms}>{parties.seller.bankDetails}</p>
          {inv.number && <p className={s.terms}>Please quote <b>{inv.number}</b> as the payment reference.</p>}
        </section>
      )}

      {footer && <p className={s.terms}>{footer}</p>}
    </article>
  );
}
