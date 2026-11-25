import { z } from 'zod';
import { daysBetween } from './engagements';

/**
 * Invoice rules — pure and unit-tested. Money is integer cents. An issued
 * invoice never changes: corrections are credit notes, cancellations are a
 * void. Reads and writes are in invoicesData.ts.
 */

export const INVOICE_STATUSES = ['draft', 'issued', 'partially_paid', 'paid', 'void'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus | 'overdue', string> = {
  draft: 'Draft', issued: 'Issued', partially_paid: 'Part paid', paid: 'Paid', void: 'Void', overdue: 'Overdue',
};

export const PAYMENT_METHODS = ['bank_transfer', 'card', 'cash', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: 'Bank transfer', card: 'Card', cash: 'Cash', other: 'Other',
};

export const InvoiceLine = z.object({
  description: z.string().trim().min(1, 'Every line needs a description.').max(300),
  quantity: z.number().min(0).max(100_000),
  unitCents: z.number().int().min(0).max(1_000_000_000),
});
export type InvoiceLine = z.infer<typeof InvoiceLine>;

export function lineTotal(l: InvoiceLine): number {
  return Math.round(l.quantity * l.unitCents);
}

export interface InvoiceTotals { subtotal: number; discount: number; tax: number; total: number }

/** Discount first, then tax on what is left. Both in basis points (1000 = 10%). */
export function invoiceTotals(lines: InvoiceLine[], discountBps: number, taxBps: number): InvoiceTotals {
  const clamp = (b: number) => Math.max(0, Math.min(10_000, Math.round(b)));
  const subtotal = lines.reduce((n, l) => n + lineTotal(l), 0);
  const discount = Math.round((subtotal * clamp(discountBps)) / 10_000);
  const tax = Math.round(((subtotal - discount) * clamp(taxBps)) / 10_000);
  return { subtotal, discount, tax, total: subtotal - discount + tax };
}

export function balance(total: number, paid: number, credited: number): number {
  return Math.max(0, total - paid - credited);
}

/** The stored status after a payment or credit note. */
export function settledStatus(total: number, paid: number, credited: number): InvoiceStatus {
  if (balance(total, paid, credited) === 0) return 'paid';
  return paid + credited > 0 ? 'partially_paid' : 'issued';
}

/** What to show: an unpaid invoice past its due date is Overdue. */
export function displayStatus(status: InvoiceStatus, dueDate: string | null, today: string): InvoiceStatus | 'overdue' {
  if ((status === 'issued' || status === 'partially_paid') && dueDate && dueDate < today) return 'overdue';
  return status;
}

export const AGEING = ['current', '1-30', '31-60', '61-90', '90+'] as const;
export type AgeingBucket = (typeof AGEING)[number];
export const AGEING_LABELS: Record<AgeingBucket, string> = {
  current: 'Not yet due', '1-30': '1–30 days late', '31-60': '31–60 days late', '61-90': '61–90 days late', '90+': 'Over 90 days late',
};

export function ageingBucket(dueDate: string, today: string): AgeingBucket {
  const late = daysBetween(dueDate, today);
  if (late <= 0) return 'current';
  if (late <= 30) return '1-30';
  if (late <= 60) return '31-60';
  if (late <= 90) return '61-90';
  return '90+';
}

/** The calendar month containing `day`: first and last dates, and a label. */
export function monthPeriod(day: string): { start: string; end: string; label: string } {
  const [y, m] = day.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return { start, end, label };
}

/** The first day of the month after `day` (YYYY-MM-01). */
export function nextMonthStart(day: string): string {
  const [y, m] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** "INV-2026-0042" / "CN-2026-0003". */
export function documentNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}

/* ── billing settings (stored on the workspace row: settings.billing) ────── */

export const BillingSettings = z.object({
  /** The seller, as printed on every invoice. */
  legalName: z.string().trim().max(200).default('Rem Assist'),
  address: z.string().trim().max(1000).default(''),
  taxId: z.string().trim().max(100).default(''),
  email: z.string().trim().max(200).default(''),
  /** How to pay: bank name, account, SWIFT — printed at the foot of the invoice. */
  bankDetails: z.string().trim().max(2000).default(''),
  /** Default days to pay, used when a customer has no billing profile. */
  paymentTermsDays: z.number().int().min(0).max(365).default(15),
  invoicePrefix: z.string().trim().regex(/^[A-Z0-9]{1,8}$/, 'The prefix is 1 to 8 capital letters or digits.').default('INV'),
  /** Printed under the totals on every invoice. */
  footer: z.string().trim().max(2000).default(''),
});
export type BillingSettings = z.infer<typeof BillingSettings>;

export function readBilling(settings: Record<string, unknown> | null | undefined): BillingSettings {
  const parsed = BillingSettings.safeParse(settings?.billing ?? {});
  return parsed.success ? parsed.data : BillingSettings.parse({});
}

/** "15" or "7.5" (%) → basis points; null if not a percentage. Empty is 0. */
export function percentToBps(v: string | null | undefined): number | null {
  const t = (v ?? '').trim().replace('%', '');
  if (t === '') return 0;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100);
}

/** What can still be recorded against an issued invoice. */
export function canSettle(status: InvoiceStatus): boolean {
  return status === 'issued' || status === 'partially_paid';
}

/** The monthly line for an engagement: one line for the month at the agreed fee. */
export function monthlyLine(service: string | null, title: string, periodLabel: string, monthlyCents: number): InvoiceLine {
  return { description: `${service ?? title} — ${periodLabel}`, quantity: 1, unitCents: monthlyCents };
}
