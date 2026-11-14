'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import {
  addLeadNote,
  addLeadTask,
  logLeadCall,
  saveQualification,
  setLeadOwner,
  setLeadPriority,
  setTaskDone,
  type ActionResult,
} from './crm-actions';
import type { FieldDef } from '@/lib/crm/fields';
import { CALL_OUTCOMES, CALL_OUTCOME_LABELS, PRIORITIES, PRIORITY_LABELS } from '@/lib/crm/display';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

/* Inline, not the hidden attribute: .cardBody sets display, which beats [hidden].
   Kept mounted so a half-written note survives switching tabs. */
const HIDE = { display: 'none' } as const;

/** Re-fetch the page's server data after a successful save. */
function useRefreshOnOk(state: ActionResult | null) {
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);
}

/** A date in the viewer's own time zone. Server render shows UTC until hydration. */
export function LocalTime({ iso, mode = 'datetime' }: { iso: string; mode?: 'datetime' | 'date' }) {
  const [text, setText] = useState(() => iso.replace('T', ' ').slice(0, 16) + ' UTC');
  useEffect(() => {
    const d = new Date(iso);
    setText(
      d.toLocaleString(undefined, mode === 'date'
        ? { month: 'short', day: 'numeric', year: 'numeric' }
        : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    );
  }, [iso, mode]);
  return <time dateTime={iso} title={iso}>{text}</time>;
}

/** A select that saves on change (owner, priority). */
export function InlineSelect({
  id, label, value, options, leadId, field, placeholder,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  leadId: string;
  field: 'owner' | 'priority';
  placeholder?: string;
}) {
  const router = useRouter();
  const action = (v: string) => (field === 'owner' ? setLeadOwner(leadId, v) : setLeadPriority(leadId, v));
  const [current, setCurrent] = useState(value);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setCurrent(value), [value]);

  return (
    <div className={s.kv}>
      <label className={s.kvLabel} htmlFor={id}>{label}</label>
      <select
        id={id}
        className={s.select}
        value={current}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          const prev = current;
          setCurrent(next);
          setError(null);
          start(async () => {
            const r = await action(next).catch(() => ({ ok: false as const, error: 'Could not save. Try again.' }));
            if (!r.ok) {
              setCurrent(prev);
              setError(r.error);
            } else {
              router.refresh();
            }
          });
        }}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {pending && <span className={s.saving}>Saving…</span>}
      {error && <span className={s.error} role="alert">{error}</span>}
    </div>
  );
}

function useResetOnSuccess(state: ActionResult | null) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

function Feedback({ state, pending, okText }: { state: ActionResult | null; pending: boolean; okText: string }) {
  if (pending) return <span className={s.saving}>Saving…</span>;
  if (!state) return null;
  return state.ok
    ? <span className={s.saving} role="status">{okText}</span>
    : <span className={s.error} role="alert">{state.error}</span>;
}

/** Add a note, log a call, or create a task — the three things done most. */
export function Composer({
  leadId, team, me,
}: {
  leadId: string;
  team: Array<{ id: string; name: string }>;
  me: string;
}) {
  const [mode, setMode] = useState<'note' | 'call' | 'task'>('note');
  const [noteState, noteAction, notePending] = useActionState(
    (_prev: ActionResult | null, fd: FormData) => addLeadNote(leadId, fd), null);
  const [callState, callAction, callPending] = useActionState(
    (_prev: ActionResult | null, fd: FormData) => logLeadCall(leadId, fd), null);
  const [taskState, taskAction, taskPending] = useActionState(
    (_prev: ActionResult | null, fd: FormData) => addLeadTask(leadId, fd), null);
  useRefreshOnOk(noteState);
  useRefreshOnOk(callState);
  useRefreshOnOk(taskState);
  const noteRef = useResetOnSuccess(noteState);
  const callRef = useResetOnSuccess(callState);
  const taskRef = useResetOnSuccess(taskState);

  const tabs = [
    { key: 'note', label: 'Note' },
    { key: 'call', label: 'Log a call' },
    { key: 'task', label: 'Task' },
  ] as const;

  return (
    <section className={s.card} aria-label="Add to this lead">
      <div className={s.composerTabs} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={mode === t.key}
            className={`${s.composerTab} ${mode === t.key ? s.composerTabOn : ''}`}
            onClick={() => setMode(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form ref={noteRef} action={noteAction} className={s.cardBody} style={mode === 'note' ? undefined : HIDE}>
        <label className={s.label} htmlFor="note-body">Note</label>
        <textarea id="note-body" name="body" className={s.textarea} placeholder="What did you learn? Next steps?" required maxLength={10000} />
        <div className={s.formFoot}>
          <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={notePending}>Add note</button>
          <Feedback state={noteState} pending={notePending} okText="Note added" />
        </div>
      </form>

      <form ref={callRef} action={callAction} className={s.cardBody} style={mode === 'call' ? undefined : HIDE}>
        <div className={s.composerRow}>
          <div>
            <label className={s.label} htmlFor="call-outcome">Outcome</label>
            <select id="call-outcome" name="outcome" className={s.select} defaultValue="connected" required>
              {CALL_OUTCOMES.map((o) => <option key={o} value={o}>{CALL_OUTCOME_LABELS[o]}</option>)}
            </select>
          </div>
          <div>
            <label className={s.label} htmlFor="call-minutes">Minutes</label>
            <input id="call-minutes" name="minutes" type="number" min={0} max={600} inputMode="numeric" className={s.input} placeholder="0" />
          </div>
        </div>
        <label className={s.label} htmlFor="call-body">Call notes</label>
        <textarea id="call-body" name="body" className={s.textarea} placeholder="What was discussed?" maxLength={10000} />
        <div className={s.formFoot}>
          <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={callPending}>Log call</button>
          <Feedback state={callState} pending={callPending} okText="Call logged" />
        </div>
      </form>

      <form ref={taskRef} action={taskAction} className={s.cardBody} style={mode === 'task' ? undefined : HIDE}>
        <div>
          <label className={s.label} htmlFor="task-title">Task</label>
          <input id="task-title" name="title" className={s.input} placeholder="e.g. Send case studies and book a discovery call" required maxLength={200} />
        </div>
        <div className={s.composerRow}>
          <div>
            <label className={s.label} htmlFor="task-due">Due</label>
            <input id="task-due" name="due" type="datetime-local" className={s.input} />
          </div>
          <div>
            <label className={s.label} htmlFor="task-assignee">Assigned to</label>
            <select id="task-assignee" name="assigneeId" className={s.select} defaultValue={me}>
              {team.map((m) => <option key={m.id} value={m.id}>{m.id === me ? `${m.name} (me)` : m.name}</option>)}
            </select>
          </div>
          <div>
            <label className={s.label} htmlFor="task-priority">Priority</label>
            <select id="task-priority" name="priority" className={s.select} defaultValue="medium">
              {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
          </div>
        </div>
        <div className={s.formFoot}>
          <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={taskPending}>Add task</button>
          <Feedback state={taskState} pending={taskPending} okText="Task added" />
        </div>
      </form>
    </section>
  );
}

/** Tick a task done (or reopen it). */
export function TaskCheck({ id, title, done }: {
  id: string;
  title: string;
  done: boolean;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(done);
  const [pending, start] = useTransition();
  useEffect(() => setChecked(done), [done]);
  return (
    <input
      type="checkbox"
      aria-label={`${done ? 'Reopen' : 'Complete'}: ${title}`}
      checked={checked}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.checked;
        setChecked(next);
        start(async () => {
          const r = await setTaskDone(id, next).catch(() => ({ ok: false as const, error: '' }));
          if (!r.ok) setChecked(!next);
          else router.refresh();
        });
      }}
    />
  );
}

/** The Qualification tab: the workspace's lead fields, rendered from their definitions. */
export function QualificationForm({ defs, values, leadId }: {
  defs: FieldDef[];
  values: Record<string, unknown>;
  leadId: string;
}) {
  const [state, formAction, pending] = useActionState(
    (_prev: ActionResult | null, fd: FormData) => saveQualification(leadId, defs, fd), null);
  useRefreshOnOk(state);
  const live = defs.filter((d) => !d.archivedAt);
  if (live.length === 0) {
    return <p className={s.muted}>No qualification fields are set up for this workspace.</p>;
  }
  return (
    <form action={formAction} className={s.cardBody}>
      <div className={s.fieldGrid}>
        {live.map((d) => {
          const id = `cf-${d.key}`;
          const v = values[d.key];
          const wide = d.type === 'long_text' || d.type === 'multiselect';
          return (
            <div key={d.key} className={wide ? s.fieldWide : undefined}>
              {d.type === 'multiselect' ? (
                <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
                  <legend className={s.label}>{d.label}</legend>
                  <div className={s.chips}>
                    {(d.options ?? []).map((o) => (
                      <label key={o} className={s.chip}>
                        <input type="checkbox" name={`cf_${d.key}`} value={o} defaultChecked={Array.isArray(v) && v.includes(o)} />
                        {o}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <>
                  <label className={s.label} htmlFor={id}>{d.label}{d.required ? ' *' : ''}</label>
                  {d.type === 'select' ? (
                    <select id={id} name={`cf_${d.key}`} className={s.select} defaultValue={typeof v === 'string' ? v : ''} required={d.required}>
                      <option value="">Not set</option>
                      {(d.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : d.type === 'long_text' ? (
                    <textarea id={id} name={`cf_${d.key}`} className={s.textarea} defaultValue={typeof v === 'string' ? v : ''} required={d.required} maxLength={10000} />
                  ) : d.type === 'boolean' ? (
                    <input id={id} name={`cf_${d.key}`} type="checkbox" defaultChecked={v === true} />
                  ) : (
                    <input
                      id={id}
                      name={`cf_${d.key}`}
                      className={s.input}
                      type={d.type === 'number' ? 'number' : d.type === 'date' ? 'date' : d.type === 'url' ? 'url' : d.type === 'email' ? 'email' : d.type === 'phone' ? 'tel' : 'text'}
                      defaultValue={v === null || v === undefined ? '' : String(v)}
                      required={d.required}
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className={s.formFoot}>
        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={pending}>Save qualification</button>
        <Feedback state={state} pending={pending} okText="Saved" />
      </div>
    </form>
  );
}
