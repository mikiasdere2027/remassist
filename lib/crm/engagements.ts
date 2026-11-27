import type { EngagementRole, EngagementStatus } from '@/lib/api/crm';

/**
 * How customers (engagements) are shown. The rules — onboarding, renewals,
 * parsing roles — live in the backend; it sends progress and renewal state
 * ready to display.
 */
export const ENGAGEMENT_STATUS_LABELS: Record<EngagementStatus, string> = {
  onboarding: 'Onboarding',
  active: 'Active',
  paused: 'Paused',
  churned: 'Churned',
};

/** The Customers list's views. "Renewal due" is derived, not a status. */
export const CUSTOMER_VIEWS = [
  { key: '', label: 'All' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'active', label: 'Active' },
  { key: 'renewal', label: 'Renewal due' },
  { key: 'paused', label: 'Paused' },
  { key: 'churned', label: 'Churned' },
] as const;

/** Roles back into the editor's lines: "Role | seats | hours | staff, staff". */
export function rolesToText(roles: EngagementRole[]): string {
  return roles
    .map((r) =>
      [r.role, String(r.seats), r.hoursPerMonth ? String(r.hoursPerMonth) : '', (r.staff ?? []).join(', ')]
        .join(' | ')
        .replace(/( \| )+$/, ''),
    )
    .join('\n');
}

export function seatCount(roles: EngagementRole[]): number {
  return roles.reduce((n, r) => n + (r.seats || 0), 0);
}
