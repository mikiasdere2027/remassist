import type { EngagementRole, OnboardingStep } from '@/db/schema/crm';

/**
 * Customer engagements — pure rules, unit-tested. Reads and writes live in
 * engagementsData.ts.
 */

export const ENGAGEMENT_STATUSES = ['onboarding', 'active', 'paused', 'churned'] as const;
export type EngagementStatus = (typeof ENGAGEMENT_STATUSES)[number];
export const ENGAGEMENT_STATUS_LABELS: Record<EngagementStatus, string> = {
  onboarding: 'Onboarding',
  active: 'Active',
  paused: 'Paused',
  churned: 'Churned',
};

/**
 * The staffing template's onboarding steps. A workspace (industry edition) can
 * replace them with `settings.onboarding` on its workspace row.
 */
export const DEFAULT_ONBOARDING: Array<Pick<OnboardingStep, 'key' | 'label'>> = [
  { key: 'kickoff', label: 'Kick-off call held' },
  { key: 'contract', label: 'Contract signed' },
  { key: 'requirements', label: 'Roles and requirements confirmed' },
  { key: 'shortlist', label: 'Candidates shortlisted' },
  { key: 'interviews', label: 'Client interviews done' },
  { key: 'selected', label: 'Staff selected' },
  { key: 'access', label: 'Tools and access set up' },
  { key: 'sops', label: 'SOPs and processes shared' },
  { key: 'start', label: 'Staff started' },
  { key: 'checkin', label: 'First-week check-in done' },
];

export function onboardingTemplate(settings: Record<string, unknown> | null | undefined): OnboardingStep[] {
  const custom = settings?.onboarding;
  const list = Array.isArray(custom) && custom.every((s) => s && typeof s.key === 'string' && typeof s.label === 'string')
    ? (custom as OnboardingStep[])
    : DEFAULT_ONBOARDING;
  return list.map((s) => ({ key: s.key, label: s.label, doneAt: null, doneBy: null }));
}

export function onboardingProgress(steps: OnboardingStep[]) {
  const total = steps.length;
  const done = steps.filter((s) => Boolean(s.doneAt)).length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100), complete: total > 0 && done === total };
}

/** Days between two YYYY-MM-DD dates (b − a), ignoring time zones. */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** How far ahead a renewal counts as "due" in lists and on the dashboard. */
export const RENEWAL_WINDOW_DAYS = 60;

export interface RenewalState {
  daysLeft: number;
  /** Within the renewal window and not yet passed. */
  due: boolean;
  overdue: boolean;
  /** Last day to give notice, when a notice period is set. */
  noticeBy: string | null;
  noticePassed: boolean;
}

export function renewalState(renewalDate: string | null, noticeDays: number | null, today: string): RenewalState | null {
  if (!renewalDate) return null;
  const daysLeft = daysBetween(today, renewalDate);
  let noticeBy: string | null = null;
  if (noticeDays && noticeDays > 0) {
    const [y, m, d] = renewalDate.split('-').map(Number);
    noticeBy = isoDay(new Date(Date.UTC(y, m - 1, d - noticeDays)));
  }
  return {
    daysLeft,
    due: daysLeft >= 0 && daysLeft <= RENEWAL_WINDOW_DAYS,
    overdue: daysLeft < 0,
    noticeBy,
    noticePassed: noticeBy !== null && daysBetween(today, noticeBy) < 0,
  };
}

/** Roles from a won deal: one line for the service, with its seats and hours. */
export function rolesFromDeal(d: { service: string | null; seats: number | null; hoursPerMonth: number | null }): EngagementRole[] {
  if (!d.seats) return [];
  return [{ role: d.service ?? 'Team member', seats: d.seats, hoursPerMonth: d.hoursPerMonth, staff: [] }];
}

/** Parse the roles editor: one line per role, "Role | seats | hours | staff, staff". */
export function parseRoles(text: string): { roles: EngagementRole[] } | { error: string } {
  const roles: EngagementRole[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 50) return { error: 'Keep it to 50 roles.' };
  for (const [i, line] of lines.entries()) {
    const [role, seats, hours, staff] = line.split('|').map((x) => x.trim());
    if (!role) return { error: `Line ${i + 1}: start with the role name.` };
    if (role.length > 120) return { error: `Line ${i + 1}: the role name is too long.` };
    const n = seats ? Number(seats) : 1;
    if (!Number.isInteger(n) || n < 1 || n > 1000) return { error: `Line ${i + 1}: seats must be a whole number, like 2.` };
    const h = hours ? Number(hours) : null;
    if (h !== null && (!Number.isInteger(h) || h < 0 || h > 100_000)) return { error: `Line ${i + 1}: hours per month must be a whole number.` };
    const people = (staff ?? '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 50);
    roles.push({ role, seats: n, hoursPerMonth: h, staff: people });
  }
  return { roles };
}

export function rolesToText(roles: EngagementRole[]): string {
  return roles
    .map((r) => [r.role, String(r.seats), r.hoursPerMonth ? String(r.hoursPerMonth) : '', (r.staff ?? []).join(', ')]
      .join(' | ').replace(/( \| )+$/, ''))
    .join('\n');
}

export function seatCount(roles: EngagementRole[]): number {
  return roles.reduce((n, r) => n + (r.seats || 0), 0);
}
