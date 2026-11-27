import { describe, expect, it } from 'vitest';
import {
  calculateUptimeRemedy,
  classifyLeadSla,
  etWallToUtc,
  evaluateSpeedToLead,
  isWithinSlaCoverage,
  nextCadenceDueAt,
  reconcileCommissionAppointments,
  slaCallbackDueAt,
} from './sla';

describe('America/New_York 7-day SLA clock', () => {
  it('treats 9:00 AM–8:59 PM ET as in coverage 7 days a week, across EST and EDT', () => {
    // Saturday in EST (UTC-5): 10:00 AM ET = 15:00 UTC
    expect(isWithinSlaCoverage(new Date('2026-11-28T15:00:00Z'))).toBe(true);
    // Sunday in EDT (UTC-4): 8:30 PM ET = 00:30 UTC next day
    expect(isWithinSlaCoverage(new Date('2026-07-06T00:30:00Z'))).toBe(true);
    // 9:00 PM ET in EST = 02:00 UTC next day -> outside coverage
    expect(isWithinSlaCoverage(new Date('2026-11-28T02:00:00Z'))).toBe(false);
    // 8:59 AM ET in EST = 13:59 UTC -> outside coverage
    expect(isWithinSlaCoverage(new Date('2026-11-28T13:59:00Z'))).toBe(false);
  });

  it('computes 3-minute callback deadline during shift and rolls after-hours to 9:03 AM ET', () => {
    const inShift = etWallToUtc(2026, 11, 28, 14, 10, 0);
    expect(slaCallbackDueAt(inShift).toISOString()).toBe(etWallToUtc(2026, 11, 28, 14, 13, 0).toISOString());

    const lateNight = etWallToUtc(2026, 11, 28, 22, 15, 0);
    expect(slaCallbackDueAt(lateNight).toISOString()).toBe(etWallToUtc(2026, 11, 29, 9, 3, 0).toISOString());
  });
});

describe('SLA exclusion & speed-to-lead evaluation', () => {
  it('classifies invalid phone, after hours, and >2-lead bursts', () => {
    const inShift = etWallToUtc(2026, 11, 28, 11, 0, 0);
    expect(classifyLeadSla({ createdAt: inShift, hasValidPhone: false })).toBe('invalid_phone');
    expect(classifyLeadSla({ createdAt: etWallToUtc(2026, 11, 28, 22, 0, 0), hasValidPhone: true })).toBe('after_hours');
    expect(classifyLeadSla({ createdAt: inShift, hasValidPhone: true, agentOnLiveCall: true, recentBurstCount: 3 })).toBe('burst_gt_2');
    expect(classifyLeadSla({ createdAt: inShift, hasValidPhone: true, agentOnLiveCall: true, recentBurstCount: 2 })).toBe('none');
  });

  it('evaluates 2-minute target and 3-minute SLA limit', () => {
    const created = new Date('2026-11-28T16:00:00Z');
    expect(evaluateSpeedToLead(created, new Date('2026-11-28T16:01:45Z'), 'none')).toEqual({
      elapsedSec: 105, excluded: false, withinTarget: true, withinSla: true,
    });
    expect(evaluateSpeedToLead(created, new Date('2026-11-28T16:02:30Z'), 'none')).toEqual({
      elapsedSec: 150, excluded: false, withinTarget: false, withinSla: true,
    });
    expect(evaluateSpeedToLead(created, new Date('2026-11-28T16:04:00Z'), 'none')).toEqual({
      elapsedSec: 240, excluded: false, withinTarget: false, withinSla: false,
    });
  });
});

describe('Uptime credit & commission reconciliation', () => {
  it('calculates 5% credit per full point below 98%, capped at 25%', () => {
    expect(calculateUptimeRemedy({ connectedMinutes: 985, scheduledMinutes: 1000, baseFeeCents: 69000 })).toEqual({
      uptimePct: 98.5, shortfallPoints: 0, creditPct: 0, creditCents: 0,
    });
    expect(calculateUptimeRemedy({ connectedMinutes: 965, scheduledMinutes: 1000, baseFeeCents: 69000 })).toEqual({
      uptimePct: 96.5, shortfallPoints: 1, creditPct: 5, creditCents: 3450,
    });
    expect(calculateUptimeRemedy({ connectedMinutes: 880, scheduledMinutes: 1000, baseFeeCents: 69000 })).toEqual({
      uptimePct: 88, shortfallPoints: 10, creditPct: 25, creditCents: 17250,
    });
  });

  it('pays $10 only for completed REM agent bookings and dedupes within 30 days', () => {
    const res = reconcileCommissionAppointments([
      { id: '1', leadId: 'lead-a', bookedByChannel: 'rem_agent', status: 'completed', scheduledAt: new Date('2026-11-02T14:00:00Z'), completedAt: new Date('2026-11-02T14:30:00Z') },
      { id: '2', leadId: 'lead-a', bookedByChannel: 'rem_agent', status: 'completed', scheduledAt: new Date('2026-11-15T14:00:00Z'), completedAt: new Date('2026-11-15T14:30:00Z') },
      { id: '3', leadId: 'lead-b', bookedByChannel: 'ai_assistant', status: 'completed', scheduledAt: new Date('2026-11-05T14:00:00Z'), completedAt: new Date('2026-11-05T14:30:00Z') },
      { id: '4', leadId: 'lead-c', bookedByChannel: 'rem_agent', status: 'no_show', scheduledAt: new Date('2026-11-06T14:00:00Z'), completedAt: null },
      { id: '5', leadId: 'lead-a', bookedByChannel: 'rem_agent', status: 'completed', scheduledAt: new Date('2026-12-03T14:00:00Z'), completedAt: new Date('2026-12-03T14:30:00Z') },
    ]);

    expect(res.eligibleCount).toBe(2);
    expect(res.totalCommissionCents).toBe(2000);
    expect(res.items.find((i) => i.id === '2')?.ineligibleReason).toBe('duplicate_within_window');
    expect(res.items.find((i) => i.id === '3')?.ineligibleReason).toBe('ai_assistant');
    expect(res.items.find((i) => i.id === '4')?.ineligibleReason).toBe('not_completed');
    expect(res.items.find((i) => i.id === '5')?.commissionEligible).toBe(true);
  });
});

describe('Section 7.3 follow-up cadence', () => {
  it('schedules 5m, 1h, 4h, next day 9:00 AM ET, day 3 9:00 AM ET, then stops', () => {
    const base = etWallToUtc(2026, 11, 28, 14, 0, 0);
    expect(nextCadenceDueAt(0, base)).toEqual({ step: '5m', dueAt: new Date(base.getTime() + 5 * 60_000) });
    expect(nextCadenceDueAt(1, base)).toEqual({ step: '1h', dueAt: new Date(base.getTime() + 60 * 60_000) });
    expect(nextCadenceDueAt(2, base)).toEqual({ step: '4h', dueAt: new Date(base.getTime() + 4 * 60 * 60_000) });
    expect(nextCadenceDueAt(3, base)?.dueAt.toISOString()).toBe(etWallToUtc(2026, 11, 29, 9, 0, 0).toISOString());
    expect(nextCadenceDueAt(4, base)?.dueAt.toISOString()).toBe(etWallToUtc(2026, 12, 1, 9, 0, 0).toISOString());
    expect(nextCadenceDueAt(5, base)).toBeNull();
  });
});
