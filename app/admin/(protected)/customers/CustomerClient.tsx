'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import type { ActionResult } from '../leads/[id]/actions';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

type FormAction = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

function Msg({ state, pending, ok = 'Saved' }: { state: ActionResult | null; pending: boolean; ok?: string }) {
  if (pending) return <span className={s.saving}>Saving…</span>;
  if (!state) return null;
  return state.ok ? <span className={s.saving} role="status">{ok}</span> : <span className={s.error} role="alert">{state.error}</span>;
}

/** Onboarding / Active / Paused / Churned. Churned asks why first. */
export function StatusControl({ current, options, action }: {
  current: string;
  options: Array<{ value: string; label: string }>;
  action: (status: string, reason?: string) => Promise<ActionResult>;
}) {
  const [value, setValue] = useState(current);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dlg = useRef<HTMLDialogElement>(null);
  useEffect(() => setValue(current), [current]);
  useEffect(() => { if (asking && dlg.current && !dlg.current.open) dlg.current.showModal(); }, [asking]);

  function save(next: string, why?: string) {
    const prev = value;
    setValue(next);
    setError(null);
    start(async () => {
      const r = await action(next, why).catch(() => ({ ok: false as const, error: 'Could not change the status.' }));
      if (!r.ok) { setValue(prev); setError(r.error); }
    });
  }

  return (
    <div className={s.kv}>
      <label className={s.kvLabel} htmlFor="eng-status">Status</label>
      <select id="eng-status" className={s.select} value={value} disabled={pending}
        onChange={(e) => (e.target.value === 'churned' ? setAsking(true) : save(e.target.value))}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {pending && <span className={s.saving}>Saving…</span>}
      {error && <span className={s.error} role="alert">{error}</span>}
      {asking && (
        <dialog ref={dlg} className={admin.modal} aria-labelledby="churn-title" onCancel={(e) => { e.preventDefault(); setAsking(false); }}>
          <div className={admin.modalPanel}>
            <form className={s.cardBody} onSubmit={(e) => { e.preventDefault(); if (reason.trim()) { save('churned', reason); setAsking(false); setReason(''); } }}>
              <h2 id="churn-title" className={s.cardTitle}>Mark this customer as churned</h2>
              <div>
                <label className={s.label} htmlFor="churn-reason">Why did they leave? *</label>
                <textarea id="churn-reason" className={s.textarea} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} required
                  placeholder="e.g. Brought the work in-house after the funding round" />
              </div>
              <div className={s.formFoot}>
                <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={!reason.trim()}>Mark as churned</button>
                <button type="button" className={`${admin.btn} ${admin.btnGhost}`} onClick={() => setAsking(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}

/** The onboarding checklist: tick each step; the last one makes the customer Active. */
export function Checklist({ steps, toggle }: {
  steps: Array<{ key: string; label: string; doneAt: string | null; doneByName: string | null }>;
  toggle: (key: string, done: boolean) => Promise<ActionResult>;
}) {
  const [state, setState] = useState(steps);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  useEffect(() => setState(steps), [steps]);
  return (
    <>
      <ul className={s.checkSteps}>
        {state.map((st) => (
          <li key={st.key} className={st.doneAt ? s.stepDone : undefined}>
            <label>
              <input
                type="checkbox"
                checked={Boolean(st.doneAt)}
                onChange={(e) => {
                  const on = e.target.checked;
                  const before = state;
                  setState(state.map((x) => (x.key === st.key ? { ...x, doneAt: on ? new Date().toISOString() : null } : x)));
                  setError(null);
                  start(async () => {
                    const r = await toggle(st.key, on).catch(() => ({ ok: false as const, error: 'Could not save.' }));
                    if (!r.ok) { setState(before); setError(r.error); }
                  });
                }}
              />
              <span>{st.label}</span>
            </label>
            {st.doneAt && st.doneByName && <span className={s.cardNote}>{st.doneByName}</span>}
          </li>
        ))}
      </ul>
      {error && <p className={s.error} role="alert">{error}</p>}
    </>
  );
}

export function TermsForm({ action, values, services }: {
  action: FormAction;
  values: { title: string; service: string | null; monthlyValue: string };
  services: string[];
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={s.cardBody}>
      <div className={s.fieldGrid}>
        <div className={s.fieldWide}>
          <label className={s.label} htmlFor="t-title">Engagement name *</label>
          <input id="t-title" name="title" className={s.input} required maxLength={200} defaultValue={values.title} />
        </div>
        <div>
          <label className={s.label} htmlFor="t-service">Service</label>
          <select id="t-service" name="service" className={s.select} defaultValue={values.service ?? ''}>
            <option value="">Not set</option>
            {values.service && !services.includes(values.service) && <option value={values.service}>{values.service}</option>}
            {services.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className={s.label} htmlFor="t-value">Monthly value (USD)</label>
          <input id="t-value" name="monthlyValue" inputMode="decimal" className={s.input} defaultValue={values.monthlyValue} placeholder="4320" />
        </div>
      </div>
      <div className={s.formFoot}>
        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending}>Save terms</button>
        <Msg state={state} pending={pending} />
      </div>
    </form>
  );
}

export function RolesForm({ action, text }: { action: FormAction; text: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={s.cardBody}>
      <label className={s.label} htmlFor="roles">One role per line: <b>Role | seats | hours per month | staff names</b></label>
      <textarea id="roles" name="roles" className={`${s.textarea} ${s.monoArea}`} defaultValue={text} rows={5} maxLength={20000}
        placeholder={'SDR | 2 | 320 | Hana, Dawit\nSales ops | 1 | 160 | Selam'} />
      <div className={s.formFoot}>
        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending}>Save roles</button>
        <Msg state={state} pending={pending} />
      </div>
    </form>
  );
}

export function ContractForm({ action, values }: {
  action: FormAction;
  values: { startDate: string | null; contractEnd: string | null; renewalDate: string | null; noticeDays: number | null };
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={s.cardBody}>
      <div className={s.fieldGrid}>
        <div>
          <label className={s.label} htmlFor="c-start">Start date</label>
          <input id="c-start" name="startDate" type="date" className={s.input} defaultValue={values.startDate ?? ''} />
        </div>
        <div>
          <label className={s.label} htmlFor="c-end">Contract end</label>
          <input id="c-end" name="contractEnd" type="date" className={s.input} defaultValue={values.contractEnd ?? ''} />
        </div>
        <div>
          <label className={s.label} htmlFor="c-renew">Renewal date</label>
          <input id="c-renew" name="renewalDate" type="date" className={s.input} defaultValue={values.renewalDate ?? ''} />
        </div>
        <div>
          <label className={s.label} htmlFor="c-notice">Notice period (days)</label>
          <input id="c-notice" name="noticeDays" type="number" min={0} max={365} className={s.input} defaultValue={values.noticeDays ?? ''} placeholder="30" />
        </div>
      </div>
      <div className={s.formFoot}>
        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending}>Save contract</button>
        <Msg state={state} pending={pending} />
      </div>
    </form>
  );
}

export function UploadForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={formAction} className={s.uploadRow}>
      <label className={s.label} htmlFor="up-file">Add a file</label>
      <input id="up-file" name="file" type="file" required accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg" />
      <select name="kind" aria-label="What kind of file" className={s.select} defaultValue="contract">
        <option value="contract">Contract</option>
        <option value="proposal">Proposal</option>
        <option value="invoice">Invoice</option>
        <option value="other">Other</option>
      </select>
      <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending}>{pending ? 'Uploading…' : 'Upload'}</button>
      <Msg state={state} pending={false} ok="Uploaded" />
      <span className={s.cardNote}>PDF, Word, Excel, PNG or JPEG, up to 5 MB. Only signed-in staff can open them.</span>
    </form>
  );
}

export function RemoveFile({ name, action }: { name: string; action: () => Promise<ActionResult> }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  if (!armed) return <button type="button" className={s.doneToggle} onClick={() => setArmed(true)} aria-label={`Remove ${name}`}>Remove</button>;
  return (
    <span className={s.headerActions}>
      <button type="button" className={s.doneToggle} disabled={pending} onClick={() => start(async () => { await action(); })}>
        {pending ? 'Removing…' : 'Confirm remove'}
      </button>
      <button type="button" className={s.doneToggle} onClick={() => setArmed(false)}>Keep</button>
    </span>
  );
}
