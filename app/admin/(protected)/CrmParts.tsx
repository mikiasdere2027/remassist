import { CALL_OUTCOME_LABELS, STATUS_LABELS, type CallOutcome } from '@/lib/crm/display';
import { formatMoney } from '@/lib/crm/money';
import { LocalTime, TaskCheck } from './leads/[id]/LeadClient';
import { setTaskDone } from './leads/[id]/actions';
import admin from '../admin.module.css';
import s from './crm.module.css';

/**
 * Pieces every CRM record page shares: label/value rows, the task list and the
 * activity timeline. Server components; the interactive bits they contain
 * (tick a task, local times) are the client components in LeadClient.
 */

export function KV({ label, children }: { label: string; children: React.ReactNode }) {
  const empty = children === null || children === undefined || children === '';
  return (
    <div className={s.kv}>
      <span className={s.kvLabel}>{label}</span>
      <span className={s.kvValue}>{empty ? <span className={s.muted}>Not provided</span> : children}</span>
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className={admin.memberBackBtn} href={href}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
      {children}
    </a>
  );
}

type TaskLike = {
  id: string;
  title: string;
  dueAt: Date | null;
  doneAt: Date | null;
  priority: string;
  assigneeName: string | null;
  assigneeEmail: string | null;
};

export function TaskItems({ items }: { items: TaskLike[] }) {
  const now = Date.now();
  return (
    <ul className={s.taskList}>
      {items.map((t) => {
        const overdue = !t.doneAt && t.dueAt && t.dueAt.getTime() < now;
        return (
          <li key={t.id} className={`${s.task} ${t.doneAt ? s.taskDone : ''}`}>
            <TaskCheck id={t.id} title={t.title} done={Boolean(t.doneAt)} action={setTaskDone} />
            <div>
              <div className={s.taskTitle}>{t.title}</div>
              <div className={s.taskMeta}>
                {t.dueAt && (
                  <span className={overdue ? s.overdue : undefined}>
                    {overdue ? 'Overdue · ' : 'Due '}<LocalTime iso={t.dueAt.toISOString()} />
                  </span>
                )}
                <span>{t.assigneeName || t.assigneeEmail || 'Unassigned'}</span>
                {t.priority === 'high' && <span className={s.overdue}>High</span>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** The rail's task card: open tasks, completed ones folded away. */
export function TasksCard({ tasks, emptyHint }: { tasks: TaskLike[]; emptyHint: string }) {
  const open = tasks.filter((t) => !t.doneAt);
  const doneTasks = tasks.filter((t) => t.doneAt);
  return (
    <section className={s.card}>
      <div className={s.cardHead}>
        <h2 className={s.cardTitle}>Tasks</h2>
        <span className={s.cardNote}>{open.length} open</span>
      </div>
      <div className={s.cardBody}>
        {open.length === 0 ? <p className={s.cardNote}>{emptyHint}</p> : <TaskItems items={open} />}
        {doneTasks.length > 0 && (
          <details>
            <summary className={s.doneToggle}>{doneTasks.length} completed</summary>
            <TaskItems items={doneTasks} />
          </details>
        )}
      </div>
    </section>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  note: <path d="M4 4h12l4 4v12H4zM8 10h8M8 14h8M8 18h5" />,
  call: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  status_change: <path d="M4 12h12M12 6l6 6-6 6" />,
  stage_change: <path d="M3 17h4V7H3zM10 17h4V4h-4zM17 17h4v-7h-4z" />,
  owner_change: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  system: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></>,
};

export type TimelineItem = {
  id: string;
  type: string;
  body: string | null;
  meta: unknown;
  occurredAt: Date;
  actorName: string | null;
  actorEmail: string | null;
};

function TimelineEntry({ a, subject }: { a: TimelineItem; subject: string }) {
  const who = a.actorName?.trim() || a.actorEmail || 'System';
  const meta = (a.meta ?? {}) as Record<string, unknown>;
  let head: React.ReactNode;
  let body: string | null = a.body;

  switch (a.type) {
    case 'note':
      head = <><b>{who}</b> added a note</>;
      break;
    case 'call': {
      const outcome = CALL_OUTCOME_LABELS[meta.outcome as CallOutcome] ?? 'Call';
      const mins = Math.round(Number(meta.durationSec ?? 0) / 60);
      head = <><b>{who}</b> logged a call · {outcome}{mins > 0 ? ` · ${mins} min` : ''}</>;
      break;
    }
    case 'status_change':
      head = <><b>{who}</b> changed status: {STATUS_LABELS[String(meta.from)] ?? String(meta.from)} → <b>{STATUS_LABELS[String(meta.to)] ?? String(meta.to)}</b></>;
      body = null;
      break;
    case 'stage_change':
      head = <><b>{who}</b> moved the deal {meta.fromName ? <>from {String(meta.fromName)} </> : null}to <b>{String(meta.toName ?? 'another stage')}</b></>;
      break;
    case 'owner_change':
      head = meta.to
        ? <><b>{who}</b> assigned the {subject}{meta.toName ? <> to <b>{String(meta.toName)}</b></> : ' to a new owner'}</>
        : <><b>{who}</b> unassigned the {subject}</>;
      body = null;
      break;
    default:
      head = a.actorName || a.actorEmail ? <><b>{who}</b> · {a.body}</> : <>{a.body}</>;
      body = null;
  }

  const reasons = Array.isArray(meta.reasons) ? (meta.reasons as string[]) : null;
  return (
    <li className={s.event}>
      <span className={`${s.eventIcon} ${s[`ev_${a.type}`] ?? ''}`} aria-hidden="true">
        <svg viewBox="0 0 24 24">{ICONS[a.type] ?? ICONS.system}</svg>
      </span>
      <div>
        <div className={s.eventHead}>
          <span>{head}</span>
          <span className={s.eventTime}><LocalTime iso={a.occurredAt.toISOString()} /></span>
        </div>
        {body && <p className={s.eventBody}>{body}</p>}
        {reasons && reasons.length > 0 && (
          <ul className={s.reasons} aria-label="Score reasons">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        )}
      </div>
    </li>
  );
}

export function TimelineCard({ items, subject }: { items: TimelineItem[]; subject: string }) {
  return (
    <section className={s.card}>
      <div className={s.cardHead}>
        <h2 className={s.cardTitle}>Activity</h2>
        <span className={s.cardNote}>{items.length} {items.length === 1 ? 'entry' : 'entries'}</span>
      </div>
      {items.length === 0 ? (
        <p className={admin.empty}>
          <strong>No activity yet</strong>
          Notes, calls, tasks and changes will appear here.
        </p>
      ) : (
        <ol className={s.timeline}>
          {items.map((a) => <TimelineEntry key={a.id} a={a} subject={subject} />)}
        </ol>
      )}
    </section>
  );
}

export function Money({ cents, currency }: { cents: number; currency?: string }) {
  return <>{formatMoney(cents, currency)}</>;
}
