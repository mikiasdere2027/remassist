'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useMemo, useState, useTransition } from 'react';
import type { ProposalLineRow } from '@/lib/api/crm';
import { formatMoney, parseMoneyToCents } from '@/lib/crm/money';
import { lineAmount, parsePercentToBps, totals, type ProposalLine } from '@/lib/crm/proposals';
import type { ActionResult } from '../crm-actions';
import { markProposalSent, newProposal, reviseProposal, saveProposal, withdrawProposal } from './actions';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

type Tier = { key: string; label: string; rateCents: number; note: string | null };
type Coverage = { key: string; label: string; longLabel: string; seats: number; hours: number };

/** Lines held as strings while typing; converted to cents on every change for the totals. */
interface Draft {
  kind: 'monthly' | 'one_off';
  description: string;
  tier: string;
  coverage: string;
  seats: string;
  hours: string;
  rate: string;
  amount: string;
}

function toDraft(l: ProposalLineRow): Draft {
  return {
    kind: l.kind, description: l.description, tier: l.tier ?? '', coverage: l.coverage ?? '',
    seats: l.seats?.toString() ?? '', hours: l.hoursPerMonth?.toString() ?? '',
    rate: l.rateCents ? String(l.rateCents / 100) : '', amount: l.amountCents ? String(l.amountCents / 100) : '',
  };
}

function toLine(d: Draft): ProposalLine {
  const int = (v: string) => (v.trim() === '' ? null : Math.max(0, Math.round(Number(v)) || 0));
  return {
    kind: d.kind, description: d.description.trim(), tier: d.tier || null, coverage: d.coverage || null,
    seats: d.kind === 'monthly' ? int(d.seats) : null,
    hoursPerMonth: d.kind === 'monthly' ? int(d.hours) : null,
    rateCents: d.kind === 'monthly' ? parseMoneyToCents(d.rate) : null,
    amountCents: parseMoneyToCents(d.amount) ?? 0,
  };
}

export function ProposalEditor({ proposalId, values, tiers, coverage }: {
  proposalId: string;
  values: {
    title: string; intro: string; terms: string; validUntil: string; discount: string;
    recipientName: string; recipientEmail: string; lines: ProposalLineRow[]; currency: string;
  };
  tiers: Tier[];
  coverage: Coverage[];
}) {
  const [state, formAction, pending] = useActionState(
    (prev: ActionResult | null, fd: FormData) => saveProposal(proposalId, prev, fd), null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);
  const [lines, setLines] = useState<Draft[]>(values.lines.map(toDraft));
  const [discount, setDiscount] = useState(values.discount);
  const parsed = useMemo(() => lines.map(toLine), [lines]);
  const bps = parsePercentToBps(discount);
  const t = totals(parsed, bps ?? 0);
  const money = (c: number) => formatMoney(c, values.currency);

  const update = (i: number, patch: Partial<Draft>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  /* Choosing a tier or coverage fills the rate, seats and hours from the catalogue. */
  const pickTier = (i: number, key: string) => {
    const tier = tiers.find((x) => x.key === key);
    update(i, { tier: key, ...(tier ? { rate: String(tier.rateCents / 100) } : {}) });
  };
  const pickCoverage = (i: number, key: string) => {
    const c = coverage.find((x) => x.key === key);
    update(i, { coverage: key, ...(c ? { seats: String(c.seats), hours: String(c.hours) } : {}) });
  };

  return (
    <form action={formAction} className={s.cardBody}>
      <input type="hidden" name="lines" value={JSON.stringify(parsed)} />
      <input type="hidden" name="discount" value={discount} />
      <div className={s.fieldGrid}>
        <div className={s.fieldWide}>
          <label className={s.label} htmlFor="p-title">Title *</label>
          <input id="p-title" name="title" className={s.input} required maxLength={200} defaultValue={values.title} />
        </div>
        <div>
          <label className={s.label} htmlFor="p-rname">Client name</label>
          <input id="p-rname" name="recipientName" className={s.input} maxLength={120} defaultValue={values.recipientName} />
        </div>
        <div>
          <label className={s.label} htmlFor="p-remail">Client email</label>
          <input id="p-remail" name="recipientEmail" type="email" className={s.input} maxLength={200} defaultValue={values.recipientEmail} />
        </div>
        <div className={s.fieldWide}>
          <label className={s.label} htmlFor="p-intro">Introduction</label>
          <textarea id="p-intro" name="intro" className={s.textarea} maxLength={5000} defaultValue={values.intro}
            placeholder="A short note to the client: what they asked for and what this proposal covers." />
        </div>
      </div>

      <h3 className={s.sectionTitle}>Pricing</h3>
      <div className={s.lineList}>
        {lines.map((l, i) => (
          <fieldset key={i} className={s.lineRow}>
            <legend className={s.srOnlyLegend}>Line {i + 1}</legend>
            <div className={s.lineTop}>
              <span className={`${s.badge} ${l.kind === 'monthly' ? s.p_low : s.p_medium}`}>{l.kind === 'monthly' ? 'Monthly' : 'One-off'}</span>
              <input aria-label={`Line ${i + 1} description`} className={s.input} value={l.description} maxLength={300}
                onChange={(e) => update(i, { description: e.target.value })} placeholder={l.kind === 'monthly' ? 'e.g. SDR team (2 seats)' : 'e.g. Recruitment and onboarding fee'} />
              <b className={s.lineTotal}>{money(lineAmount(parsed[i]))}{l.kind === 'monthly' ? '/mo' : ''}</b>
              <button type="button" className={s.doneToggle} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label={`Remove line ${i + 1}`}>Remove</button>
            </div>
            {l.kind === 'monthly' ? (
              <div className={s.lineFields}>
                <select aria-label={`Line ${i + 1} tier`} className={s.select} value={l.tier} onChange={(e) => pickTier(i, e.target.value)}>
                  <option value="">Tier…</option>
                  {tiers.map((x) => <option key={x.key} value={x.key}>{x.label} · {money(x.rateCents)}/h</option>)}
                </select>
                <select aria-label={`Line ${i + 1} coverage`} className={s.select} value={l.coverage} onChange={(e) => pickCoverage(i, e.target.value)}>
                  <option value="">Coverage…</option>
                  {coverage.map((x) => <option key={x.key} value={x.key}>{x.label} · {x.hours} h/mo</option>)}
                </select>
                <label className={s.miniField}>Seats<input className={s.input} inputMode="numeric" value={l.seats} onChange={(e) => update(i, { seats: e.target.value })} /></label>
                <label className={s.miniField}>Hours/mo<input className={s.input} inputMode="numeric" value={l.hours} onChange={(e) => update(i, { hours: e.target.value })} /></label>
                <label className={s.miniField}>Rate $/h<input className={s.input} inputMode="decimal" value={l.rate} onChange={(e) => update(i, { rate: e.target.value })} /></label>
              </div>
            ) : (
              <div className={s.lineFields}>
                <label className={s.miniField}>Amount $<input className={s.input} inputMode="decimal" value={l.amount} onChange={(e) => update(i, { amount: e.target.value })} /></label>
              </div>
            )}
          </fieldset>
        ))}
        {lines.length === 0 && <p className={s.cardNote}>No lines yet. Add the monthly team first.</p>}
      </div>
      <div className={s.formFoot}>
        <button type="button" className={`${admin.btn} ${admin.btnGhost}`} disabled={lines.length >= 30}
          onClick={() => setLines((ls) => [...ls, { kind: 'monthly', description: '', tier: tiers[0]?.key ?? '', coverage: '', seats: '', hours: '', rate: tiers[0] ? String(tiers[0].rateCents / 100) : '', amount: '' }])}>
          Add monthly line
        </button>
        <button type="button" className={`${admin.btn} ${admin.btnGhost}`} disabled={lines.length >= 30}
          onClick={() => setLines((ls) => [...ls, { kind: 'one_off', description: '', tier: '', coverage: '', seats: '', hours: '', rate: '', amount: '' }])}>
          Add one-off fee
        </button>
      </div>

      <div className={s.totalsBox} aria-live="polite">
        <div><span>Monthly fees</span><b>{money(t.monthlySubtotal)}</b></div>
        <div>
          <label htmlFor="p-discount">Discount on monthly fees (%)</label>
          <input id="p-discount" className={`${s.input} ${s.tinyInput}`} inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          <b>{t.discount ? `−${money(t.discount)}` : '—'}</b>
        </div>
        {bps === null && <p className={s.error} role="alert">The discount must be between 0 and 100%.</p>}
        <div className={s.totalsMain}><span>Per month</span><b>{money(t.monthly)}</b></div>
        {t.oneOff > 0 && <div><span>One-off fees</span><b>{money(t.oneOff)}</b></div>}
        <div><span>First invoice</span><b>{money(t.firstMonth)}</b></div>
        <div><span>First year</span><b>{money(t.annual + t.oneOff)}</b></div>
      </div>

      <div className={s.fieldGrid}>
        <div>
          <label className={s.label} htmlFor="p-valid">Valid until</label>
          <input id="p-valid" name="validUntil" type="date" className={s.input} defaultValue={values.validUntil} />
        </div>
        <div className={s.fieldWide}>
          <label className={s.label} htmlFor="p-terms">Terms</label>
          <textarea id="p-terms" name="terms" className={s.textarea} maxLength={10000} defaultValue={values.terms}
            placeholder="Billing, notice period, trial, what happens next. Leave empty to show none." />
        </div>
      </div>
      <div className={s.formFoot}>
        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending || bps === null}>Save draft</button>
        {pending ? <span className={s.saving}>Saving…</span> : state ? (state.ok ? <span className={s.saving} role="status">Saved</span> : <span className={s.error} role="alert">{state.error}</span>) : null}
      </div>
    </form>
  );
}

/** Send, copy link, withdraw: the proposal's own actions. */
/**
 * Send, withdraw, revise, and the client link. "Email to client" stays off
 * until a sending address is decided (docs/CRM-PHASES-2-6.md).
 */
export function ProposalActions({ proposalId, status, link }: {
  proposalId: string;
  status: string;
  link: string;
}) {
  const canEmail = false;
  const send = () => markProposalSent(proposalId);
  const email = () => Promise.resolve<ActionResult>({ ok: false, error: 'Emailing is not set up yet.' });
  const withdraw = () => withdrawProposal(proposalId);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>, ok: string) => start(async () => {
    setErr(null); setMsg(null);
    const r = await fn().catch(() => ({ ok: false as const, error: 'Something went wrong. Try again.' }));
    if (r.ok) { setMsg(ok); router.refresh(); } else setErr(r.error);
  });
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setMsg('Link copied'); } catch { setErr('Copy the link from the box below.'); }
  };
  return (
    <div className={s.cardBody}>
      {status === 'draft' && (
        <>
          <button type="button" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending || !canEmail} onClick={() => run(email, 'Emailed to the client')}>
            Email to client
          </button>
          {!canEmail && <p className={s.cardNote}>Emailing turns on once a sending address is set up. For now: copy the link, send it yourself, then mark it as sent.</p>}
          <button type="button" className={`${admin.btn} ${admin.btnGhost}`} disabled={pending} onClick={() => run(send, 'Marked as sent')}>
            Mark as sent
          </button>
        </>
      )}
      {(status === 'sent' || status === 'viewed') && (
        <button type="button" className={`${admin.btn} ${admin.btnGhost}`} disabled={pending} onClick={() => run(withdraw, 'Withdrawn')}>Withdraw</button>
      )}
      <div>
        <label className={s.label} htmlFor="p-link">Client link</label>
        <input id="p-link" className={s.input} readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className={s.doneToggle} onClick={copy}>Copy link</button>
        {status === 'draft' && <p className={s.cardNote}>The link only works once the proposal is sent.</p>}
      </div>
      {msg && <span className={s.saving} role="status">{msg}</span>}
      {err && <span className={s.error} role="alert">{err}</span>}
    </div>
  );
}

/** Start a proposal from a deal (the deal page's Proposals card). */
export function NewProposalButton({ dealId, className }: { dealId: string; className?: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <button type="button" className={className} disabled={pending}
        onClick={() => start(async () => { const r = await newProposal(dealId); if (!r.ok) setErr(r.error); })}>
        {pending ? 'Starting…' : 'New proposal'}
      </button>
      {err && <span className={s.error} role="alert">{err}</span>}
    </>
  );
}

/** A new draft copying this one, for a revised offer. */
export function ReviseButton({ proposalId, className }: { proposalId: string; className?: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <button type="button" className={className} disabled={pending}
        onClick={() => start(async () => { const r = await reviseProposal(proposalId); if (!r.ok) setErr(r.error); })}>
        {pending ? 'Starting…' : 'Revise (new draft)'}
      </button>
      {err && <span className={s.error} role="alert">{err}</span>}
    </>
  );
}
