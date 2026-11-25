import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isDatabaseConfigured, getDb } from '@/db';
import { currentUser } from '@/lib/auth/require';
import { creditNotes } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { invoiceByToken, markInvoiceViewed } from '@/lib/crm/invoicesData';
import { workspaceSettings } from '@/lib/crm/engagementsData';
import { readBilling } from '@/lib/crm/invoices';
import InvoiceDocument from '@/components/crm/InvoiceDocument';
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

export default async function PublicInvoice({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
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
  return (
    <main className={s.page}>
      <InvoiceDocument inv={inv} parties={inv.parties} credits={credits} footer={readBilling(settings).footer || null} />
      <section className={s.panel} aria-label="Save or print">
        <PrintButton />
      </section>
    </main>
  );
}
