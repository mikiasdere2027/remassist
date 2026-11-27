import { crmApi, MAX_FILE_BYTES } from '@/lib/api/crm';
import { isApiError } from '@/lib/api/errors';
import { fail, ok, run, type ActionResult } from '../crm-actions';

/**
 * Customer (engagement) writes from the customer page. They used to be server
 * actions writing to the database; they now call the backend
 * (/v1/admin/customers), which owns the rules: the last onboarding step makes
 * a customer Active, churn needs a reason, roles lines are parsed there.
 */
const text = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
};

export const updateTerms = (id: string, _prev: ActionResult | null, fd: FormData) =>
  run('Could not save.', () =>
    crmApi.updateTerms(id, {
      title: text(fd, 'title') ?? '',
      service: text(fd, 'service'),
      monthlyValue: text(fd, 'monthlyValue'),
    }),
  );

export const updateRoles = (id: string, _prev: ActionResult | null, fd: FormData) =>
  run('Could not save the roles.', () => crmApi.updateRoles(id, String(fd.get('roles') ?? '')));

export const updateContract = (id: string, _prev: ActionResult | null, fd: FormData) =>
  run('Could not save the contract.', () =>
    crmApi.updateContract(id, {
      startDate: text(fd, 'startDate'),
      contractEnd: text(fd, 'contractEnd'),
      renewalDate: text(fd, 'renewalDate'),
      noticeDays: text(fd, 'noticeDays'),
    }),
  );

export const setStepDone = (id: string, key: string, done: boolean) =>
  run('Could not update the step.', () => crmApi.setOnboardingStep(id, key, done));

export const setEngagementStatus = (id: string, status: string, reason?: string) =>
  run('Could not change the status.', () => crmApi.setEngagementStatus(id, status, reason));

/**
 * Adds a private file (a contract) to the customer. The backend checks the
 * real type from the bytes and stores it outside any public folder.
 */
export async function uploadEngagementFile(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Choose a file first.' };
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: 'Files can be up to 5 MB.' };
  try {
    await crmApi.uploadCustomerFile(id, fd);
    return ok();
  } catch (err) {
    if (isApiError(err) && err.status === 413) return { ok: false, error: 'Files can be up to 5 MB.' };
    return fail(err, 'The upload failed. Try again.');
  }
}

/** Removes a file from the customer. Archived, so it can be recovered. */
export const archiveFile = (fileId: string) => run('Could not remove the file.', () => crmApi.archiveFile(fileId));
