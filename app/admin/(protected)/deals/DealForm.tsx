'use client';

import { useActionState, useState } from 'react';
import { formatMoney, monthlyValueCents, parseMoneyToCents } from '@/lib/crm/money';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

type Result = { ok?: boolean; error?: string } | null;
type FormAction = (prev: Result, fd: FormData) => Promise<Result>;

export interface DealFormValues {
  title?: string;
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  service?: string | null;
  tier?: string | null;
  seats?: number | null;
  hoursPerMonth?: number | null;
  rate?: string;
  monthlyValue?: string;
  probability?: number | null;
  expectedClose?: string | null;
  stageId?: string;
  ownerId?: string | null;
}

/**
 * The deal form: New deal, Convert lead, and Edit on the deal page.
 * `mode` decides which fields show — the company and contact are chosen when
 * a deal is created and edited on the company page afterwards; the stage is
 * changed with the stage control, not here.
 */
export default function DealForm({
  mode, action, values = {}, stages, team, services, submitLabel, stageProbabilities,
}: {
  mode: 'new' | 'convert' | 'edit';
  /* `never` for the previous state so any of the three server actions fits;
     each returns either an error or nothing (or redirects). */
  action: (prev: never, fd: FormData) => Promise<Result>;
  values?: DealFormValues;
  stages: Array<{ id: string; name: string }>;
  team: Array<{ id: string; name: string }>;
  services: string[];
  submitLabel: string;
  stageProbabilities?: Record<string, number>;
}) {
  const [state, formAction, pending] = useActionState<Result, FormData>(action as FormAction, null);
  const [hours, setHours] = useState(values.hoursPerMonth ? String(values.hoursPerMonth) : '');
  const [rate, setRate] = useState(values.rate ?? '');
  const [entered, setEntered] = useState(values.monthlyValue ?? '');
  const [stageId, setStageId] = useState(values.stageId ?? stages[0]?.id ?? '');

  const computed = monthlyValueCents(Number(hours) || null, parseMoneyToCents(rate), parseMoneyToCents(entered));
  const fromRate = Boolean(Number(hours) && parseMoneyToCents(rate));
  const stageDefault = stageProbabilities?.[stageId];

  return (
    <form action={formAction} className={s.cardBody}>
      <div className={s.fieldGrid}>
        <div className={s.fieldWide}>
          <label className={s.label} htmlFor="d-title">Deal title *</label>
          <input id="d-title" name="title" className={s.input} required maxLength={200} defaultValue={values.title ?? ''}
            placeholder="e.g. Northwind — 2 SDRs" />
        </div>

        {mode !== 'edit' && (
          <>
            <div>
              <label className={s.label} htmlFor="d-company">Company</label>
              <input id="d-company" name="companyName" className={s.input} maxLength={160} defaultValue={values.companyName ?? ''}
                placeholder="Linked if it already exists" />
            </div>
            {mode === 'new' ? (
              <>
                <div>
                  <label className={s.label} htmlFor="d-contact-email">Contact email</label>
                  <input id="d-contact-email" name="contactEmail" type="email" className={s.input} maxLength={200} defaultValue={values.contactEmail ?? ''} />
                </div>
                <div>
                  <label className={s.label} htmlFor="d-contact-name">Contact name</label>
                  <input id="d-contact-name" name="contactName" className={s.input} maxLength={120} defaultValue={values.contactName ?? ''} />
                </div>
              </>
            ) : (
              <div>
                <span className={s.label}>Contact</span>
                <p className={s.kvValue}>{values.contactName || values.contactEmail}</p>
              </div>
            )}
            <div>
              <label className={s.label} htmlFor="d-stage">Stage</label>
              <select id="d-stage" name="stageId" className={s.select} value={stageId} onChange={(e) => setStageId(e.target.value)}>
                {stages.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
              </select>
            </div>
            <div>
              <label className={s.label} htmlFor="d-owner">Owner</label>
              <select id="d-owner" name="ownerId" className={s.select} defaultValue={values.ownerId ?? ''}>
                <option value="">Me</option>
                {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </>
        )}

        <div>
          <label className={s.label} htmlFor="d-service">Service</label>
          <select id="d-service" name="service" className={s.select} defaultValue={values.service ?? ''}>
            <option value="">Not set</option>
            {values.service && !services.includes(values.service) && <option value={values.service}>{values.service}</option>}
            {services.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className={s.label} htmlFor="d-tier">Tier</label>
          <input id="d-tier" name="tier" className={s.input} maxLength={80} defaultValue={values.tier ?? ''} placeholder="Pro, Expert…" />
        </div>
        <div>
          <label className={s.label} htmlFor="d-seats">Seats</label>
          <input id="d-seats" name="seats" type="number" min={0} className={s.input} defaultValue={values.seats ?? ''} />
        </div>
        <div>
          <label className={s.label} htmlFor="d-hours">Hours per month</label>
          <input id="d-hours" name="hoursPerMonth" type="number" min={0} className={s.input} value={hours} onChange={(e) => setHours(e.target.value)}
            placeholder="160 per full-time seat" />
        </div>
        <div>
          <label className={s.label} htmlFor="d-rate">Hourly rate (USD)</label>
          <input id="d-rate" name="rate" inputMode="decimal" className={s.input} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="9" />
        </div>
        <div>
          <label className={s.label} htmlFor="d-value">Monthly value (USD)</label>
          <input id="d-value" name="monthlyValue" inputMode="decimal" className={s.input} value={entered} onChange={(e) => setEntered(e.target.value)}
            disabled={fromRate} placeholder={fromRate ? 'Calculated from hours × rate' : 'If there is no hourly rate'} />
        </div>
        <div>
          <label className={s.label} htmlFor="d-prob">Win probability (%)</label>
          <input id="d-prob" name="probability" type="number" min={0} max={100} className={s.input} defaultValue={values.probability ?? ''}
            placeholder={stageDefault !== undefined ? `Stage default: ${stageDefault}%` : 'Stage default'} />
        </div>
        <div>
          <label className={s.label} htmlFor="d-close">Expected close</label>
          <input id="d-close" name="expectedClose" type="date" className={s.input} defaultValue={values.expectedClose ?? ''} />
        </div>
      </div>

      <p className={s.valueLine} aria-live="polite">
        Monthly value <b>{formatMoney(computed)}</b>
        {fromRate ? <span className={s.cardNote}> · {hours} h × {formatMoney(parseMoneyToCents(rate) ?? 0)}/h</span> : null}
      </p>

      {state?.error && <p className={s.error} role="alert">{state.error}</p>}
      {state?.ok && <p className={s.saving} role="status">Saved</p>}
      <div className={s.formFoot}>
        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending}>{pending ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}
