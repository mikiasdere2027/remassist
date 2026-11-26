'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import type { ActionResult } from '../crm-actions';
import { addContact, archiveContact, updateCompany } from './actions';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

/** Re-fetch the page's server data after a successful save. */
function useRefreshOnOk(state: ActionResult | null) {
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);
}

function Feedback({ state, pending, ok }: { state: ActionResult | null; pending: boolean; ok: string }) {
  if (pending) return <span className={s.saving}>Saving…</span>;
  if (!state) return null;
  return state.ok ? <span className={s.saving} role="status">{ok}</span> : <span className={s.error} role="alert">{state.error}</span>;
}

export function CompanyDetailsForm({ companyId, values }: {
  companyId: string;
  values: { name: string; website: string | null; industry: string | null; size: string | null; country: string | null };
}) {
  const [state, formAction, pending] = useActionState(
    (prev: ActionResult | null, fd: FormData) => updateCompany(companyId, prev, fd), null);
  useRefreshOnOk(state);
  return (
    <form action={formAction} className={s.cardBody}>
      <div className={s.fieldGrid}>
        <Field id="co-name" name="name" label="Name *" value={values.name} required />
        <Field id="co-web" name="website" label="Website" value={values.website} placeholder="northwind.com" />
        <Field id="co-ind" name="industry" label="Industry" value={values.industry} />
        <Field id="co-size" name="size" label="Size" value={values.size} placeholder="e.g. 50–200 staff" />
        <Field id="co-country" name="country" label="Country" value={values.country} />
      </div>
      <div className={s.formFoot}>
        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending}>Save company</button>
        <Feedback state={state} pending={pending} ok="Saved" />
      </div>
    </form>
  );
}

export function AddContactForm({ companyId }: { companyId: string }) {
  const [state, formAction, pending] = useActionState(
    (prev: ActionResult | null, fd: FormData) => addContact(companyId, prev, fd), null);
  useRefreshOnOk(state);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={formAction} className={s.cardBody}>
      <div className={s.fieldGrid}>
        <Field id="ct-first" name="firstName" label="First name" />
        <Field id="ct-last" name="lastName" label="Last name" />
        <Field id="ct-email" name="email" label="Email" type="email" />
        <Field id="ct-phone" name="phone" label="Phone" type="tel" />
        <Field id="ct-title" name="jobTitle" label="Job title" />
      </div>
      <div className={s.formFoot}>
        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending}>Add contact</button>
        <Feedback state={state} pending={pending} ok="Contact added" />
      </div>
    </form>
  );
}

/** Two-step remove, so a stray click does not drop a person from the list. */
export function RemoveContact({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  if (!armed) {
    return <button type="button" className={s.doneToggle} onClick={() => setArmed(true)} aria-label={`Remove ${name}`}>Remove</button>;
  }
  return (
    <span className={s.headerActions}>
      <button type="button" className={s.doneToggle} disabled={pending} onClick={() => start(async () => { const r = await archiveContact(id); if (r.ok) router.refresh(); })}>
        {pending ? 'Removing…' : `Remove ${name}?`}
      </button>
      <button type="button" className={s.doneToggle} onClick={() => setArmed(false)}>Keep</button>
    </span>
  );
}

function Field({ id, name, label, value, type = 'text', required, placeholder }: {
  id: string; name: string; label: string; value?: string | null; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className={s.label} htmlFor={id}>{label}</label>
      <input id={id} name={name} type={type} className={s.input} defaultValue={value ?? ''} required={required} placeholder={placeholder} maxLength={300} />
    </div>
  );
}
