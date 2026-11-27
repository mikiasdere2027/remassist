import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isDatabaseConfigured, getDb } from '@/db';
import { currentUser } from '@/lib/auth/require';
import { creditNotes } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { invoiceByToken, markInvoiceViewed } from '@/lib/crm/invoicesData';
import { workspaceSettings } from '@/lib/crm/engagementsData';
import { balance, canSettle, readBilling } from '@/lib/crm/invoices';
import { isStripeConfigured } from '@/lib/crm/stripe';
import InvoiceDocument from '@/components/crm/InvoiceDocument';
import PayWithStripeButton from './PayWithStripeButton';
import PrintButton from './PrintButton';
import s from '../../p/[token]/page.module.css';

/**
 * An issued invoice as the client sees it, at an unguessable link. Never
 * indexed; the site's header, footer and analytics are not shown
 * (components/layout/SiteChrome.tsx). The first open by someone not signed
 * in to the admin is recorded.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Invoice',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

function formatAmount(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export default async function PublicInvoice({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { token } = await params;
  const { checkout } = await searchParams;
  if (!isDatabaseConfigured()) notFound();
  const inv = await invoiceByToken(token);
  if (!inv || !inv.parties) notFound();

  /* Staff previewing the link do not count as the client opening it. */
  if (!inv.viewedAt && !(await currentUser())) await markInvoiceViewed(token);

  const [credits, settings] = await Promise.all([
    getDb().select({ number: creditNotes.number, amountCents: creditNotes.amountCents, reason: creditNotes.reason })
      .from(creditNotes).where(eq(creditNotes.invoiceId, inv.id)).orderBy(asc(creditNotes.createdAt)),
    workspaceSettings(getDb(), inv.workspaceId),
  ]);

  const openCents = balance(inv.totalCents, inv.paidCents, inv.creditedCents);
  const canPayOnline = isStripeConfigured() && canSettle(inv.status) && openCents > 0;

  return (
    <main className={s.page}>
      {checkout === 'success' ? (
        <section className={`${s.panel} ${s.done}`} role="status">
          <h2>{openCents === 0 ? 'Payment received' : 'Payment submitted'}</h2>
          <p>
            {openCents === 0
              ? 'Thank you — this invoice is paid in full.'
              : 'Your card payment is being confirmed by Stripe and will appear on this invoice momentarily.'}
          </p>
        </section>
      ) : null}
      {checkout === 'cancelled' ? (
        <section className={s.panel} role="status">
          <p className={s.state}>Card checkout was cancelled. You can pay online below whenever you are ready.</p>
        </section>
      ) : null}
      <InvoiceDocument inv={inv} parties={inv.parties} credits={credits} footer={readBilling(settings).footer || null} />
      <section className={s.panel} aria-label="Payment and print options">
        <div className={s.buttons}>
          {canPayOnline ? <PayWithStripeButton token={token} amountLabel={formatAmount(openCents, inv.currency)} /> : null}
          <PrintButton />
        </div>
      </section>
    </main>
  );
}
