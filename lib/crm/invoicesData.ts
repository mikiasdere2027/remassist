import { randomBytes } from 'node:crypto';
import { and, asc, desc, eq, gte, inArray, isNull, lte, ne, sql, type SQL } from 'drizzle-orm';
import { getDb } from '@/db';
import { billingProfiles, companies, contacts, creditNotes, engagements, invoices, payments, users, workspaces } from '@/db/schema';
import type { InvoiceLineRow, InvoiceParties } from '@/db/schema/crm';
import { isoDay } from './engagements';
import { workspaceSettings } from './engagementsData';
import { logActivity, recordEvent } from './events';
import {
  AGEING, addDays, ageingBucket, balance, canSettle, documentNumber, invoiceTotals, monthPeriod, monthlyLine, readBilling,
  settledStatus, type AgeingBucket, type InvoiceLine, type InvoiceStatus, type PaymentMethod,
} from './invoices';
import type { WorkspaceId } from './workspace';

/**
 * Invoice reads and writes. The maths and rules are in invoices.ts.
 *
 * A draft can change freely and has no number. Issuing it takes the next
 * number, freezes lines, totals and both parties' details, and sets the due
 * date. After that the only changes are payments, credit notes and a void.
 */

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

function token(): string {
  return randomBytes(24).toString('base64url');
}

function fail(message: string): never {
  throw new Error(message);
}

/* ── billing profiles ─────────────────────────────────────────────────────── */

export async function getBillingProfile(ws: WorkspaceId, companyId: string) {
  const [row] = await getDb().select().from(billingProfiles)
    .where(and(eq(billingProfiles.workspaceId, ws), eq(billingProfiles.companyId, companyId))).limit(1);
  return row ?? null;
}

export interface BillingProfileInput {
  legalName: string | null;
  billingEmail: string | null;
  address: string | null;
  taxId: string | null;
  currency: string;
  paymentTermsDays: number;
  taxBps: number;
  notes: string | null;
}

export async function saveBillingProfile(tx: Tx, ws: WorkspaceId, companyId: string, input: BillingProfileInput, actorId: string) {
  const [co] = await tx.select({ id: companies.id }).from(companies).where(and(eq(companies.workspaceId, ws), eq(companies.id, companyId))).limit(1);
  if (!co) fail('That company no longer exists.');
  await tx.insert(billingProfiles).values({ workspaceId: ws, companyId, ...input })
    .onConflictDoUpdate({ target: billingProfiles.companyId, set: { ...input, updatedAt: new Date() } });
  await recordEvent(tx, { workspaceId: ws, type: 'company.billing_updated', subjectType: 'company', subjectId: companyId, actorId, payload: {} });
  await logActivity(tx, { workspaceId: ws, type: 'system', companyId, actorId, body: 'Billing details updated' });
}

/* ── drafts ───────────────────────────────────────────────────────────────── */

interface DraftInput {
  companyId: string;
  engagementId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  lines: InvoiceLine[];
  currency?: string;
  notes?: string | null;
}

async function insertDraft(tx: Tx, ws: WorkspaceId, d: DraftInput, actorId: string): Promise<string> {
  const [profile] = await tx.select().from(billingProfiles).where(eq(billingProfiles.companyId, d.companyId)).limit(1);
  const taxBps = profile?.taxBps ?? 0;
  const t = invoiceTotals(d.lines, 0, taxBps);
  const [row] = await tx.insert(invoices).values({
    workspaceId: ws,
    companyId: d.companyId,
    engagementId: d.engagementId ?? null,
    periodStart: d.periodStart ?? null,
    periodEnd: d.periodEnd ?? null,
    currency: d.currency ?? profile?.currency ?? 'USD',
    lines: d.lines,
    taxBps,
    subtotalCents: t.subtotal,
    discountCents: t.discount,
    taxCents: t.tax,
    totalCents: t.total,
    notes: d.notes ?? null,
    publicToken: token(),
    createdBy: actorId,
  }).returning({ id: invoices.id });
  await recordEvent(tx, { workspaceId: ws, type: 'invoice.created', subjectType: 'invoice', subjectId: row.id, actorId, payload: { companyId: d.companyId, engagementId: d.engagementId ?? null, periodStart: d.periodStart ?? null } });
  return row.id;
}

/** An empty draft for a company (from the company or customer page). */
export async function createBlankDraft(tx: Tx, ws: WorkspaceId, companyId: string, engagementId: string | null, actorId: string): Promise<string> {
  const [co] = await tx.select({ id: companies.id }).from(companies).where(and(eq(companies.workspaceId, ws), eq(companies.id, companyId))).limit(1);
  if (!co) fail('That company no longer exists.');
  let lines: InvoiceLine[] = [];
  let currency: string | undefined;
  if (engagementId) {
    const [e] = await tx.select().from(engagements).where(and(eq(engagements.workspaceId, ws), eq(engagements.id, engagementId), eq(engagements.companyId, companyId))).limit(1);
    if (!e) fail('That customer no longer exists.');
    if (e.monthlyValueCents > 0) lines = [{ description: e.service ?? e.title, quantity: 1, unitCents: e.monthlyValueCents }];
    currency = e.currency;
  }
  const id = await insertDraft(tx, ws, { companyId, engagementId, lines, currency }, actorId);
  await logActivity(tx, { workspaceId: ws, type: 'system', companyId, engagementId, actorId, body: 'Invoice drafted', meta: { invoiceId: id } });
  return id;
}

/* ── the monthly run ──────────────────────────────────────────────────────── */

export interface MonthlyCandidate {
  engagementId: string;
  title: string;
  service: string | null;
  companyId: string;
  companyName: string;
  monthlyValueCents: number;
  currency: string;
  status: string;
  /** Set when the month already has an invoice for this customer. */
  existingInvoiceId: string | null;
  existingNumber: string | null;
  hasBillingEmail: boolean;
}

/**
 * Who is billed for the month: every onboarding or active customer with a
 * company and a monthly fee. Customers whose month already has a (non-void)
 * invoice are listed with it, so the run never bills twice.
 */
export async function monthlyCandidates(ws: WorkspaceId, periodStart: string): Promise<MonthlyCandidate[]> {
  const rows = await getDb()
    .select({
      engagementId: engagements.id, title: engagements.title, service: engagements.service, companyId: companies.id, companyName: companies.name,
      monthlyValueCents: engagements.monthlyValueCents, currency: engagements.currency, status: engagements.status,
      existingInvoiceId: invoices.id, existingNumber: invoices.number, billingEmail: billingProfiles.billingEmail,
    })
    .from(engagements)
    .innerJoin(companies, eq(companies.id, engagements.companyId))
    .leftJoin(invoices, and(eq(invoices.engagementId, engagements.id), eq(invoices.periodStart, periodStart), ne(invoices.status, 'void')))
    .leftJoin(billingProfiles, eq(billingProfiles.companyId, companies.id))
    .where(and(
      eq(engagements.workspaceId, ws),
      inArray(engagements.status, ['onboarding', 'active']),
      isNull(engagements.archivedAt),
      sql`${engagements.monthlyValueCents} > 0`,
      sql`(${engagements.startDate} is null or ${engagements.startDate} <= ${monthPeriod(periodStart).end})`,
    ))
    .orderBy(asc(companies.name));
  return rows.map(({ billingEmail, ...r }) => ({ ...r, hasBillingEmail: Boolean(billingEmail) }));
}

/** Creates one draft per chosen customer for the month. Returns how many were made and skipped. */
export async function runMonthly(ws: WorkspaceId, periodStart: string, engagementIds: string[], actorId: string) {
  const period = monthPeriod(periodStart);
  const wanted = new Set(engagementIds);
  const candidates = (await monthlyCandidates(ws, period.start)).filter((c) => wanted.has(c.engagementId));
  let created = 0;
  let skipped = 0;
  for (const c of candidates) {
    if (c.existingInvoiceId) { skipped++; continue; }
    try {
      await getDb().transaction(async (tx) => {
        const id = await insertDraft(tx, ws, {
          companyId: c.companyId, engagementId: c.engagementId, periodStart: period.start, periodEnd: period.end, currency: c.currency,
          lines: [monthlyLine(c.service, c.title, period.label, c.monthlyValueCents)],
        }, actorId);
        await logActivity(tx, { workspaceId: ws, type: 'system', companyId: c.companyId, engagementId: c.engagementId, actorId, body: `Invoice for ${period.label} drafted`, meta: { invoiceId: id } });
      });
      created++;
    } catch (e) {
      /* Someone else drafted the same month a moment ago (unique index): not an error. */
      if (String((e as { code?: string })?.code ?? '') === '23505') { skipped++; continue; }
      throw e;
    }
  }
  return { created, skipped, label: period.label };
}

/* ── changing a draft ─────────────────────────────────────────────────────── */

export interface DraftChanges {
  lines: InvoiceLine[];
  discountBps: number;
  taxBps: number;
  notes: string | null;
  periodStart: string | null;
  periodEnd: string | null;
}

async function lockDraft(tx: Tx, ws: WorkspaceId, id: string) {
  const [inv] = await tx.select().from(invoices).where(and(eq(invoices.workspaceId, ws), eq(invoices.id, id))).for('update');
  if (!inv) fail('That invoice no longer exists.');
  if (inv.status !== 'draft') fail('This invoice has been issued, so it can no longer change. Use a credit note or void it.');
  return inv;
}

export async function updateDraft(tx: Tx, ws: WorkspaceId, id: string, c: DraftChanges) {
  await lockDraft(tx, ws, id);
  const t = invoiceTotals(c.lines, c.discountBps, c.taxBps);
  await tx.update(invoices).set({
    lines: c.lines, discountBps: c.discountBps, taxBps: c.taxBps, notes: c.notes, periodStart: c.periodStart, periodEnd: c.periodEnd,
    subtotalCents: t.subtotal, discountCents: t.discount, taxCents: t.tax, totalCents: t.total, updatedAt: new Date(),
  }).where(eq(invoices.id, id));
}

/** A draft was never sent to anyone, so it can simply go. */
export async function deleteDraft(tx: Tx, ws: WorkspaceId, id: string, actorId: string) {
  const inv = await lockDraft(tx, ws, id);
  await tx.delete(invoices).where(eq(invoices.id, id));
  await recordEvent(tx, { workspaceId: ws, type: 'invoice.deleted', subjectType: 'invoice', subjectId: id, actorId, payload: { companyId: inv.companyId } });
  return inv;
}

/* ── issuing ──────────────────────────────────────────────────────────────── */

/** The next number for the year. Locks the workspace row so two issues never share one. */
async function nextNumber(tx: Tx, ws: WorkspaceId, table: 'invoices' | 'credit_notes', prefix: string, year: number): Promise<string> {
  await tx.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, ws)).for('update');
  const like = `${prefix}-${year}-%`;
  const [{ n }] = table === 'invoices'
    ? await tx.select({ n: sql<number>`coalesce(max(substring(${invoices.number} from '[0-9]+$')::int), 0)` }).from(invoices)
      .where(and(eq(invoices.workspaceId, ws), sql`${invoices.number} like ${like}`))
    : await tx.select({ n: sql<number>`coalesce(max(substring(${creditNotes.number} from '[0-9]+$')::int), 0)` }).from(creditNotes)
      .where(and(eq(creditNotes.workspaceId, ws), sql`${creditNotes.number} like ${like}`));
  return documentNumber(prefix, year, Number(n) + 1);
}

/** Who the invoice is to, from the billing profile, falling back to the company and its primary contact. */
async function buyerFor(tx: Tx, companyId: string) {
  const [co] = await tx.select({ name: companies.name, country: companies.country }).from(companies).where(eq(companies.id, companyId)).limit(1);
  const [profile] = await tx.select().from(billingProfiles).where(eq(billingProfiles.companyId, companyId)).limit(1);
  const [contact] = await tx.select({ email: contacts.email }).from(contacts)
    .where(and(eq(contacts.companyId, companyId), isNull(contacts.archivedAt), sql`${contacts.email} is not null`))
    .orderBy(desc(contacts.isPrimary), asc(contacts.createdAt)).limit(1);
  return {
    name: profile?.legalName || co?.name || 'Customer',
    address: profile?.address || co?.country || null,
    taxId: profile?.taxId || null,
    email: profile?.billingEmail || contact?.email || null,
    termsDays: profile?.paymentTermsDays ?? null,
  };
}

export async function issueInvoice(tx: Tx, ws: WorkspaceId, id: string, actorId: string, issueDate = isoDay(new Date())) {
  const inv = await lockDraft(tx, ws, id);
  if (inv.lines.length === 0) fail('Add at least one line before issuing.');
  if (inv.totalCents <= 0) fail('Only an invoice with something to pay can be issued.');
  const billing = readBilling(await workspaceSettings(tx, ws));
  const buyer = await buyerFor(tx, inv.companyId);
  const parties: InvoiceParties = {
    seller: { name: billing.legalName, address: billing.address || null, taxId: billing.taxId || null, email: billing.email || null, bankDetails: billing.bankDetails || null },
    buyer: { name: buyer.name, address: buyer.address, taxId: buyer.taxId, email: buyer.email },
  };
  const number = await nextNumber(tx, ws, 'invoices', billing.invoicePrefix, Number(issueDate.slice(0, 4)));
  const dueDate = addDays(issueDate, buyer.termsDays ?? billing.paymentTermsDays);
  await tx.update(invoices).set({
    status: 'issued', number, parties, issueDate, dueDate, issuedAt: new Date(), issuedBy: actorId, updatedAt: new Date(),
  }).where(eq(invoices.id, id));
  await recordEvent(tx, { workspaceId: ws, type: 'invoice.issued', subjectType: 'invoice', subjectId: id, actorId, payload: { number, totalCents: inv.totalCents, dueDate } });
  await logActivity(tx, {
    workspaceId: ws, type: 'system', companyId: inv.companyId, engagementId: inv.engagementId, actorId,
    body: `Invoice ${number} issued, due ${dueDate}`, meta: { invoiceId: id },
  });
  return { number, companyId: inv.companyId, engagementId: inv.engagementId };
}

/* ── after issue: payments, credit notes, void ───────────────────────────── */

async function lockIssued(tx: Tx, ws: WorkspaceId, id: string) {
  const [inv] = await tx.select().from(invoices).where(and(eq(invoices.workspaceId, ws), eq(invoices.id, id))).for('update');
  if (!inv) fail('That invoice no longer exists.');
  return inv;
}

export async function recordPayment(tx: Tx, ws: WorkspaceId, id: string, p: { amountCents: number; receivedOn: string; method: PaymentMethod; reference: string | null }, actorId: string) {
  const inv = await lockIssued(tx, ws, id);
  if (!canSettle(inv.status)) fail('Only an issued, unpaid invoice can take a payment.');
  const open = balance(inv.totalCents, inv.paidCents, inv.creditedCents);
  if (p.amountCents > open) fail(`That is more than the ${(open / 100).toFixed(2)} still owed.`);
  await tx.insert(payments).values({ workspaceId: ws, invoiceId: id, amountCents: p.amountCents, receivedOn: p.receivedOn, method: p.method, reference: p.reference, recordedBy: actorId });
  const paid = inv.paidCents + p.amountCents;
  const status = settledStatus(inv.totalCents, paid, inv.creditedCents);
  await tx.update(invoices).set({ paidCents: paid, status, updatedAt: new Date() }).where(eq(invoices.id, id));
  await recordEvent(tx, { workspaceId: ws, type: 'invoice.payment_recorded', subjectType: 'invoice', subjectId: id, actorId, payload: { amountCents: p.amountCents, method: p.method, status } });
  await logActivity(tx, {
    workspaceId: ws, type: 'system', companyId: inv.companyId, engagementId: inv.engagementId, actorId,
    body: `Payment of ${(p.amountCents / 100).toFixed(2)} ${inv.currency} received for ${inv.number}${status === 'paid' ? ' — paid in full' : ''}`,
    meta: { invoiceId: id },
  });
  return inv;
}

export async function issueCreditNote(tx: Tx, ws: WorkspaceId, id: string, c: { amountCents: number; reason: string }, actorId: string) {
  const inv = await lockIssued(tx, ws, id);
  if (!canSettle(inv.status)) fail('Only an issued, unpaid invoice can be credited.');
  const open = balance(inv.totalCents, inv.paidCents, inv.creditedCents);
  if (c.amountCents > open) fail(`That is more than the ${(open / 100).toFixed(2)} still owed.`);
  const number = await nextNumber(tx, ws, 'credit_notes', 'CN', new Date().getUTCFullYear());
  await tx.insert(creditNotes).values({ workspaceId: ws, number, invoiceId: id, amountCents: c.amountCents, reason: c.reason, issuedBy: actorId });
  const credited = inv.creditedCents + c.amountCents;
  const status = settledStatus(inv.totalCents, inv.paidCents, credited);
  await tx.update(invoices).set({ creditedCents: credited, status, updatedAt: new Date() }).where(eq(invoices.id, id));
  await recordEvent(tx, { workspaceId: ws, type: 'invoice.credited', subjectType: 'invoice', subjectId: id, actorId, payload: { number, amountCents: c.amountCents } });
  await logActivity(tx, {
    workspaceId: ws, type: 'system', companyId: inv.companyId, engagementId: inv.engagementId, actorId,
    body: `Credit note ${number} for ${(c.amountCents / 100).toFixed(2)} ${inv.currency} against ${inv.number}: ${c.reason}`, meta: { invoiceId: id },
  });
  return inv;
}

/** Cancels an issued invoice that nothing has been paid or credited on. Its number stays used. */
export async function voidInvoice(tx: Tx, ws: WorkspaceId, id: string, reason: string, actorId: string) {
  const inv = await lockIssued(tx, ws, id);
  if (inv.status === 'draft') fail('This is still a draft: delete it instead.');
  if (inv.status === 'void') fail('This invoice is already void.');
  if (inv.paidCents > 0 || inv.creditedCents > 0) fail('This invoice has payments or credit notes. Credit the rest instead of voiding it.');
  await tx.update(invoices).set({ status: 'void', voidedAt: new Date(), voidReason: reason, updatedAt: new Date() }).where(eq(invoices.id, id));
  await recordEvent(tx, { workspaceId: ws, type: 'invoice.voided', subjectType: 'invoice', subjectId: id, actorId, payload: { reason } });
  await logActivity(tx, {
    workspaceId: ws, type: 'system', companyId: inv.companyId, engagementId: inv.engagementId, actorId,
    body: `Invoice ${inv.number} voided: ${reason}`, meta: { invoiceId: id },
  });
  return inv;
}

/* ── reads ────────────────────────────────────────────────────────────────── */

const listColumns = {
  id: invoices.id, number: invoices.number, status: invoices.status, companyId: invoices.companyId, companyName: companies.name,
  engagementId: invoices.engagementId, periodStart: invoices.periodStart, issueDate: invoices.issueDate, dueDate: invoices.dueDate,
  totalCents: invoices.totalCents, paidCents: invoices.paidCents, creditedCents: invoices.creditedCents, currency: invoices.currency,
  viewedAt: invoices.viewedAt, createdAt: invoices.createdAt,
};

export type InvoiceFilter = 'all' | 'draft' | 'open' | 'overdue' | 'paid' | 'void';

export async function listInvoices(ws: WorkspaceId, filter: InvoiceFilter, today: string, q?: string) {
  const where: SQL[] = [eq(invoices.workspaceId, ws)];
  if (filter === 'draft' || filter === 'paid' || filter === 'void') where.push(eq(invoices.status, filter));
  if (filter === 'open') where.push(inArray(invoices.status, ['issued', 'partially_paid']));
  if (filter === 'overdue') where.push(inArray(invoices.status, ['issued', 'partially_paid']), sql`${invoices.dueDate} < ${today}`);
  if (q) where.push(sql`(${invoices.number} ilike ${`%${q}%`} or ${companies.name} ilike ${`%${q}%`})`);
  return getDb().select(listColumns).from(invoices).innerJoin(companies, eq(companies.id, invoices.companyId))
    .where(and(...where))
    .orderBy(sql`${invoices.status} = 'draft' desc`, desc(sql`coalesce(${invoices.issueDate}, ${invoices.createdAt}::date)`), desc(invoices.number))
    .limit(500);
}

export async function invoicesForCompany(ws: WorkspaceId, companyId: string) {
  return getDb().select(listColumns).from(invoices).innerJoin(companies, eq(companies.id, invoices.companyId))
    .where(and(eq(invoices.workspaceId, ws), eq(invoices.companyId, companyId)))
    .orderBy(sql`${invoices.status} = 'draft' desc`, desc(sql`coalesce(${invoices.issueDate}, ${invoices.createdAt}::date)`)).limit(100);
}

export async function getInvoice(ws: WorkspaceId, id: string) {
  const db = getDb();
  const [row] = await db.select({ invoice: invoices, companyName: companies.name, engagementTitle: engagements.title })
    .from(invoices)
    .innerJoin(companies, eq(companies.id, invoices.companyId))
    .leftJoin(engagements, eq(engagements.id, invoices.engagementId))
    .where(and(eq(invoices.workspaceId, ws), eq(invoices.id, id))).limit(1);
  if (!row) return null;
  const [pays, credits] = await Promise.all([
    db.select({ p: payments, by: users.name }).from(payments).leftJoin(users, eq(users.id, payments.recordedBy))
      .where(eq(payments.invoiceId, id)).orderBy(asc(payments.receivedOn), asc(payments.createdAt)),
    db.select({ c: creditNotes, by: users.name }).from(creditNotes).leftJoin(users, eq(users.id, creditNotes.issuedBy))
      .where(eq(creditNotes.invoiceId, id)).orderBy(asc(creditNotes.createdAt)),
  ]);
  return { ...row, payments: pays, creditNotes: credits };
}

/** Who a draft would be addressed to, for the preview before issue. */
export async function previewParties(ws: WorkspaceId, companyId: string): Promise<InvoiceParties> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const billing = readBilling(await workspaceSettings(tx, ws));
    const buyer = await buyerFor(tx, companyId);
    return {
      seller: { name: billing.legalName, address: billing.address || null, taxId: billing.taxId || null, email: billing.email || null, bankDetails: billing.bankDetails || null },
      buyer: { name: buyer.name, address: buyer.address, taxId: buyer.taxId, email: buyer.email },
    };
  });
}

export interface ReceivablesSummary {
  outstandingCents: number;
  overdueCents: number;
  overdueCount: number;
  openCount: number;
  draftCount: number;
  ageing: Record<AgeingBucket, number>;
  invoicedThisMonthCents: number;
  collectedThisMonthCents: number;
}

/** What is owed and how late, plus this month's invoicing and collections. Amounts in the workspace's main currency. */
export async function receivablesSummary(ws: WorkspaceId, today: string): Promise<ReceivablesSummary> {
  const db = getDb();
  const month = monthPeriod(today);
  const [open, drafts, invoiced, collected] = await Promise.all([
    db.select({ dueDate: invoices.dueDate, total: invoices.totalCents, paid: invoices.paidCents, credited: invoices.creditedCents })
      .from(invoices).where(and(eq(invoices.workspaceId, ws), inArray(invoices.status, ['issued', 'partially_paid']))),
    db.select({ n: sql<number>`count(*)::int` }).from(invoices).where(and(eq(invoices.workspaceId, ws), eq(invoices.status, 'draft'))),
    db.select({ n: sql<number>`coalesce(sum(${invoices.totalCents}), 0)::int` }).from(invoices)
      .where(and(eq(invoices.workspaceId, ws), ne(invoices.status, 'draft'), ne(invoices.status, 'void'), gte(invoices.issueDate, month.start), lte(invoices.issueDate, month.end))),
    db.select({ n: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` }).from(payments)
      .where(and(eq(payments.workspaceId, ws), gte(payments.receivedOn, month.start), lte(payments.receivedOn, month.end))),
  ]);
  const ageing = Object.fromEntries(AGEING.map((b) => [b, 0])) as Record<AgeingBucket, number>;
  let outstanding = 0, overdue = 0, overdueCount = 0;
  for (const r of open) {
    const owed = balance(r.total, r.paid, r.credited);
    outstanding += owed;
    const bucket = r.dueDate ? ageingBucket(r.dueDate, today) : 'current';
    ageing[bucket] += owed;
    if (bucket !== 'current') { overdue += owed; overdueCount++; }
  }
  return {
    outstandingCents: outstanding, overdueCents: overdue, overdueCount, openCount: open.length, draftCount: drafts[0]?.n ?? 0,
    ageing, invoicedThisMonthCents: invoiced[0]?.n ?? 0, collectedThisMonthCents: collected[0]?.n ?? 0,
  };
}

/** Unpaid invoices past their due date, oldest first — for the daily digest. */
export async function overdueInvoices(ws: WorkspaceId, today: string, limit = 10) {
  return getDb().select(listColumns).from(invoices).innerJoin(companies, eq(companies.id, invoices.companyId))
    .where(and(eq(invoices.workspaceId, ws), inArray(invoices.status, ['issued', 'partially_paid']), sql`${invoices.dueDate} < ${today}`))
    .orderBy(asc(invoices.dueDate)).limit(limit);
}

/** Invoiced (by issue date) and collected (by payment date) per month, for the last `months` months. */
export async function invoicedVsCollected(ws: WorkspaceId, today: string, months = 6) {
  const db = getDb();
  const [y, m] = today.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1 - (months - 1), 1)).toISOString().slice(0, 10);
  const [inv, col] = await Promise.all([
    db.select({ m: sql<string>`to_char(${invoices.issueDate}, 'YYYY-MM')`, n: sql<number>`sum(${invoices.totalCents})::int` }).from(invoices)
      .where(and(eq(invoices.workspaceId, ws), ne(invoices.status, 'draft'), ne(invoices.status, 'void'), gte(invoices.issueDate, from)))
      .groupBy(sql`1`),
    db.select({ m: sql<string>`to_char(${payments.receivedOn}, 'YYYY-MM')`, n: sql<number>`sum(${payments.amountCents})::int` }).from(payments)
      .where(and(eq(payments.workspaceId, ws), gte(payments.receivedOn, from)))
      .groupBy(sql`1`),
  ]);
  const out: Array<{ month: string; label: string; invoicedCents: number; collectedCents: number }> = [];
  let cursor = from;
  for (let i = 0; i < months; i++) {
    const p = monthPeriod(cursor);
    const key = p.start.slice(0, 7);
    out.push({ month: key, label: p.label, invoicedCents: inv.find((r) => r.m === key)?.n ?? 0, collectedCents: col.find((r) => r.m === key)?.n ?? 0 });
    cursor = addDays(p.end, 1);
  }
  return out;
}

/* ── the client side (/i/<token>) ─────────────────────────────────────────── */

export async function invoiceByToken(tok: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(tok)) return null;
  const [row] = await getDb().select().from(invoices).where(eq(invoices.publicToken, tok)).limit(1);
  /* A draft is not shared yet. */
  return row && row.status !== 'draft' ? row : null;
}

/** First open by the client. */
export async function markInvoiceViewed(tok: string) {
  await getDb().transaction(async (tx) => {
    const [inv] = await tx.select().from(invoices).where(eq(invoices.publicToken, tok)).for('update');
    if (!inv || inv.status === 'draft' || inv.viewedAt) return;
    await tx.update(invoices).set({ viewedAt: new Date() }).where(eq(invoices.id, inv.id));
    await recordEvent(tx, { workspaceId: inv.workspaceId, type: 'invoice.viewed', subjectType: 'invoice', subjectId: inv.id, payload: {} });
    await logActivity(tx, { workspaceId: inv.workspaceId, type: 'system', companyId: inv.companyId, engagementId: inv.engagementId, body: `The client opened invoice ${inv.number}`, meta: { invoiceId: inv.id } });
  });
}

export type InvoiceRow = typeof invoices.$inferSelect;
export type { InvoiceStatus, InvoiceLineRow };
