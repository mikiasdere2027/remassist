'use client';

import { useActionState, useMemo, useState, useTransition, type ReactNode } from 'react';
import type { InvoiceLineRow } from '@/db/schema/crm';
import { formatMoney, parseMoneyToCents } from '@/lib/crm/money';
import { invoiceTotals, lineTotal, percentToBps, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type InvoiceLine } from '@/lib/crm/invoices';
import type { ActionResult } from '../leads/[id]/actions';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

type FormAction = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

function Status({ state, pending, okText = 'Saved' }: { state: ActionResult | null; pending: boolean; okText?: string }) {
  if (pending) return <span className={s.saving}>Saving…</span>;
  if (!state) return null;
  return state.ok ? <span className={s.saving} role="status">{okText}</span> : <span className={s.error} role="alert">{state.error}</span>;
}

/* ── the draft editor ─────────────────────────────────────────────────────── */

interface DraftLine { description: string; quantity: string; unit: string }

const toDraft = (l: InvoiceLineRow): DraftLine => ({ description: l.description, quantity: String(l.quantity), unit: String(l.unitCents / 100) });
const toLine = (d: DraftLine): InvoiceLine => ({
  description: d.description.trim(),
  quantity: Math.max(0, Number(d.quantity) || 0),
  unitCents: parseMoneyToCents(d.unit) ?? 0,
});

export function InvoiceEditor({ action, values }: {
  action: FormAction;
  values: { lines: InvoiceLineRow[]; discount: string; tax: string; notes: string; periodStart: string; periodEnd: string; currency: string };
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [lines, setLines] = useState<DraftLine[]>(values.lines.map(toDraft));
  const [discount, setDiscount] = useState(values.discount);
  const [tax, setTax] = useState(values.tax);
  const parsed = useMemo(() => lines.map(toLine), [lines]);
  const dBps = percentToBps(discount);
  const tBps = percentToBps(tax);
  const t = invoiceTotals(parsed, dBps ?? 0, tBps ?? 0);
  const money = (c: number) => formatMoney(c, values.currency);
  const update = (i: number, patch: Partial<DraftLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <form action={formAction} className={s.cardBody}>
      <input type="hidden" name="lines" value={JSON.stringify(parsed)} />
      <div className={s.fieldGrid}>
        <div>
          <label className={s.label} htmlFor="i-ps">Service period from</label>
          <input id="i-ps" name="periodStart" type="date" className={s.input} defaultValue={values.periodStart} />
        </div>
        <div>
          <label className={s.label} htmlFor="i-pe">to</label>
          <input id="i-pe" name="periodEnd" type="date" className={s.input} defaultValue={values.periodEnd} />
        </div>
      </div>

      <h3 className={s.sectionTitle}>Lines</h3>
      <div className={s.lineList}>
        {lines.map((l, i) => (
          <fieldset key={i} className={`${s.lineRow} ${s.invLine}`}>
            <legend className={s.srOnlyLegend}>Line {i + 1}</legend>
            <input aria-label={`Line ${i + 1} description`} className={s.input} value={l.description} maxLength={300}
              onChange={(e) => update(i, { description: e.target.value })} placeholder="e.g. Customer support team — December 2026" />
            <label className={s.miniField}>Qty<input className={s.input} inputMode="decimal" value={l.quantity} onChange={(e) => update(i, { quantity: e.target.value })} /></label>
            <label className={s.miniField}>Unit $<input className={s.input} inputMode="decimal" value={l.unit} onChange={(e) => update(i, { unit: e.target.value })} /></label>
            <b className={s.lineTotal}>{money(lineTotal(parsed[i]))}</b>
            <button type="button" className={s.doneToggle} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label={`Remove line ${i + 1}`}>Remove</button>
          </fieldset>
        ))}
        {lines.length === 0 && <p className={s.cardNote}>No lines yet.</p>}
      </div>
      <div className={s.formFoot}>
        <button type="button" className={`${admin.btn} ${admin.btnGhost}`} disabled={lines.length >= 50}
          onClick={() => setLines((ls) => [...ls, { description: '', quantity: '1', unit: '' }])}>
          Add line
        </button>
      </div>

      <div className={s.totalsBox} aria-live="polite">
        <div><span>Subtotal</span><b>{money(t.subtotal)}</b></div>
        <div>
          <label htmlFor="i-discount">Discount (%)</label>
          <input id="i-discount" name="discount" className={`${s.input} ${s.tinyInput}`} inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          <b>{t.discount ? `−${money(t.discount)}` : '—'}</b>
        </div>
        <div>
          <label htmlFor="i-tax">Tax (%)</label>
          <input id="i-tax" name="tax" className={`${s.input} ${s.tinyInput}`} inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} />
          <b>{t.tax ? money(t.tax) : '—'}</b>
        </div>
        {(dBps === null || tBps === null) && <p className={s.error} role="alert">Discount and tax must be between 0 and 100%.</p>}
        <div className={s.totalsMain}><span>Total</span><b>{money(t.total)}</b></div>
      </div>

      <div>
        <label className={s.label} htmlFor="i-notes">Note on the invoice</label>
        <textarea id="i-notes" name="notes" className={s.textarea} maxLength={4000} defaultValue={values.notes}
          placeholder="Optional. e.g. Thank you for your business. Hours above the plan are billed next month." />
      </div>
      <div className={s.formFoot}>
        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending || dBps === null || tBps === null}>Save draft</button>
        <Status state={state} pending={pending} />
      </div>
    </form>
  );
}

/* ── draft / issued actions on the right ─────────────────────────────────── */

export function InvoiceActions({ status, link, issue, remove }: {
  status: string;
  link: string;
  issue: () => Promise<ActionResult>;
  remove: () => Promise<ActionResult>;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>, okText: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      setErr(null); setMsg(null);
      const r = await fn().catch((e) => (e?.digest?.startsWith?.('NEXT_REDIRECT') ? { ok: true as const, at: 0 } : { ok: false as const, error: 'Something went wrong. Try again.' }));
      if (r.ok) setMsg(okText); else setErr(r.error);
    });
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setMsg('Link copied'); } catch { setErr('Copy the link from the box below.'); }
  };
  return (
    <div className={s.cardBody}>
      {status === 'draft' && (
        <>
          <button type="button" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending}
            onClick={() => run(issue, 'Issued', 'Issue this invoice? It gets the next number and can no longer be edited.')}>
            Issue invoice
          </button>
          <p className={s.cardNote}>Save your changes first. Issuing gives it a number, sets the due date and freezes it.</p>
          <button type="button" className={`${admin.btn} ${admin.btnGhost}`} disabled={pending}
            onClick={() => run(remove, 'Deleted', 'Delete this draft?')}>
            Delete draft
          </button>
        </>
      )}
      {status !== 'draft' && (
        <div>
          <label className={s.label} htmlFor="i-link">Client link</label>
          <input id="i-link" className={s.input} readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className={s.doneToggle} onClick={copy}>Copy link</button>
          <p className={s.cardNote}>Send this with your email. The client can view and print it; it shows what is still owed.</p>
        </div>
      )}
      {msg && <span className={s.saving} role="status">{msg}</span>}
      {err && <span className={s.error} role="alert">{err}</span>}
    </div>
  );
}

/* ── payments, credit notes, void ────────────────────────────────────────── */

export function PaymentForm({ action, owed, today }: { action: FormAction; owed: string; today: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={s.cardBody}>
      <div className={s.fieldGrid}>
        <div>
          <label className={s.label} htmlFor="pay-amount">Amount $</label>
          <input id="pay-amount" name="amount" className={s.input} inputMode="decimal" defaultValue={owed} required />
        </div>
        <div>
          <label className={s.label} htmlFor="pay-on">Received on</label>
          <input id="pay-on" name="receivedOn" type="date" className={s.input} defaultValue={today} max={today} required />
        </div>
        <div>
          <label className={s.label} htmlFor="pay-method">Method</label>
          <select id="pay-method" name="method" className={s.select} defaultValue="bank_transfer">
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
          </select>
        </div>
        <div>
          <label className={s.label} htmlFor="pay-ref">Reference</label>
          <input id="pay-ref" name="reference" className={s.input} maxLength={200} placeholder="Bank reference" />
        </div>
      </div>
      <div className={s.formFoot}>
        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending}>Record payment</button>
        <Status state={state} pending={pending} okText="Payment recorded" />
      </div>
    </form>
  );
}

export function ReasonAmountForm({ action, label, submit, withAmount, okText, confirmText }: {
  action: FormAction; label: string; submit: string; withAmount: boolean; okText: string; confirmText?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={s.cardBody} onSubmit={(e) => { if (confirmText && !window.confirm(confirmText)) e.preventDefault(); }}>
      <div className={s.fieldGrid}>
        {withAmount && (
          <div>
            <label className={s.label} htmlFor={`${submit}-amount`}>Amount $</label>
            <input id={`${submit}-amount`} name="amount" className={s.input} inputMode="decimal" required />
          </div>
        )}
        <div className={withAmount ? undefined : s.fieldWide}>
          <label className={s.label} htmlFor={`${submit}-reason`}>{label}</label>
          <input id={`${submit}-reason`} name="reason" className={s.input} maxLength={500} required />
        </div>
      </div>
      <div className={s.formFoot}>
        <button type="submit" className={`${admin.btn} ${admin.btnGhost}`} disabled={pending}>{submit}</button>
        <Status state={state} pending={pending} okText={okText} />
      </div>
    </form>
  );
}

/* ── the monthly run ──────────────────────────────────────────────────────── */

export function RunForm({ action, period, children, disabled }: { action: FormAction; period: string; children: ReactNode; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={s.cardBody}>
      <input type="hidden" name="period" value={period} />
      {children}
      <div className={s.formFoot}>
        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending || disabled}>Create drafts</button>
        <Status state={state} pending={pending} okText="Done" />
      </div>
    </form>
  );
}

/* ── billing details (company) and billing settings (workspace) ──────────── */

export function BillingProfileForm({ action, values }: {
  action: FormAction;
  values: { legalName: string; billingEmail: string; address: string; taxId: string; currency: string; paymentTermsDays: number; tax: string; notes: string };
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={s.cardBody}>
      <div className={s.fieldGrid}>
        <div>
          <label className={s.label} htmlFor="b-legal">Legal name on invoices</label>
          <input id="b-legal" name="legalName" className={s.input} maxLength={200} defaultValue={values.legalName} placeholder="Defaults to the company name" />
        </div>
        <div>
          <label className={s.label} htmlFor="b-email">Billing email</label>
          <input id="b-email" name="billingEmail" type="email" className={s.input} maxLength={200} defaultValue={values.billingEmail} placeholder="accounts@client.com" />
        </div>
        <div className={s.fieldWide}>
          <label className={s.label} htmlFor="b-address">Billing address</label>
          <textarea id="b-address" name="address" className={s.textarea} rows={3} maxLength={1000} defaultValue={values.address} />
        </div>
        <div>
          <label className={s.label} htmlFor="b-tax-id">Tax / VAT number</label>
          <input id="b-tax-id" name="taxId" className={s.input} maxLength={100} defaultValue={values.taxId} />
        </div>
        <div>
          <label className={s.label} htmlFor="b-currency">Currency</label>
          <input id="b-currency" name="currency" className={s.input} maxLength={3} defaultValue={values.currency} />
        </div>
        <div>
          <label className={s.label} htmlFor="b-terms">Days to pay</label>
          <input id="b-terms" name="paymentTermsDays" type="number" min={0} max={365} className={s.input} defaultValue={values.paymentTermsDays} />
        </div>
        <div>
          <label className={s.label} htmlFor="b-tax">Tax on invoices (%)</label>
          <input id="b-tax" name="tax" className={s.input} inputMode="decimal" defaultValue={values.tax} />
        </div>
        <div className={s.fieldWide}>
          <label className={s.label} htmlFor="b-notes">Billing notes (internal)</label>
          <textarea id="b-notes" name="notes" className={s.textarea} rows={2} maxLength={2000} defaultValue={values.notes} placeholder="e.g. PO number required on every invoice" />
        </div>
      </div>
      <div className={s.formFoot}>
        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending}>Save billing details</button>
        <Status state={state} pending={pending} />
      </div>
    </form>
  );
}

export function BillingSettingsForm({ action, values }: {
  action: FormAction;
  values: { legalName: string; address: string; taxId: string; email: string; bankDetails: string; paymentTermsDays: number; invoicePrefix: string; footer: string };
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={s.cardBody}>
      <div className={s.fieldGrid}>
        <div>
          <label className={s.label} htmlFor="ws-legal">Your legal name</label>
          <input id="ws-legal" name="legalName" className={s.input} maxLength={200} defaultValue={values.legalName} />
        </div>
        <div>
          <label className={s.label} htmlFor="ws-email">Billing email</label>
          <input id="ws-email" name="email" className={s.input} maxLength={200} defaultValue={values.email} placeholder="billing@remassistance.com" />
        </div>
        <div className={s.fieldWide}>
          <label className={s.label} htmlFor="ws-address">Address</label>
          <textarea id="ws-address" name="address" className={s.textarea} rows={3} maxLength={1000} defaultValue={values.address} />
        </div>
        <div>
          <label className={s.label} htmlFor="ws-tax">Tax ID (TIN)</label>
          <input id="ws-tax" name="taxId" className={s.input} maxLength={100} defaultValue={values.taxId} />
        </div>
        <div>
          <label className={s.label} htmlFor="ws-terms">Default days to pay</label>
          <input id="ws-terms" name="paymentTermsDays" type="number" min={0} max={365} className={s.input} defaultValue={values.paymentTermsDays} />
        </div>
        <div>
          <label className={s.label} htmlFor="ws-prefix">Invoice number prefix</label>
          <input id="ws-prefix" name="invoicePrefix" className={s.input} maxLength={8} defaultValue={values.invoicePrefix} />
          <span className={s.cardNote}>Numbers run {values.invoicePrefix || 'INV'}-{new Date().getFullYear()}-0001, 0002… per year.</span>
        </div>
        <div className={s.fieldWide}>
          <label className={s.label} htmlFor="ws-bank">How to pay (bank details)</label>
          <textarea id="ws-bank" name="bankDetails" className={s.textarea} rows={4} maxLength={2000} defaultValue={values.bankDetails}
            placeholder={'Bank name\nAccount name\nAccount number\nSWIFT'} />
        </div>
        <div className={s.fieldWide}>
          <label className={s.label} htmlFor="ws-footer">Footer on every invoice</label>
          <textarea id="ws-footer" name="footer" className={s.textarea} rows={2} maxLength={2000} defaultValue={values.footer} />
        </div>
      </div>
      <p className={s.cardNote}>Changes apply to invoices issued from now on. Issued invoices keep the details they were issued with.</p>
      <div className={s.formFoot}>
        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending}>Save</button>
        <Status state={state} pending={pending} />
      </div>
    </form>
  );
}
