'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import type { ActionResult } from '../leads/[id]/actions';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

type FormAction = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

function Feedback({ state, pending, ok }: { state: ActionResult | null; pending: boolean; ok: string }) {
  if (pending) return <span className={s.saving}>Saving…</span>;
  if (!state) return null;
  return state.ok ? <span className={s.saving} role="status">{ok}</span> : <span className={s.error} role="alert">{state.error}</span>;
}

export function CompanyDetailsForm({ action, values }: {
  action: FormAction;
  values: { name: string; website: string | null; industry: string | null; size: string | null; country: string | null };
}) {
  const [state, formAction, pending] = useActionState(action, null);
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

export function AddContactForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, null);
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
export function RemoveContact({ id, name, action }: { id: string; name: string; action: (id: string) => Promise<ActionResult> }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  if (!armed) {
    return <button type="button" className={s.doneToggle} onClick={() => setArmed(true)} aria-label={`Remove ${name}`}>Remove</button>;
  }
  return (
    <span className={s.headerActions}>
      <button type="button" className={s.doneToggle} disabled={pending} onClick={() => start(async () => { await action(id); })}>
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
