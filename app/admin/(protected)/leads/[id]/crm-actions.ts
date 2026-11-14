import { leadsApi, type Priority } from '@/lib/api/leads';
import { customFromFormData, type FieldDef } from '@/lib/crm/fields';

/**
 * The lead page's actions, called from its client components. They used to be
 * server actions writing to the database; they now call the backend
 * (/v1/admin/leads/*, /v1/admin/tasks/*) and report back in the same shape, so
 * the components and their messages are unchanged. Callers refresh the page's
 * server data on success (router.refresh()).
 */
export type ActionResult = { ok: true; at: number } | { ok: false; error: string };

const ok = (): ActionResult => ({ ok: true, at: Date.now() });

/** The backend's message, or its first field message, or a fallback. */
function fail(err: unknown, fallback: string): ActionResult {
  if (err && typeof err === 'object' && 'issues' in err) {
    const issues = (err as { issues: { message: string }[] }).issues;
    if (issues?.[0]?.message) return { ok: false, error: issues[0].message };
  }
  const message = err instanceof Error ? err.message : '';
  return {
    ok: false,
    error: message && message !== 'Validation failed' && !/^Request failed/.test(message) ? message : fallback,
  };
}

async function run(fallback: string, call: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await call();
    return ok();
  } catch (err) {
    return fail(err, fallback);
  }
}

export const setLeadStatus = (leadId: string, status: string) =>
  run('Could not change the status.', () => leadsApi.setStatus(leadId, status));

export const setLeadOwner = (leadId: string, ownerId: string) =>
  run('Could not change the owner.', () => leadsApi.setOwner(leadId, ownerId || null));

export const setLeadPriority = (leadId: string, priority: string) =>
  run('Could not change the priority.', () => leadsApi.setPriority(leadId, priority as Priority));

export const addLeadNote = (leadId: string, fd: FormData) =>
  run('Could not add the note.', () => leadsApi.addNote(leadId, String(fd.get('body') ?? '')));

export const logLeadCall = (leadId: string, fd: FormData) =>
  run('Could not log the call.', () =>
    leadsApi.logCall(leadId, {
      outcome: String(fd.get('outcome') ?? ''),
      minutes: Number(fd.get('minutes') || 0),
      body: String(fd.get('body') ?? '').trim() || undefined,
    }),
  );

/** The due field is a datetime-local in the viewer's own zone. */
export function addLeadTask(leadId: string, fd: FormData): Promise<ActionResult> {
  const dueRaw = String(fd.get('due') ?? '');
  const due = dueRaw ? new Date(dueRaw) : null;
  if (due && Number.isNaN(due.getTime())) {
    return Promise.resolve({ ok: false, error: 'That due date is not valid.' });
  }
  return run('Could not add the task.', () =>
    leadsApi.addTask(leadId, {
      title: String(fd.get('title') ?? ''),
      priority: (String(fd.get('priority') || 'medium') as Priority),
      dueAt: due ? due.toISOString() : null,
      assigneeId: String(fd.get('assigneeId') ?? '') || undefined,
    }),
  );
}

export const setTaskDone = (taskId: string, done: boolean) =>
  run('Could not update the task.', () => leadsApi.setTaskDone(taskId, done));

export const saveQualification = (leadId: string, defs: FieldDef[], fd: FormData) =>
  run('Could not save the qualification.', () =>
    leadsApi.saveQualification(leadId, customFromFormData(defs, fd)),
  );
