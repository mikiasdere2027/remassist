import { crmApi } from '@/lib/api/crm';
import { run, type ActionResult } from '../../crm-actions';

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
