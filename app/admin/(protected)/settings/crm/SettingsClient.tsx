'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import type { ActionResult } from '../../crm-actions';
import {
  addLossReason,
  addStage,
  archiveLossReason,
  archiveStage,
  moveStage,
  saveLossReason,
  saveStage,
} from './actions';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

/** Re-fetch the page's server data after a successful save. */
function useRefreshOnOk(state: ActionResult | null) {
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);
}

function Msg({ state, pending }: { state: ActionResult | null; pending: boolean }) {
  if (pending) return <span className={s.saving}>Saving…</span>;
  if (!state) return null;
  return state.ok ? <span className={s.saving} role="status">Saved</span> : <span className={s.error} role="alert">{state.error}</span>;
}

/** A small button that runs an action and shows its error, if any. */
function ActBtn({ label, run, disabled }: { label: string; run: () => Promise<ActionResult>; disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button type="button" className={s.doneToggle} disabled={disabled || pending}
        onClick={() => start(async () => { const r = await run(); setError(r.ok ? null : r.error); if (r.ok) router.refresh(); })}>
        {label}
      </button>
      {error && <span className={s.error} role="alert">{error}</span>}
    </>
  );
}

export function StageRow({ stage, first, last }: {
  stage: { id: string; name: string; probability: number; kind: 'open' | 'won' | 'lost' };
  first: boolean;
  last: boolean;
}) {
  const save = (prev: ActionResult | null, fd: FormData) => saveStage(stage.id, prev, fd);
  const move = (dir: 'up' | 'down') => moveStage(stage.id, dir);
  const archive = () => archiveStage(stage.id);
  const [state, action, pending] = useActionState(save, null);
  useRefreshOnOk(state);
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

export function AddStageForm() {
  const [state, formAction, pending] = useActionState(addStage, null);
  useRefreshOnOk(state);
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

export function ReasonRow({ id, label }: { id: string; label: string }) {
  const save = (prev: ActionResult | null, fd: FormData) => saveLossReason(id, prev, fd);
  const archive = () => archiveLossReason(id);
  const [state, action, pending] = useActionState(save, null);
  useRefreshOnOk(state);
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

export function AddReasonForm() {
  const [state, formAction, pending] = useActionState(addLossReason, null);
  useRefreshOnOk(state);
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
