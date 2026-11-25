'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, isDatabaseConfigured } from '@/db';
import { invoices, workspaces } from '@/db/schema';
import { assertUser } from '@/lib/auth/require';
import { canEditLeads, canManageCrmSettings } from '@/lib/auth/roles';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { isoDay } from '@/lib/crm/engagements';
import { BillingSettings, InvoiceLine, PAYMENT_METHODS, monthPeriod, percentToBps } from '@/lib/crm/invoices';
import {
  createBlankDraft, deleteDraft, issueCreditNote, issueInvoice, recordPayment, runMonthly, saveBillingProfile, updateDraft, voidInvoice,
} from '@/lib/crm/invoicesData';
import { parseMoneyToCents } from '@/lib/crm/money';
import type { ActionResult } from '../leads/[id]/actions';

/**
 * Invoice writes. Server actions are not covered by the layout's gate, so
 * each re-checks the session and role. Drafting, issuing and recording
 * payments is for anyone who edits the CRM; credit notes, voids and the
 * billing settings are for admins.
 */

const UUID = /^[0-9a-f-]{36}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

async function editor() {
  const user = await assertUser();
  if (!canEditLeads(user.role)) throw new Error('forbidden');
  if (!isDatabaseConfigured()) throw new Error('database unavailable');
  return user;
}

async function admin() {
  const user = await assertUser();
  if (!canManageCrmSettings(user.role)) throw new Error('forbidden');
  if (!isDatabaseConfigured()) throw new Error('database unavailable');
  return user;
}

const ok = (): ActionResult => ({ ok: true, at: Date.now() });

function msg(e: unknown, fallback: string): ActionResult {
  return { ok: false, error: e instanceof Error && /^(This|That|Add|Only|Every|Give|Choose|The)/.test(e.message) ? e.message : fallback };
}

async function refresh(id: string) {
  const [inv] = await getDb().select({ companyId: invoices.companyId, engagementId: invoices.engagementId }).from(invoices).where(eq(invoices.id, id));
  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath('/admin/invoices');
  if (inv?.companyId) revalidatePath(`/admin/companies/${inv.companyId}`);
  if (inv?.engagementId) revalidatePath(`/admin/customers/${inv.engagementId}`);
}

const str = (fd: FormData, k: string) => (typeof fd.get(k) === 'string' ? (fd.get(k) as string).trim() : '');

/* ── drafts ───────────────────────────────────────────────────────────────── */

export async function newInvoice(companyId: string, engagementId: string | null): Promise<void> {
  const user = await editor();
  if (!UUID.test(companyId) || (engagementId && !UUID.test(engagementId))) throw new Error('bad id');
  const id = await getDb().transaction((tx) => createBlankDraft(tx, currentWorkspaceId(), companyId, engagementId, user.id));
  redirect(`/admin/invoices/${id}`);
}

export async function saveInvoice(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await editor();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown invoice.' };
  let raw: unknown;
  try { raw = JSON.parse(str(fd, 'lines') || '[]'); } catch { return { ok: false, error: 'The lines could not be read. Reload and try again.' }; }
  const lines = z.array(InvoiceLine).max(50, 'Keep it to 50 lines.').safeParse(raw);
  if (!lines.success) return { ok: false, error: lines.error.issues[0].message };
  const discountBps = percentToBps(str(fd, 'discount'));
  const taxBps = percentToBps(str(fd, 'tax'));
  if (discountBps === null || taxBps === null) return { ok: false, error: 'Discount and tax must be percentages between 0 and 100.' };
  const periodStart = str(fd, 'periodStart');
  const periodEnd = str(fd, 'periodEnd');
  if ((periodStart && !DAY.test(periodStart)) || (periodEnd && !DAY.test(periodEnd))) return { ok: false, error: 'The service period dates are not valid.' };
  if (periodStart && periodEnd && periodEnd < periodStart) return { ok: false, error: 'The service period ends before it starts.' };
  const notes = str(fd, 'notes').slice(0, 4000) || null;
  try {
    await getDb().transaction((tx) => updateDraft(tx, currentWorkspaceId(), id, {
      lines: lines.data, discountBps, taxBps, notes, periodStart: periodStart || null, periodEnd: periodEnd || null,
    }));
  } catch (e) {
    if (String((e as { code?: string })?.code) === '23505') return { ok: false, error: 'This customer already has an invoice for that month.' };
    return msg(e, 'Could not save the invoice.');
  }
  await refresh(id);
  return ok();
}

export async function issueInvoiceAction(id: string): Promise<ActionResult> {
  const user = await editor();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown invoice.' };
  try {
    await getDb().transaction((tx) => issueInvoice(tx, currentWorkspaceId(), id, user.id));
  } catch (e) {
    return msg(e, 'Could not issue the invoice.');
  }
  await refresh(id);
  return ok();
}

export async function deleteInvoiceDraft(id: string): Promise<ActionResult> {
  const user = await editor();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown invoice.' };
  try {
    await getDb().transaction((tx) => deleteDraft(tx, currentWorkspaceId(), id, user.id));
  } catch (e) {
    return msg(e, 'Could not delete the draft.');
  }
  revalidatePath('/admin/invoices');
  redirect('/admin/invoices');
}

/* ── after issue ──────────────────────────────────────────────────────────── */

export async function recordPaymentAction(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await editor();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown invoice.' };
  const amountCents = parseMoneyToCents(str(fd, 'amount'));
  if (!amountCents || amountCents <= 0) return { ok: false, error: 'Enter the amount received.' };
  const receivedOn = str(fd, 'receivedOn') || isoDay(new Date());
  if (!DAY.test(receivedOn) || receivedOn > isoDay(new Date())) return { ok: false, error: 'The date received cannot be in the future.' };
  const method = z.enum(PAYMENT_METHODS).safeParse(str(fd, 'method'));
  if (!method.success) return { ok: false, error: 'Choose how it was paid.' };
  try {
    await getDb().transaction((tx) => recordPayment(tx, currentWorkspaceId(), id, {
      amountCents, receivedOn, method: method.data, reference: str(fd, 'reference').slice(0, 200) || null,
    }, user.id));
  } catch (e) {
    return msg(e, 'Could not record the payment.');
  }
  await refresh(id);
  return ok();
}

export async function creditNoteAction(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await admin();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown invoice.' };
  const amountCents = parseMoneyToCents(str(fd, 'amount'));
  if (!amountCents || amountCents <= 0) return { ok: false, error: 'Enter the amount to credit.' };
  const reason = str(fd, 'reason').slice(0, 500);
  if (!reason) return { ok: false, error: 'Give the reason; it is printed on the invoice.' };
  try {
    await getDb().transaction((tx) => issueCreditNote(tx, currentWorkspaceId(), id, { amountCents, reason }, user.id));
  } catch (e) {
    return msg(e, 'Could not issue the credit note.');
  }
  await refresh(id);
  return ok();
}

export async function voidInvoiceAction(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await admin();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown invoice.' };
  const reason = str(fd, 'reason').slice(0, 500);
  if (!reason) return { ok: false, error: 'Give the reason for voiding it.' };
  try {
    await getDb().transaction((tx) => voidInvoice(tx, currentWorkspaceId(), id, reason, user.id));
  } catch (e) {
    return msg(e, 'Could not void the invoice.');
  }
  await refresh(id);
  return ok();
}

/* ── the monthly run ──────────────────────────────────────────────────────── */

export async function runMonthlyAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await editor();
  const period = str(fd, 'period');
  if (!/^\d{4}-\d{2}$/.test(period)) return { ok: false, error: 'Choose the month.' };
  const ids = fd.getAll('engagement').map(String).filter((x) => UUID.test(x));
  if (ids.length === 0) return { ok: false, error: 'Tick at least one customer.' };
  const res = await runMonthly(currentWorkspaceId(), monthPeriod(`${period}-01`).start, ids, user.id);
  revalidatePath('/admin/invoices');
  revalidatePath('/admin/invoices/run');
  if (res.created === 0) return { ok: false, error: `No new drafts: every customer ticked already has an invoice for ${res.label}.` };
  redirect('/admin/invoices?filter=draft');
}

/* ── billing details ──────────────────────────────────────────────────────── */

const Profile = z.object({
  legalName: z.string().max(200),
  billingEmail: z.union([z.literal(''), z.string().toLowerCase().email('The billing email is not valid.')]),
  address: z.string().max(1000),
  taxId: z.string().max(100),
  currency: z.string().regex(/^[A-Z]{3}$/, 'The currency is a 3-letter code such as USD.'),
  paymentTermsDays: z.number().int().min(0, 'Payment terms are 0 to 365 days.').max(365, 'Payment terms are 0 to 365 days.'),
  notes: z.string().max(2000),
});

export async function saveBillingProfileAction(companyId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await editor();
  if (!UUID.test(companyId)) return { ok: false, error: 'Unknown company.' };
  const parsed = Profile.safeParse({
    legalName: str(fd, 'legalName'), billingEmail: str(fd, 'billingEmail'), address: str(fd, 'address'), taxId: str(fd, 'taxId'),
    currency: (str(fd, 'currency') || 'USD').toUpperCase(), paymentTermsDays: Number(str(fd, 'paymentTermsDays') || 15), notes: str(fd, 'notes'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const taxBps = percentToBps(str(fd, 'tax'));
  if (taxBps === null) return { ok: false, error: 'Tax must be a percentage between 0 and 100.' };
  const d = parsed.data;
  try {
    await getDb().transaction((tx) => saveBillingProfile(tx, currentWorkspaceId(), companyId, {
      legalName: d.legalName || null, billingEmail: d.billingEmail || null, address: d.address || null, taxId: d.taxId || null,
      currency: d.currency, paymentTermsDays: d.paymentTermsDays, taxBps, notes: d.notes || null,
    }, user.id));
  } catch (e) {
    return msg(e, 'Could not save the billing details.');
  }
  revalidatePath(`/admin/companies/${companyId}`);
  revalidatePath('/admin/customers', 'layout');
  return ok();
}

export async function saveBillingSettings(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await admin();
  const parsed = BillingSettings.safeParse({
    legalName: str(fd, 'legalName') || 'Rem Assist', address: str(fd, 'address'), taxId: str(fd, 'taxId'), email: str(fd, 'email'),
    bankDetails: str(fd, 'bankDetails'), paymentTermsDays: Number(str(fd, 'paymentTermsDays') || 15),
    invoicePrefix: (str(fd, 'invoicePrefix') || 'INV').toUpperCase(), footer: str(fd, 'footer'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const ws = currentWorkspaceId();
  await getDb().transaction(async (tx) => {
    const [w] = await tx.select({ settings: workspaces.settings }).from(workspaces).where(eq(workspaces.id, ws)).for('update');
    await tx.update(workspaces).set({ settings: { ...(w?.settings ?? {}), billing: parsed.data } }).where(and(eq(workspaces.id, ws)));
  });
  revalidatePath('/admin/settings/crm');
  return ok();
}
