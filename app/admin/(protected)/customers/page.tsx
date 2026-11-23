import Link from 'next/link';
import { isDatabaseConfigured } from '@/db';
import type { EngagementRole, OnboardingStep } from '@/db/schema/crm';
import { requireUser } from '@/lib/auth/require';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { CUSTOMER_VIEWS, customerSummary, listEngagements } from '@/lib/crm/engagementsData';
import { ENGAGEMENT_STATUS_LABELS, isoDay, onboardingProgress, renewalState, seatCount, type EngagementStatus } from '@/lib/crm/engagements';
import { formatMoney, formatMoneyShort } from '@/lib/crm/money';
import { initials } from '@/lib/crm/display';
import AdminTopbar from '../AdminTopbar';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

/**
 * Customers — every engagement a won deal became. Monthly recurring revenue,
 * onboarding progress and the renewal calendar, soonest renewal first.
 */
export const dynamic = 'force-dynamic';

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams;
  await requireUser();
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminTopbar title="Customers" subtitle="Database not configured" />
        <div className={admin.view}><p className={admin.empty}>No database is configured in this environment.</p></div>
      </>
    );
  }
  const ws = currentWorkspaceId();
  const view = CUSTOMER_VIEWS.some((v) => v.key === sp.view) ? sp.view ?? '' : '';
  const [rows, sum] = await Promise.all([listEngagements(ws, { view }), customerSummary(ws)]);
  const today = isoDay(new Date());
  const counts: Record<string, number> = { '': sum.all, onboarding: sum.onboarding, active: sum.active, renewal: sum.renewal, paused: sum.paused, churned: sum.churned };

  return (
    <>
      <AdminTopbar title={`Customers (${sum.all - sum.churned})`} subtitle="What each customer buys, how onboarding is going, and when they renew" />
      <div className={admin.view}>
        <div className={s.listStack}>
          <div className={s.summary}>
            <Stat label="Monthly recurring revenue" value={`${formatMoneyShort(sum.mrr)}/mo`} hint="Active and onboarding customers" />
            <Stat label="Active" value={String(sum.active)} hint={`${sum.onboarding} onboarding`} />
            <Stat label="Renewals in 60 days" value={String(sum.renewal)} hint="Plan the conversation early" />
            <Stat label="Churned" value={String(sum.churned)} hint={`${sum.paused} paused`} />
          </div>

          <nav className={s.tabs} aria-label="Customer views">
            {CUSTOMER_VIEWS.map((v) => (
              <Link key={v.key} href={`/admin/customers${v.key ? `?view=${v.key}` : ''}`} className={`${s.tab} ${view === v.key ? s.tabOn : ''}`}
                aria-current={view === v.key ? 'page' : undefined}>
                {v.label} <span className={s.tabCount}>{counts[v.key] ?? 0}</span>
              </Link>
            ))}
          </nav>

          <section className={admin.panel}>
            {rows.length === 0 ? (
              <p className={admin.empty}>
                <strong>{view ? 'No customers here' : 'No customers yet'}</strong>
                A customer appears here as soon as a deal is moved to Won.
              </p>
            ) : (
              <ul className={s.leadList}>
                {rows.map((r) => {
                  const ob = onboardingProgress((r.onboarding ?? []) as OnboardingStep[]);
                  const rn = renewalState(r.renewalDate, r.noticeDays, today);
                  const seats = seatCount((r.roles ?? []) as EngagementRole[]);
                  return (
                    <li key={r.id} className={`${s.leadRow} ${s.customerRow}`}>
                      <div className={s.leadWho}>
                        <span className={`${s.avatar} ${s.avatarSm}`} aria-hidden="true">{initials(r.companyName ?? r.title)}</span>
                        <div className={s.leadWhoText}>
                          <Link className={s.leadName} href={`/admin/customers/${r.id}`}>{r.companyName ?? r.title}</Link>
                          <span className={s.leadSub}>{r.service ?? r.title}</span>
                        </div>
                      </div>
                      <Cell label="Status">
                        <span className={`${s.badge} ${s[`s_${r.status}`]}`}>{ENGAGEMENT_STATUS_LABELS[r.status as EngagementStatus]}</span>
                      </Cell>
                      <Cell label="Monthly">{formatMoney(r.monthlyValueCents, r.currency)}</Cell>
                      <Cell label="Team">{seats ? `${seats} ${seats === 1 ? 'seat' : 'seats'}` : '—'}</Cell>
                      <Cell label={r.status === 'onboarding' ? 'Onboarding' : 'Renewal'}>
                        {r.status === 'onboarding'
                          ? `${ob.done} of ${ob.total} steps`
                          : rn
                            ? <span className={rn.overdue ? s.overdue : rn.due ? s.renewSoon : undefined}>
                                {rn.overdue ? `Overdue · ${r.renewalDate}` : `${r.renewalDate} · ${rn.daysLeft}d`}
                              </span>
                            : <span className={s.muted}>Not set</span>}
                      </Cell>
                      <Cell label="Account manager">{r.ownerName?.trim() || r.ownerEmail || <span className={s.muted}>Unassigned</span>}</Cell>
                      <Link className={admin.iconBtn} href={`/admin/customers/${r.id}`} aria-label={`Open ${r.companyName ?? r.title}`}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
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

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={s.leadCell}>
      <span className={s.leadCellLabel}>{label}</span>
      <span className={s.leadCellValue}>{children}</span>
    </div>
  );
}
