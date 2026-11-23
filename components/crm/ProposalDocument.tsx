import type { ProposalLineRow } from '@/db/schema/crm';
import { formatMoney } from '@/lib/crm/money';
import { ProposalLine, lineAmount, totals } from '@/lib/crm/proposals';
import s from './proposal.module.css';

/**
 * The proposal as the client sees it — rendered on the public page
 * (/p/<token>) and as the preview in the admin, so the two always match.
 */
export default function ProposalDocument({ p, companyName }: {
  p: {
    number: string; title: string; intro: string | null; terms: string | null; lines: ProposalLineRow[];
    discountBps: number; currency: string; validUntil: string | null; recipientName: string | null; sentAt: Date | null;
  };
  companyName: string | null;
}) {
  const lines = p.lines.map((l) => ProposalLine.parse(l));
  const t = totals(lines, p.discountBps);
  const money = (c: number) => formatMoney(c, p.currency);
  const monthly = lines.filter((l) => l.kind === 'monthly');
  const oneOff = lines.filter((l) => l.kind === 'one_off');
  const date = (p.sentAt ?? new Date()).toISOString().slice(0, 10);

  return (
    <article className={s.doc}>
      <header className={s.head}>
        <div>
          <p className={s.brand}>Rem Assist</p>
          <h1 className={s.title}>{p.title}</h1>
          <p className={s.meta}>
            Proposal {p.number} · {date}
            {companyName ? ` · for ${companyName}` : ''}
            {p.recipientName ? `, attention ${p.recipientName}` : ''}
          </p>
        </div>
        <div className={s.headline}>
          <span>Per month</span>
          <b>{money(t.monthly)}</b>
          {p.validUntil && <span>Valid until {p.validUntil}</span>}
        </div>
      </header>

      {p.intro && <p className={s.intro}>{p.intro}</p>}

      <section>
        <h2 className={s.h2}>Your team</h2>
        <table className={s.table}>
          <thead>
            <tr><th scope="col">What</th><th scope="col" className={s.num}>Seats</th><th scope="col" className={s.num}>Hours / month</th><th scope="col" className={s.num}>Rate</th><th scope="col" className={s.num}>Per month</th></tr>
          </thead>
          <tbody>
            {monthly.map((l, i) => (
              <tr key={i}>
                <td>{l.description}</td>
                <td className={s.num}>{l.seats ?? '—'}</td>
                <td className={s.num}>{l.hoursPerMonth ?? '—'}</td>
                <td className={s.num}>{l.rateCents ? `${money(l.rateCents)}/h` : '—'}</td>
                <td className={s.num}>{money(lineAmount(l))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {t.discount > 0 && (
              <>
                <tr><td colSpan={4}>Subtotal</td><td className={s.num}>{money(t.monthlySubtotal)}</td></tr>
                <tr><td colSpan={4}>Discount ({p.discountBps / 100}%)</td><td className={s.num}>−{money(t.discount)}</td></tr>
              </>
            )}
            <tr className={s.total}><td colSpan={4}>Total per month</td><td className={s.num}>{money(t.monthly)}</td></tr>
          </tfoot>
        </table>
      </section>

      {oneOff.length > 0 && (
        <section>
          <h2 className={s.h2}>One-off fees</h2>
          <table className={s.table}>
            <tbody>
              {oneOff.map((l, i) => (
                <tr key={i}><td>{l.description}</td><td className={s.num}>{money(lineAmount(l))}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className={s.summary}>
        <div><span>First invoice</span><b>{money(t.firstMonth)}</b></div>
        <div><span>First year</span><b>{money(t.annual + t.oneOff)}</b></div>
      </section>

      {p.terms && (
        <section>
          <h2 className={s.h2}>Terms</h2>
          <p className={s.terms}>{p.terms}</p>
        </section>
      )}
    </article>
  );
}
