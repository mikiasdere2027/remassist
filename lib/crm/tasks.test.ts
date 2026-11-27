import { describe, expect, it } from 'vitest';
import { taskTarget } from './tasks';

const none = { leadId: null, leadName: null, leadEmail: null, leadCompany: null, dealId: null, dealTitle: null, companyId: null, companyName: null, engagementId: null, engagementTitle: null };

describe('taskTarget: the record a task belongs to', () => {
  it('a lead: name (or email) and company, as before', () => {
    expect(taskTarget({ ...none, leadId: 'l1', leadName: 'Sara Bekele', leadEmail: 's@a.io', leadCompany: 'Acme' }))
      .toEqual({ href: '/admin/leads/l1', label: 'Sara Bekele · Acme' });
    expect(taskTarget({ ...none, leadId: 'l1', leadEmail: 's@a.io' })).toEqual({ href: '/admin/leads/l1', label: 's@a.io' });
  });
  it('a deal, a customer and a company link to their own page', () => {
    expect(taskTarget({ ...none, dealId: 'd1', dealTitle: 'Acme — SDRs' })).toEqual({ href: '/admin/deals/d1', label: 'Deal: Acme — SDRs' });
    expect(taskTarget({ ...none, engagementId: 'e1', engagementTitle: 'Acme — SDRs' })).toEqual({ href: '/admin/customers/e1', label: 'Customer: Acme — SDRs' });
    expect(taskTarget({ ...none, companyId: 'c1', companyName: 'Acme' })).toEqual({ href: '/admin/companies/c1', label: 'Company: Acme' });
  });
  it('has no target when it is attached to nothing', () => {
    expect(taskTarget(none)).toBeNull();
  });
});
