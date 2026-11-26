import { leadsApi, type Priority } from '@/lib/api/leads';
import { run } from '../../crm-actions';
import { customFromFormData, type FieldDef } from '@/lib/crm/fields';

/**
 * The lead page's own actions (status, owner, priority, qualification),
 * called from its client components. Note / call / task are shared with deals
 * and companies (../../crm-actions.ts). They used to be
 * server actions writing to the database; they now call the backend
 * (/v1/admin/leads/*, /v1/admin/tasks/*) and report back in the same shape, so
 * the components and their messages are unchanged. Callers refresh the page's
 * server data on success (router.refresh()).
 */
export { setTaskDone, type ActionResult } from '../../crm-actions';

export const setLeadStatus = (leadId: string, status: string) =>
  run('Could not change the status.', () => leadsApi.setStatus(leadId, status));

export const setLeadOwner = (leadId: string, ownerId: string) =>
  run('Could not change the owner.', () => leadsApi.setOwner(leadId, ownerId || null));

export const setLeadPriority = (leadId: string, priority: string) =>
  run('Could not change the priority.', () => leadsApi.setPriority(leadId, priority as Priority));

export const saveQualification = (leadId: string, defs: FieldDef[], fd: FormData) =>
  run('Could not save the qualification.', () =>
    leadsApi.saveQualification(leadId, customFromFormData(defs, fd)),
  );
