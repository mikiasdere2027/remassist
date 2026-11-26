import { crmApi, type RecordKind } from '@/lib/api/crm';
import { leadsApi, type Priority } from '@/lib/api/leads';

/**
 * Note / call / task on any record (lead, deal or company) — what the shared
 * composer calls — plus the helpers every CRM action uses. These used to be
 * server actions writing to the database; they now call the backend and
 * report back in the same shape, so the components and their messages are
 * unchanged. Callers refresh the page's server data on success
 * (router.refresh()).
 */
export type ActionResult = { ok: true; at: number } | { ok: false; error: string };

/** The record an action applies to. */
export interface RecordRef {
  kind: RecordKind;
  id: string;
}

export const ok = (): ActionResult => ({ ok: true, at: Date.now() });

/** The backend's message, or its first field message, or a fallback. */
export function fail(err: unknown, fallback: string): ActionResult {
  if (err && typeof err === 'object' && 'issues' in err) {
    const issues = (err as { issues: { message: string }[] }).issues;
    if (issues?.[0]?.message) return { ok: false, error: issues[0].message };
  }
  const message = err instanceof Error ? err.message : '';
  return {
    ok: false,
    error:
      message && message !== 'Validation failed' && !/^Request failed/.test(message)
        ? message
        : fallback,
  };
}

/** Run one API call and report it as an ActionResult. */
export async function run(fallback: string, call: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await call();
    return ok();
  } catch (err) {
    return fail(err, fallback);
  }
}

export const addRecordNote = (record: RecordRef, fd: FormData) =>
  run('Could not add the note.', () =>
    crmApi.addNote(record.kind, record.id, String(fd.get('body') ?? '')),
  );

export const logRecordCall = (record: RecordRef, fd: FormData) =>
  run('Could not log the call.', () =>
    crmApi.logCall(record.kind, record.id, {
      outcome: String(fd.get('outcome') ?? ''),
      minutes: Number(fd.get('minutes') || 0),
      body: String(fd.get('body') ?? '').trim() || undefined,
    }),
  );

/** The due field is a datetime-local in the viewer's own zone. */
export function addRecordTask(record: RecordRef, fd: FormData): Promise<ActionResult> {
  const dueRaw = String(fd.get('due') ?? '');
  const due = dueRaw ? new Date(dueRaw) : null;
  if (due && Number.isNaN(due.getTime())) {
    return Promise.resolve({ ok: false, error: 'That due date is not valid.' });
  }
  return run('Could not add the task.', () =>
    crmApi.addTask(record.kind, record.id, {
      title: String(fd.get('title') ?? ''),
      priority: String(fd.get('priority') || 'medium') as Priority,
      dueAt: due ? due.toISOString() : null,
      assigneeId: String(fd.get('assigneeId') ?? '') || undefined,
    }),
  );
}

export const setTaskDone = (taskId: string, done: boolean) =>
  run('Could not update the task.', () => leadsApi.setTaskDone(taskId, done));
