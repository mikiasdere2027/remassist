import { crmApi, type AssignMode } from '@/lib/api/crm';
import type { Assignee } from '@/lib/api/leads';
import { parseRules } from '@/lib/crm/automation';
import { fail, ok, run, type ActionResult } from '../../crm-actions';

/**
 * Pipeline stages and loss reasons (admins). They used to be server actions
 * writing to the database; they now call the backend (/v1/admin/crm/*),
 * which enforces the rules: Won stays 100% and Lost 0%, Won and Lost can't
 * be archived, nor the last open stage or one that still has deals.
 */
const text = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

export const addStage = (_prev: ActionResult | null, fd: FormData) =>
  run('Could not add the stage.', () =>
    crmApi.addStage({ name: text(fd, 'name'), probability: Number(text(fd, 'probability') || 0) }),
  );

export const saveStage = (id: string, _prev: ActionResult | null, fd: FormData) =>
  run('Could not save the stage.', () =>
    crmApi.updateStage(id, { name: text(fd, 'name'), probability: Number(text(fd, 'probability') || 0) }),
  );

export const moveStage = (id: string, direction: 'up' | 'down') =>
  run('Could not move the stage.', () => crmApi.moveStage(id, direction));

export const archiveStage = (id: string) =>
  run('Could not archive the stage.', () => crmApi.archiveStage(id));

export const addLossReason = (_prev: ActionResult | null, fd: FormData) =>
  run('Could not add the reason.', () => crmApi.addLossReason(text(fd, 'label')));

export const saveLossReason = (id: string, _prev: ActionResult | null, fd: FormData) =>
  run('Could not save the reason.', () => crmApi.updateLossReason(id, text(fd, 'label')));

export const archiveLossReason = (id: string) =>
  run('Could not archive the reason.', () => crmApi.archiveLossReason(id));

/**
 * Lead assignment and the first-contact task (Mikias's saveAutomation). The
 * backend checks that everyone named is still on the team.
 */
export async function saveAutomation(team: Assignee[], _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const rules = parseRules(String(fd.get('rules') ?? ''), team);
  if (!rules.ok) return rules;
  const hours = Number(fd.get('firstContactHours') || 2);
  if (!Number.isInteger(hours) || hours < 1 || hours > 72) return { ok: false, error: 'The reply target is 1 to 72 business hours.' };
  const assignMode = String(fd.get('assignMode') ?? 'off') as AssignMode;
  const defaultOwnerId = String(fd.get('defaultOwnerId') ?? '') || null;
  if (assignMode === 'single' && !defaultOwnerId) return { ok: false, error: 'Choose who gets every new lead.' };
  try {
    await crmApi.saveAutomation({
      assignMode,
      defaultOwnerId: assignMode === 'single' ? defaultOwnerId : null,
      pool: fd.getAll('pool').map(String),
      rules: rules.rules,
      firstContactTask: fd.get('firstContactTask') === 'on',
      firstContactHours: hours,
    });
    return ok();
  } catch (err) {
    return fail(err, 'Could not save the settings.');
  }
}

/** Post today's digest to Slack now (what the 09:00 weekday run does). */
export const sendDigestNow = () => run('Could not send the digest.', () => crmApi.sendDigest());
