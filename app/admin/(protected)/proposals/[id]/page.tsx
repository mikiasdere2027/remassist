import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isDatabaseConfigured } from '@/db';
import { requireUser } from '@/lib/auth/require';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { catalogue, getProposal, totalsFor } from '@/lib/crm/proposalsData';
import { PROPOSAL_STATUS_LABELS } from '@/lib/crm/proposals';
import { formatMoney } from '@/lib/crm/money';
import { SITE_URL } from '@/lib/site';
import ProposalDocument from '@/components/crm/ProposalDocument';
import AdminTopbar from '../../AdminTopbar';
import { BackLink, KV } from '../../CrmParts';
import { LocalTime } from '../../leads/[id]/LeadClient';
import { ProposalActions, ProposalEditor } from '../ProposalClient';
import { emailProposal, markProposalSent, reviseProposal, saveProposal, withdrawProposal } from '../actions';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

/**
 * One proposal: the editor while it is a draft, the frozen document once
 * sent, and on the right its status, the client link and what to do next.
 */
export const dynamic = 'force-dynamic';

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDatabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireUser();
  const ws = currentWorkspaceId();
  const [row, cat] = await Promise.all([getProposal(ws, id), catalogue()]);
  if (!row) notFound();
  const p = row.proposal;
  const t = totalsFor(p);
  const draft = p.status === 'draft';
  const link = `${SITE_URL}/p/${p.publicToken}`;
  const canEmail = Boolean(process.env.PROPOSAL_EMAIL_FROM);

  return (
    <>
      <AdminTopbar title={`${p.number} · ${p.title}`} subtitle={[row.companyName, PROPOSAL_STATUS_LABELS[p.status]].filter(Boolean).join(' · ')} />
      <div className={admin.view}>
        <BackLink href={`/admin/deals/${p.dealId}`}>Back to the deal</BackLink>
        <div className={s.proposalLayout}>
          <div className={s.mainCol}>
            {draft ? (
              <section className={s.card}>
                <div className={s.cardHead}>
                  <h2 className={s.cardTitle}>Edit the draft</h2>
                  <span className={s.cardNote}>Lines are priced from Admin → Rates; edit any number</span>
                </div>
                <ProposalEditor
                  action={saveProposal.bind(null, p.id)}
                  tiers={cat.tiers}
                  coverage={cat.coverage}
                  values={{
                    title: p.title, intro: p.intro ?? '', terms: p.terms ?? '', validUntil: p.validUntil ?? '',
                    discount: p.discountBps ? String(p.discountBps / 100) : '', recipientName: p.recipientName ?? '',
                    recipientEmail: p.recipientEmail ?? '', lines: p.lines, currency: p.currency,
                  }}
                />
              </section>
            ) : null}
            <section>
              <h2 className={s.sectionTitle} style={{ margin: '0 0 10px' }}>{draft ? 'Preview (as saved)' : 'What the client sees'}</h2>
              <ProposalDocument p={p} companyName={row.companyName} />
            </section>
          </div>

          <aside className={s.railCol} aria-label="Proposal status">
            <section className={s.card}>
              <div className={s.cardBody}>
                <div className={s.statRow}>
                  <span className={s.kvLabel}>Status</span>
                  <span className={`${s.badge} ${s[`s_${p.status}`]}`}>{PROPOSAL_STATUS_LABELS[p.status]}</span>
                </div>
                <span className={s.scoreBig}>{formatMoney(t.monthly, p.currency)}<span className={s.cardNote}> /mo</span></span>
                {t.oneOff > 0 && <KV label="One-off">{formatMoney(t.oneOff, p.currency)}</KV>}
                <KV label="For">{row.companyName ?? row.dealTitle}</KV>
                <KV label="Client">{[p.recipientName, p.recipientEmail].filter(Boolean).join(' · ')}</KV>
                <KV label="Valid until">{p.validUntil}</KV>
                {p.sentAt && <KV label="Sent"><LocalTime iso={p.sentAt.toISOString()} /></KV>}
                {p.viewedAt && <KV label="First opened"><LocalTime iso={p.viewedAt.toISOString()} /></KV>}
                {p.decidedAt && (
                  <KV label={p.status === 'accepted' ? 'Accepted' : 'Declined'}>
                    <LocalTime iso={p.decidedAt.toISOString()} />{p.decidedByName ? ` by ${p.decidedByName}` : ''}{p.decisionNote ? ` — ${p.decisionNote}` : ''}
                  </KV>
                )}
              </div>
              <ProposalActions
                status={p.status}
                link={link}
                canEmail={canEmail}
                send={markProposalSent.bind(null, p.id)}
                email={emailProposal.bind(null, p.id)}
                withdraw={withdrawProposal.bind(null, p.id)}
              />
              {!draft && (
                <form action={reviseProposal.bind(null, p.id)} className={s.padNote}>
                  <button type="submit" className={`${admin.btn} ${admin.btnGhost}`}>Revise (new draft)</button>
                </form>
              )}
            </section>
            <p className={s.cardNote}>
              <Link href={`/admin/deals/${p.dealId}`}>{row.dealTitle}</Link>
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}
