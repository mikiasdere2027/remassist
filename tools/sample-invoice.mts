/**
 * Creates one sample invoice in the LOCAL database for demos: Abyssinia
 * Example Logistics, January 2027, two team lines plus an extra-hours line,
 * 15% tax, issued and unpaid. Prints the client link.
 *
 *   npx tsx --env-file=.env.local tools/sample-invoice.mts
 *
 * Refuses to run against anything but a local database.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db';
import { companies, engagements, users } from '@/db/schema';
import { DEFAULT_WORKSPACE_ID } from '@/db/schema/crm';
import { createBlankDraft, issueInvoice, saveBillingProfile, updateDraft } from '@/lib/crm/invoicesData';

const url = process.env.DATABASE_URL ?? '';
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error('Not a local database — refusing.');
  process.exit(1);
}

const ws = DEFAULT_WORKSPACE_ID;
const db = getDb();
const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.email, 'admin@remassistance.com')).limit(1);
const [eng] = await db.select({ id: engagements.id, companyId: engagements.companyId }).from(engagements)
  .innerJoin(companies, eq(companies.id, engagements.companyId))
  .where(and(eq(companies.name, 'Abyssinia Example Logistics'), isNull(engagements.archivedAt))).limit(1);
if (!admin || !eng?.companyId) throw new Error('Run against the local seed data (admin user and Abyssinia customer).');

const id = await db.transaction(async (tx) => {
  await saveBillingProfile(tx, ws, eng.companyId!, {
    legalName: 'Abyssinia Example Logistics PLC', billingEmail: 'finance@abyssinia-logistics.example',
    address: 'Megenagna, Zerihun Building, 4th floor\nAddis Ababa, Ethiopia', taxId: '0098765432',
    currency: 'USD', paymentTermsDays: 15, taxBps: 1500, notes: 'Quote the PO number on every invoice.',
  }, admin.id);
  const draftId = await createBlankDraft(tx, ws, eng.companyId!, eng.id, admin.id);
  await updateDraft(tx, ws, draftId, {
    lines: [
      { description: 'Customer service agents (3 seats, full-time) — January 2027', quantity: 3, unitCents: 144000 },
      { description: 'Team lead / QA supervisor — January 2027', quantity: 1, unitCents: 180000 },
      { description: 'Overtime hours above plan — December 2026', quantity: 12, unitCents: 1100 },
    ],
    discountBps: 500, taxBps: 1500,
    notes: 'PO-2027-0142. Thank you for your business — overtime is billed a month in arrears.',
    periodStart: '2027-01-01', periodEnd: '2027-01-31',
  });
  await issueInvoice(tx, ws, draftId, admin.id);
  return draftId;
});
const { invoices } = await import('@/db/schema');
const [row] = await db.select({ number: invoices.number, token: invoices.publicToken, total: invoices.totalCents }).from(invoices).where(eq(invoices.id, id));
console.log(`${row.number}  total ${(row.total / 100).toFixed(2)}  admin /admin/invoices/${id}  client /i/${row.token}`);
process.exit(0);
