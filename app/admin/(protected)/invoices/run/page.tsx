import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isDatabaseConfigured } from '@/db';
import { requireUser } from '@/lib/auth/require';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { isoDay } from '@/lib/crm/engagements';
import { monthPeriod, nextMonthStart } from '@/lib/crm/invoices';
import { monthlyCandidates } from '@/lib/crm/invoicesData';
import { formatMoney } from '@/lib/crm/money';
import AdminTopbar from '../../AdminTopbar';
import { BackLink } from '../../CrmParts';
import { RunForm } from '../InvoiceClient';
import { runMonthlyAction } from '../actions';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

/**
 * The monthly run: pick the month, review who will be billed and how much,
 * untick anyone to skip, and create the drafts. Nothing is issued here —
 * each draft is checked and issued from its own page.
 */
export const dynamic = 'force-dynamic';

export default async function MonthlyRunPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams;
  if (!isDatabaseConfigured()) notFound();
  await requireUser();
  const today = isoDay(new Date());
  const thisMonth = today.slice(0, 7);
  const next = nextMonthStart(today).slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? sp.month! : thisMonth;
  const period = monthPeriod(`${month}-01`);
  const rows = await monthlyCandidates(currentWorkspaceId(), period.start);
  const toBill = rows.filter((r) => !r.existingInvoiceId);
  const total = toBill.reduce((n, r) => n + r.monthlyValueCents, 0);
  const prev = monthPeriod(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 2, 1)).toISOString().slice(0, 10)).start.slice(0, 7);

  return (
    <>
      <AdminTopbar title="Monthly invoices" subtitle={`Draft ${period.label}'s invoices for every customer`} />
      <div className={admin.view}>
        <BackLink href="/admin/invoices">Back to invoices</BackLink>
        <div className={s.listStack}>
          <nav className={s.tabs} aria-label="Month">
            {[prev, thisMonth, next].filter((m, i, a) => a.indexOf(m) === i).map((m) => (
              <Link key={m} href={`/admin/invoices/run?month=${m}`} className={`${s.tab} ${m === month ? s.tabOn : ''}`} aria-current={m === month ? 'page' : undefined}>
                {monthPeriod(`${m}-01`).label}
              </Link>
            ))}
          </nav>
          <section className={s.card}>
            <div className={s.cardHead}>
              <h2 className={s.cardTitle}>{period.label}</h2>
              <span className={s.cardNote}>{toBill.length} to draft · {formatMoney(total)} before tax</span>
            </div>
            {rows.length === 0 ? (
              <p className={admin.empty}><strong>No customers to bill</strong>Onboarding and active customers with a monthly fee appear here.</p>
            ) : (
              <RunForm action={runMonthlyAction} period={month} disabled={toBill.length === 0}>
                <ul className={s.runList}>
                  {rows.map((r) => (
                    <li key={r.engagementId} className={s.runItem}>
                      {r.existingInvoiceId ? (
                        <>
                          <span aria-hidden="true">✓</span>
                          <span>
                            <b>{r.companyName}</b> · {r.title}
                            <span className={s.miniMeta}> — already has <Link href={`/admin/invoices/${r.existingInvoiceId}`}>{r.existingNumber ?? 'a draft'}</Link></span>
                          </span>
                          <span className={s.num}>{formatMoney(r.monthlyValueCents, r.currency)}</span>
                        </>
                      ) : (
                        <label>
                          <input type="checkbox" name="engagement" value={r.engagementId} defaultChecked />
                          <span>
                            <b>{r.companyName}</b> · {r.title}
                            {r.status === 'onboarding' && <span className={s.miniMeta}> — still onboarding</span>}
                            {!r.hasBillingEmail && <span className={s.miniMeta}> — <Link href={`/admin/companies/${r.companyId}`}>no billing email</Link></span>}
                          </span>
                          <span className={s.num}>{formatMoney(r.monthlyValueCents, r.currency)}</span>
                        </label>
                      )}
                    </li>
                  ))}
                </ul>
                <p className={s.cardNote}>Each draft has one line at the customer&rsquo;s monthly fee and their tax rate from their billing details. Review and issue each one from its page.</p>
              </RunForm>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
