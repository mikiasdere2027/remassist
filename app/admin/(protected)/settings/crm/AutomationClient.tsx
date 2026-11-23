'use client';

import { useActionState, useState, useTransition } from 'react';
import type { ActionResult } from '../../leads/[id]/actions';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

type FormAction = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

export function AutomationForm({ action, values, team }: {
  action: FormAction;
  values: {
    assignMode: 'off' | 'round_robin' | 'single';
    defaultOwnerId: string | null;
    pool: string[];
    rulesText: string;
    firstContactTask: boolean;
    firstContactHours: number;
  };
  team: Array<{ id: string; name: string; email: string }>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [mode, setMode] = useState(values.assignMode);
  return (
    <form action={formAction} className={s.cardBody}>
      <div className={s.fieldGrid}>
        <div>
          <label className={s.label} htmlFor="a-mode">New website leads</label>
          <select id="a-mode" name="assignMode" className={s.select} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="off">Leave unassigned</option>
            <option value="round_robin">Take turns (round-robin)</option>
            <option value="single">Always the same person</option>
          </select>
        </div>
        {mode === 'single' && (
          <div>
            <label className={s.label} htmlFor="a-owner">Who gets them</label>
            <select id="a-owner" name="defaultOwnerId" className={s.select} defaultValue={values.defaultOwnerId ?? ''} required>
              <option value="">Choose someone</option>
              {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}
        {mode === 'round_robin' && (
          <fieldset className={s.fieldWide} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
            <legend className={s.label}>Who takes turns (none ticked = everyone)</legend>
            <div className={s.chips}>
              {team.map((m) => (
                <label key={m.id} className={s.chip}>
                  <input type="checkbox" name="pool" value={m.id} defaultChecked={values.pool.includes(m.id)} />
                  {m.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {mode !== 'off' && (
          <div className={s.fieldWide}>
            <label className={s.label} htmlFor="a-rules">Rules first, one per line: <b>service | email</b></label>
            <textarea id="a-rules" name="rules" className={s.textarea} rows={3} defaultValue={values.rulesText}
              placeholder={'Managed IT | sam@remassistance.com\nHR & Recruiting | hana@remassistance.com'} />
            <span className={s.cardNote}>A lead whose service interest contains the text goes to that person; everything else follows the choice above.</span>
          </div>
        )}
        <label className={`${s.fieldWide} ${s.checkLine}`}>
          <input type="checkbox" name="firstContactTask" defaultChecked={values.firstContactTask} />
          Add a &ldquo;First contact&rdquo; task to every new website lead, due within
          <input name="firstContactHours" type="number" min={1} max={72} defaultValue={values.firstContactHours} className={`${s.input} ${s.tinyInput}`} aria-label="Business hours to reply in" />
          business hours (Mon–Fri, 9:00–17:00 Addis Ababa)
        </label>
      </div>
      <div className={s.formFoot}>
        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending}>Save</button>
        {pending ? <span className={s.saving}>Saving…</span> : state ? (state.ok ? <span className={s.saving} role="status">Saved</span> : <span className={s.error} role="alert">{state.error}</span>) : null}
      </div>
    </form>
  );
}

export function SendDigest({ action, configured }: { action: () => Promise<ActionResult>; configured: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionResult | null>(null);
  return (
    <div className={s.formFoot}>
      <button type="button" className={`${admin.btn} ${admin.btnGhost}`} disabled={pending || !configured}
        onClick={() => start(async () => setMsg(await action().catch(() => ({ ok: false as const, error: 'Could not send.' }))))}>
        {pending ? 'Sending…' : 'Send to Slack now'}
      </button>
      {msg && (msg.ok ? <span className={s.saving} role="status">Sent</span> : <span className={s.error} role="alert">{msg.error}</span>)}
    </div>
  );
}
