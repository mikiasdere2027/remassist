import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ONBOARDING, daysBetween, onboardingProgress, onboardingTemplate, parseRoles, renewalState, rolesFromDeal, rolesToText, seatCount,
} from './engagements';

describe('onboarding', () => {
  it('uses the staffing steps unless the workspace has its own', () => {
    expect(onboardingTemplate(null)).toHaveLength(DEFAULT_ONBOARDING.length);
    expect(onboardingTemplate({ onboarding: [{ key: 'a', label: 'Alpha' }] })).toEqual([{ key: 'a', label: 'Alpha', doneAt: null, doneBy: null }]);
    expect(onboardingTemplate({ onboarding: 'nonsense' })).toHaveLength(DEFAULT_ONBOARDING.length);
  });
  it('measures progress', () => {
    const steps = onboardingTemplate(null);
    expect(onboardingProgress(steps)).toEqual({ done: 0, total: 10, pct: 0, complete: false });
    steps.forEach((s, i) => { if (i < 4) s.doneAt = '2026-11-01T00:00:00Z'; });
    expect(onboardingProgress(steps).pct).toBe(40);
    steps.forEach((s) => { s.doneAt = 'x'; });
    expect(onboardingProgress(steps).complete).toBe(true);
    expect(onboardingProgress([])).toEqual({ done: 0, total: 0, pct: 0, complete: false });
  });
});

describe('renewals', () => {
  it('counts days between calendar dates', () => {
    expect(daysBetween('2026-11-23', '2026-12-23')).toBe(30);
    expect(daysBetween('2026-03-01', '2026-02-27')).toBe(-2);
  });
  it('flags renewals inside 60 days, overdue ones and the notice deadline', () => {
    expect(renewalState(null, null, '2026-11-23')).toBeNull();
    expect(renewalState('2027-06-01', null, '2026-11-23')).toMatchObject({ due: false, overdue: false, noticeBy: null });
    expect(renewalState('2027-01-10', 30, '2026-11-23')).toEqual({ daysLeft: 48, due: true, overdue: false, noticeBy: '2026-12-11', noticePassed: false });
    expect(renewalState('2026-12-10', 30, '2026-11-23')).toMatchObject({ due: true, noticeBy: '2026-11-10', noticePassed: true });
    expect(renewalState('2026-11-01', null, '2026-11-23')).toMatchObject({ overdue: true, due: false });
  });
});

describe('roles', () => {
  it('come from a won deal', () => {
    expect(rolesFromDeal({ service: 'SDR as a Service', seats: 2, hoursPerMonth: 320 })).toEqual([
      { role: 'SDR as a Service', seats: 2, hoursPerMonth: 320, staff: [] },
    ]);
    expect(rolesFromDeal({ service: null, seats: null, hoursPerMonth: null })).toEqual([]);
  });
  it('round-trip through the text editor', () => {
    const parsed = parseRoles('SDR | 2 | 320 | Hana, Dawit\nSales ops\n\nCS lead | 1 |  | Selam');
    expect(parsed).toEqual({ roles: [
      { role: 'SDR', seats: 2, hoursPerMonth: 320, staff: ['Hana', 'Dawit'] },
      { role: 'Sales ops', seats: 1, hoursPerMonth: null, staff: [] },
      { role: 'CS lead', seats: 1, hoursPerMonth: null, staff: ['Selam'] },
    ] });
    if ('roles' in parsed) {
      expect(seatCount(parsed.roles)).toBe(4);
      expect(parseRoles(rolesToText(parsed.roles))).toEqual(parsed);
    }
  });
  it('explain bad lines', () => {
    expect(parseRoles('SDR | two')).toEqual({ error: 'Line 1: seats must be a whole number, like 2.' });
    expect(parseRoles('| 2')).toEqual({ error: 'Line 1: start with the role name.' });
  });
});
