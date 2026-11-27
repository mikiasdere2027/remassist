import { crmApi } from '@/lib/api/crm';
import { run, type ActionResult } from '../crm-actions';

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
