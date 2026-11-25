import { isDatabaseConfigured } from '@/db';
import { currentUser } from '@/lib/auth/require';
import { canViewLeads } from '@/lib/auth/roles';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { isoDay } from '@/lib/crm/engagements';
import { toCsv } from '@/lib/crm/reports';
import { INVOICE_STATUS_LABELS, balance, displayStatus } from '@/lib/crm/invoices';
import { listInvoices, type InvoiceFilter } from '@/lib/crm/invoicesData';

/**
 * CSV of the invoices list, with the same filter and search as the page —
 * for the accountant. Checks the session itself (404 when signed out).
 */
export const dynamic = 'force-dynamic';

const FILTERS: InvoiceFilter[] = ['all', 'draft', 'open', 'overdue', 'paid', 'void'];

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user || !canViewLeads(user.role)) return new Response('Not found', { status: 404 });
  if (!isDatabaseConfigured()) return new Response('Database not configured', { status: 503 });
  const url = new URL(req.url);
  const filter = (FILTERS.find((f) => f === url.searchParams.get('filter')) ?? 'all') as InvoiceFilter;
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100) || undefined;
  const today = isoDay(new Date());
  const rows = await listInvoices(currentWorkspaceId(), filter, today, q);
  const cents = (c: number) => (c / 100).toFixed(2);
  const header = ['Number', 'Company', 'Status', 'Period start', 'Issued', 'Due', 'Currency', 'Total', 'Paid', 'Credited', 'Owed'];
  const body = rows.map((r) => [
    r.number ?? 'Draft', r.companyName, INVOICE_STATUS_LABELS[displayStatus(r.status, r.dueDate, today)], r.periodStart ?? '', r.issueDate ?? '', r.dueDate ?? '',
    r.currency, cents(r.totalCents), cents(r.paidCents), cents(r.creditedCents),
    cents(r.status === 'void' || r.status === 'draft' ? 0 : balance(r.totalCents, r.paidCents, r.creditedCents)),
  ]);
  return new Response('\uFEFF' + toCsv(header, body), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="rem-assist-invoices-${filter}-${today}.csv"`,
      'cache-control': 'private, no-store',
    },
  });
}
