import type { TaskListItem } from '@/lib/api/leads';

/**
 * The record a task on the Tasks page belongs to, and where to open it. A task
 * is attached to one lead, deal, customer or company; the list used to show
 * only leads, so the other kinds had no link.
 */
export function taskTarget(t: Pick<TaskListItem,
  'leadId' | 'leadName' | 'leadEmail' | 'leadCompany' | 'dealId' | 'dealTitle' | 'companyId' | 'companyName' | 'engagementId' | 'engagementTitle'
>): { href: string; label: string } | null {
  if (t.leadId) return { href: `/admin/leads/${t.leadId}`, label: `${t.leadName || t.leadEmail || 'Lead'}${t.leadCompany ? ` · ${t.leadCompany}` : ''}` };
  if (t.dealId) return { href: `/admin/deals/${t.dealId}`, label: `Deal: ${t.dealTitle ?? 'Deal'}` };
  if (t.engagementId) return { href: `/admin/customers/${t.engagementId}`, label: `Customer: ${t.engagementTitle ?? 'Customer'}` };
  if (t.companyId) return { href: `/admin/companies/${t.companyId}`, label: `Company: ${t.companyName ?? 'Company'}` };
  return null;
}
