'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { createLead, type NewLeadState } from './actions';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

const SOURCE_OPTIONS = [
  { value: 'manual', label: 'Added by team' },
  { value: 'referral', label: 'Referral' },
  { value: 'outbound', label: 'Outbound' },
  { value: 'event', label: 'Event' },
];

export default function NewLeadForm({
  team, me, services,
}: {
  team: Array<{ id: string; name: string }>;
  me: string;
  services: string[];
}) {
  const [state, action, pending] = useActionState<NewLeadState, FormData>(createLead, null);

  return (
    <form action={action} className={s.cardBody}>
      <div className={s.fieldGrid}>
        <Field id="nl-first" name="firstName" label="First name" autoComplete="off" />
        <Field id="nl-last" name="lastName" label="Last name" autoComplete="off" />
        <Field id="nl-email" name="email" label="Email *" type="email" required />
        <Field id="nl-phone" name="phone" label="Phone" type="tel" />
        <Field id="nl-company" name="company" label="Company" />
        <Field id="nl-country" name="country" label="Country" />
        <div>
          <label className={s.label} htmlFor="nl-service">Service interest</label>
          <select id="nl-service" name="serviceInterest" className={s.select} defaultValue="">
            <option value="">Not known yet</option>
            {services.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className={s.label} htmlFor="nl-source">Source</label>
          <select id="nl-source" name="source" className={s.select} defaultValue="manual">
            {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className={s.label} htmlFor="nl-owner">Owner</label>
          <select id="nl-owner" name="ownerId" className={s.select} defaultValue={me}>
            <option value="">Unassigned</option>
            {team.map((m) => <option key={m.id} value={m.id}>{m.id === me ? `${m.name} (me)` : m.name}</option>)}
          </select>
        </div>
        <div className={s.fieldWide}>
          <label className={s.label} htmlFor="nl-message">What do they need?</label>
          <textarea id="nl-message" name="message" className={s.textarea} maxLength={5000}
            placeholder="How you met, what they asked about, anything worth remembering" />
        </div>
      </div>
      {state?.error && (
        <p className={s.error} role="alert">
          {state.error}{' '}
          {state.duplicateId && <Link href={`/admin/leads/${state.duplicateId}`}>Open the existing lead</Link>}
        </p>
      )}
      <div className={s.formFoot}>
        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending}>
          {pending ? 'Adding…' : 'Add lead'}
        </button>
        <Link className={`${admin.btn} ${admin.btnGhost}`} href="/admin/leads">Cancel</Link>
      </div>
    </form>
  );
}

function Field({ id, name, label, type = 'text', required, autoComplete }: {
  id: string; name: string; label: string; type?: string; required?: boolean; autoComplete?: string;
}) {
  return (
    <div>
      <label className={s.label} htmlFor={id}>{label}</label>
      <input id={id} name={name} type={type} className={s.input} required={required} autoComplete={autoComplete} maxLength={200} />
    </div>
  );
}
