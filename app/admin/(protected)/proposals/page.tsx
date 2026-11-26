import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { apiServer } from '@/lib/api/server';
import type { ProposalListItem } from '@/lib/api/crm';
import { PROPOSAL_STATUSES, PROPOSAL_STATUS_LABELS } from '@/lib/crm/proposals';
import { formatMoney } from '@/lib/crm/money';
import AdminTopbar from '../AdminTopbar';
import { LocalTime } from '../leads/[id]/LeadClient';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

/** Proposals — every offer sent, where it stands, newest activity first. New ones start from a deal. */
export const dynamic = 'force-dynamic';

export default async function ProposalsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  await requireUser();
  const status = (PROPOSAL_STATUSES as readonly string[]).includes(sp.status ?? '') ? sp.status : undefined;
  const { items: rows } = await apiServer<{ items: ProposalListItem[] }>(
    `/admin/proposals${status ? `?status=${status}` : ''}`,
  );
  return (
    <>
      <AdminTopbar title="Proposals" subtitle="Offers sent to clients, and their answers" />
      <div className={admin.view}>
        <div className={s.listStack}>
          <nav className={s.tabs} aria-label="Proposal status">
            <Link href="/admin/proposals" className={`${s.tab} ${!status ? s.tabOn : ''}`} aria-current={!status ? 'page' : undefined}>All</Link>
            {PROPOSAL_STATUSES.map((st) => (
              <Link key={st} href={`/admin/proposals?status=${st}`} className={`${s.tab} ${status === st ? s.tabOn : ''}`} aria-current={status === st ? 'page' : undefined}>
                {PROPOSAL_STATUS_LABELS[st]}
              </Link>
            ))}
          </nav>
          <section className={admin.panel}>
            {rows.length === 0 ? (
              <p className={admin.empty}><strong>No proposals {status ? 'here' : 'yet'}</strong>Open a deal and choose New proposal.</p>
            ) : (
              <div className={admin.tableWrap}>
                <table className={admin.table}>
                  <thead><tr><th scope="col">Proposal</th><th scope="col">Status</th><th scope="col" className={s.num}>Per month</th><th scope="col" className={s.num}>One-off</th><th scope="col">Sent</th><th scope="col">Valid until</th></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link className={admin.rowLink} href={`/admin/proposals/${r.id}`}><span className={admin.cellPrimary}>{r.number} · {r.title}</span></Link>
                          <span className={admin.cellSecondary}>{r.companyName ?? ''}</span>
                        </td>
                        <td><span className={`${s.badge} ${s[`s_${r.status}`]}`}>{PROPOSAL_STATUS_LABELS[r.status]}</span></td>
                        <td className={s.num}>{formatMoney(r.monthlyCents, r.currency)}</td>
                        <td className={s.num}>{r.oneOffCents ? formatMoney(r.oneOffCents, r.currency) : '—'}</td>
                        <td>{r.sentAt ? <LocalTime iso={r.sentAt} mode="date" /> : '—'}</td>
                        <td>{r.validUntil ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
