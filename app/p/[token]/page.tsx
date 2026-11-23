import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isDatabaseConfigured } from '@/db';
import { currentUser } from '@/lib/auth/require';
import { byToken, markViewed } from '@/lib/crm/proposalsData';
import { isExpired, isOpen } from '@/lib/crm/proposals';
import { isoDay } from '@/lib/crm/engagements';
import ProposalDocument from '@/components/crm/ProposalDocument';
import AnswerForm from './AnswerForm';
import { answerProposal } from './actions';
import s from './page.module.css';

/**
 * A proposal as the client sees it, at an unguessable link. Never indexed;
 * Rem Assist's site header, footer and analytics are not shown here
 * (components/layout/SiteChrome.tsx). The first open by someone who is not
 * signed in to the admin marks it Viewed.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Proposal',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default async function PublicProposal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isDatabaseConfigured()) notFound();
  const row = await byToken(token);
  if (!row) notFound();
  const p = row.proposal;

  /* Staff previewing the link do not count as the client opening it. */
  if (p.status === 'sent' && !(await currentUser())) await markViewed(token);

  const expired = isExpired(p.validUntil, isoDay(new Date()));
  return (
    <main className={s.page}>
      <ProposalDocument p={p} companyName={row.companyName} />
      <section className={s.panel} aria-label="Your answer">
        {p.status === 'accepted' && <p className={s.state}>Accepted{p.decidedByName ? ` by ${p.decidedByName}` : ''}. We will be in touch to start onboarding.</p>}
        {p.status === 'declined' && <p className={s.state}>Declined. If anything changes, reply to our email.</p>}
        {p.status === 'withdrawn' && <p className={s.state}>This proposal has been withdrawn. Your contact at Rem Assist will send an updated one.</p>}
        {isOpen(p.status) && expired && <p className={s.state}>This proposal expired on {p.validUntil}. Reply to our email for an updated one.</p>}
        {isOpen(p.status) && !expired && (
          <AnswerForm accept={answerProposal.bind(null, token, true)} decline={answerProposal.bind(null, token, false)} />
        )}
      </section>
    </main>
  );
}
