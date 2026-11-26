import { crmApi } from '@/lib/api/crm';
import { run, type ActionResult } from '../crm-actions';

/**
 * Company and contact writes from the company page. They used to be server
 * actions writing to the database; they now call the backend
 * (/v1/admin/companies, /v1/admin/contacts), which refuses duplicate domains
 * and emails and keeps one primary contact per company.
 */
const text = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
};

export const updateCompany = (id: string, _prev: ActionResult | null, fd: FormData) =>
  run('Could not save the company.', () =>
    crmApi.updateCompany(id, {
      name: text(fd, 'name') ?? '',
      website: text(fd, 'website'),
      industry: text(fd, 'industry'),
      size: text(fd, 'size'),
      country: text(fd, 'country'),
    }),
  );

export const addContact = (companyId: string, _prev: ActionResult | null, fd: FormData) =>
  run('Could not add the contact.', () =>
    crmApi.addContact({
      companyId,
      firstName: text(fd, 'firstName'),
      lastName: text(fd, 'lastName'),
      email: text(fd, 'email'),
      phone: text(fd, 'phone'),
      jobTitle: text(fd, 'jobTitle'),
    }),
  );

export const archiveContact = (id: string) =>
  run('Could not remove the contact.', () => crmApi.archiveContact(id));
