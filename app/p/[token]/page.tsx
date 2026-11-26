import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { currentUser } from '@/lib/auth/require';
import { isApiError } from '@/lib/api/errors';
import { apiServer } from '@/lib/api/server';
import type { ProposalDocumentData } from '@/lib/api/crm';
import { isExpired, isOpen } from '@/lib/crm/proposals';
import ProposalDocument from '@/components/crm/ProposalDocument';
import AnswerForm from './AnswerForm';
import s from './page.module.css';

/**
 * A proposal as the client sees it, at an unguessable link. Never indexed;
 * Rem Assist's site header, footer and analytics are not shown here (it is
 * outside the (site) route group). The first open by someone who is not
 * signed in to the admin marks it Viewed (the backend does that).
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Proposal',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default async function PublicProposal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) notFound();
  /* Staff previewing the link do not count as the client opening it. */
  const preview = Boolean(await currentUser().catch(() => null));
  let p: ProposalDocumentData;
  try {
    const query = preview ? '?preview=1' : '';
    p = await apiServer<ProposalDocumentData>(`/public/proposals/${token}${query}`);
  } catch (err) {
    if (isApiError(err, 404)) notFound();
    throw err;
  }

  const expired = isExpired(p.validUntil, new Date().toISOString().slice(0, 10));
  return (
    <main className={s.page}>
      <ProposalDocument p={p} companyName={p.companyName} />
      <section className={s.panel} aria-label="Your answer">
        {p.status === 'accepted' && <p className={s.state}>Accepted{p.decidedByName ? ` by ${p.decidedByName}` : ''}. We will be in touch to start onboarding.</p>}
        {p.status === 'declined' && <p className={s.state}>Declined. If anything changes, reply to our email.</p>}
        {p.status === 'withdrawn' && <p className={s.state}>This proposal has been withdrawn. Your contact at Rem Assist will send an updated one.</p>}
        {isOpen(p.status) && expired && <p className={s.state}>This proposal expired on {p.validUntil}. Reply to our email for an updated one.</p>}
        {isOpen(p.status) && !expired && (
          <AnswerForm token={token} />
        )}
      </section>
    </main>
  );
}
