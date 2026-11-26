import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/require';
import { isApiError } from '@/lib/api/errors';
import { apiServer } from '@/lib/api/server';
import type { ProposalPage as ProposalPageData, RateCatalogue } from '@/lib/api/crm';
import { PROPOSAL_STATUS_LABELS } from '@/lib/crm/proposals';
import { formatMoney } from '@/lib/crm/money';
import { SITE_URL } from '@/lib/site';
import ProposalDocument from '@/components/crm/ProposalDocument';
import AdminTopbar from '../../AdminTopbar';
import { BackLink, KV } from '../../CrmParts';
import { LocalTime } from '../../leads/[id]/LeadClient';
import { ProposalActions, ProposalEditor, ReviseButton } from '../ProposalClient';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

/**
 * One proposal: the editor while it is a draft, the frozen document once
 * sent, and on the right its status, the client link and what to do next.
 */
export const dynamic = 'force-dynamic';

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireUser();
  let p: ProposalPageData;
  let cat: RateCatalogue;
  try {
    [p, cat] = await Promise.all([
      apiServer<ProposalPageData>(`/admin/proposals/${id}`),
      apiServer<RateCatalogue>('/admin/proposals/catalogue'),
    ]);
  } catch (err) {
    if (isApiError(err, 404) || isApiError(err, 400)) notFound();
    throw err;
  }
  const t = p.totals;
  const draft = p.status === 'draft';
  const link = `${await siteOrigin()}/p/${p.publicToken}`;

  return (
    <>
      <AdminTopbar title={`${p.number} · ${p.title}`} subtitle={[p.companyName, PROPOSAL_STATUS_LABELS[p.status]].filter(Boolean).join(' · ')} />
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
                  proposalId={p.id}
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
              <ProposalDocument p={p} companyName={p.companyName} />
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
                <KV label="For">{p.companyName ?? p.dealTitle}</KV>
                <KV label="Client">{[p.recipientName, p.recipientEmail].filter(Boolean).join(' · ')}</KV>
                <KV label="Valid until">{p.validUntil}</KV>
                {p.sentAt && <KV label="Sent"><LocalTime iso={p.sentAt} /></KV>}
                {p.viewedAt && <KV label="First opened"><LocalTime iso={p.viewedAt} /></KV>}
                {p.decidedAt && (
                  <KV label={p.status === 'accepted' ? 'Accepted' : 'Declined'}>
                    <LocalTime iso={p.decidedAt} />{p.decidedByName ? ` by ${p.decidedByName}` : ''}{p.decisionNote ? ` — ${p.decisionNote}` : ''}
                  </KV>
                )}
              </div>
              <ProposalActions proposalId={p.id} status={p.status} link={link} />
              {!draft && (
                <div className={s.padNote}>
                  <ReviseButton proposalId={p.id} className={`${admin.btn} ${admin.btnGhost}`} />
                </div>
              )}
            </section>
            <p className={s.cardNote}>
              <Link href={`/admin/deals/${p.dealId}`}>{p.dealTitle}</Link>
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}

/**
 * The address the team is using right now (production, staging or local),
 * so the client link works wherever it is copied from. SITE_URL is always
 * production, for canonicals and the sitemap.
 */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return SITE_URL;
  const proto = h.get('x-forwarded-proto') ?? (/^(localhost|127\.)/.test(host) ? 'http' : 'https');
  return `${proto}://${host}`;
}
