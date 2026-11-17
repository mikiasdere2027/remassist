'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import type { ActionResult } from '../../leads/[id]/actions';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

type FormAction = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

function Msg({ state, pending }: { state: ActionResult | null; pending: boolean }) {
  if (pending) return <span className={s.saving}>Saving…</span>;
  if (!state) return null;
  return state.ok ? <span className={s.saving} role="status">Saved</span> : <span className={s.error} role="alert">{state.error}</span>;
}

/** A small button that runs an action and shows its error, if any. */
function ActBtn({ label, run, disabled }: { label: string; run: () => Promise<ActionResult>; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button type="button" className={s.doneToggle} disabled={disabled || pending}
        onClick={() => start(async () => { const r = await run(); setError(r.ok ? null : r.error); })}>
        {label}
      </button>
      {error && <span className={s.error} role="alert">{error}</span>}
    </>
  );
}

export function StageRow({ stage, first, last, save, move, archive }: {
  stage: { id: string; name: string; probability: number; kind: 'open' | 'won' | 'lost' };
  first: boolean;
  last: boolean;
  save: FormAction;
  move: (dir: 'up' | 'down') => Promise<ActionResult>;
  archive: () => Promise<ActionResult>;
}) {
  const [state, action, pending] = useActionState(save, null);
  const fixed = stage.kind !== 'open';
  return (
    <form action={action} className={s.settingsRow}>
      <input name="name" aria-label="Stage name" className={s.input} defaultValue={stage.name} required maxLength={60} />
      <label className={s.probField}>
        <input name="probability" type="number" min={0} max={100} aria-label={`Win probability for ${stage.name}`} className={s.input}
          defaultValue={stage.probability} readOnly={fixed} />
        <span>%</span>
      </label>
      <span className={s.headerActions}>
        <button type="submit" className={`${admin.btn} ${admin.btnGhost}`} disabled={pending}>Save</button>
        {fixed ? (
          <span className={s.cardNote}>{stage.kind === 'won' ? 'Closes as won' : 'Closes as lost'}</span>
        ) : (
          <>
            <ActBtn label="Up" run={() => move('up')} disabled={first} />
            <ActBtn label="Down" run={() => move('down')} disabled={last} />
            <ActBtn label="Archive" run={archive} />
          </>
        )}
        <Msg state={state} pending={pending} />
      </span>
    </form>
  );
}

export function AddStageForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={formAction} className={s.settingsRow}>
      <input name="name" aria-label="New stage name" className={s.input} placeholder="New stage, e.g. Trial running" required maxLength={60} />
      <label className={s.probField}>
        <input name="probability" type="number" min={0} max={100} aria-label="Win probability for the new stage" className={s.input} defaultValue={50} />
        <span>%</span>
      </label>
      <span className={s.headerActions}>
        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending}>Add stage</button>
        <Msg state={state} pending={pending} />
      </span>
    </form>
  );
}

export function ReasonRow({ label, save, archive }: { label: string; save: FormAction; archive: () => Promise<ActionResult> }) {
  const [state, action, pending] = useActionState(save, null);
  return (
    <form action={action} className={s.settingsRow}>
      <input name="label" aria-label="Loss reason" className={s.input} defaultValue={label} required maxLength={80} />
      <span />
      <span className={s.headerActions}>
        <button type="submit" className={`${admin.btn} ${admin.btnGhost}`} disabled={pending}>Save</button>
        <ActBtn label="Archive" run={archive} />
        <Msg state={state} pending={pending} />
      </span>
    </form>
  );
}

export function AddReasonForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={formAction} className={s.settingsRow}>
      <input name="label" aria-label="New loss reason" className={s.input} placeholder="New reason" required maxLength={80} />
      <span />
      <span className={s.headerActions}>
        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending}>Add reason</button>
        <Msg state={state} pending={pending} />
      </span>
    </form>
  );
}
