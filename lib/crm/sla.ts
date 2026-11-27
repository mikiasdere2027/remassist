/**
 * Thorwell × REM Assistance SLA & SOP rules — pure and unit-tested.
 *
 * Anchors all coverage windows (9:00 AM–9:00 PM America/New_York, 7 days/week =
 * 84 hrs/wk) to Eastern Time with automatic EST/EDT handling, classifies SLA
 * exclusions, evaluates 2m/3m speed-to-lead, calculates <98% uptime credits,
 * and reconciles $10.00 completed-appointment commissions with 30-day dedupe.
 */

export const SLA_TIMEZONE = 'America/New_York';
export const SLA_COVERAGE_START_HOUR = 9;
export const SLA_COVERAGE_END_HOUR = 21;
export const SLA_TARGET_SECONDS = 120;
export const SLA_LIMIT_SECONDS = 180;

export const SLA_EXCLUSION_REASONS = [
  'none',
  'after_hours',
  'invalid_phone',
  'burst_gt_2',
  'system_outage',
  'maintenance',
] as const;
export type SlaExclusionReason = (typeof SLA_EXCLUSION_REASONS)[number];

export const APPOINTMENT_CHANNELS = ['rem_agent', 'ai_assistant', 'internal'] as const;
export type AppointmentChannel = (typeof APPOINTMENT_CHANNELS)[number];

export const APPOINTMENT_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const SHIFT_TYPES = ['weekday_day', 'weekday_eve', 'sat_full', 'sun_full', 'bench'] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

export const SLA_DISPOSITION_CODES = [
  'appointment_booked',
  'qualified_callback',
  'no_answer_voicemail',
  'busy',
  'not_interested',
  'disqualified',
  'wrong_number',
  'dnc',
] as const;
export type SlaDispositionCode = (typeof SLA_DISPOSITION_CODES)[number];

export const FOLLOWUP_CADENCE_STEPS = ['5m', '1h', '4h', 'next_day_am', 'day_3'] as const;
export type FollowupCadenceStep = (typeof FOLLOWUP_CADENCE_STEPS)[number];

/**
 * Computes the next follow-up timestamp for Section 7.3's cadence:
 * [5 minutes, 1 hour, 4 hours, next day 9:00 AM ET, day 3 9:00 AM ET].
 * Returns null once all 5 attempts have been scheduled.
 */
export function nextCadenceDueAt(attemptIndex: number, from: Date): { step: FollowupCadenceStep; dueAt: Date } | null {
  if (attemptIndex === 0) return { step: '5m', dueAt: new Date(from.getTime() + 5 * 60_000) };
  if (attemptIndex === 1) return { step: '1h', dueAt: new Date(from.getTime() + 60 * 60_000) };
  if (attemptIndex === 2) return { step: '4h', dueAt: new Date(from.getTime() + 4 * 60 * 60_000) };
  if (attemptIndex === 3 || attemptIndex === 4) {
    const p = etWallParts(from);
    const addDays = attemptIndex === 3 ? 1 : 3;
    const targetDay = new Date(Date.UTC(p.year, p.month - 1, p.day + addDays));
    const dueAt = etWallToUtc(
      targetDay.getUTCFullYear(),
      targetDay.getUTCMonth() + 1,
      targetDay.getUTCDate(),
      SLA_COVERAGE_START_HOUR,
      0,
      0,
    );
    return { step: attemptIndex === 3 ? 'next_day_am' : 'day_3', dueAt };
  }
  return null;
}

export interface EtParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday .. 6 = Saturday */
  weekday: number;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

const etFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: SLA_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** Extract wall-clock components in America/New_York (handles EST/EDT). */
export function etWallParts(date: Date): EtParts {
  const parts = etFormatter.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const rawHour = Number(get('hour'));
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: rawHour === 24 ? 0 : rawHour,
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: WEEKDAY_MAP[get('weekday')] ?? 0,
  };
}

/** True when `date` falls inside 9:00 AM–9:00 PM ET (7 days/week). */
export function isWithinSlaCoverage(
  date: Date,
  startHour = SLA_COVERAGE_START_HOUR,
  endHour = SLA_COVERAGE_END_HOUR,
): boolean {
  const { hour } = etWallParts(date);
  return hour >= startHour && hour < endHour;
}

/**
 * Convert an America/New_York wall-clock date/time to a UTC Date.
 * Uses iterative offset refinement so DST spring-forward / fall-back days
 * resolve to the exact UTC instant.
 */
export function etWallToUtc(year: number, month: number, day: number, hour: number, minute = 0, second = 0): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 3; i++) {
    const actual = etWallParts(new Date(utc));
    const desiredWall = Date.UTC(year, month - 1, day, hour, minute, second);
    const actualWall = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    const diff = desiredWall - actualWall;
    if (diff === 0) break;
    utc += diff;
  }
  return new Date(utc);
}

/** Next shift start in America/New_York if `date` is outside 9:00 AM–9:00 PM ET. */
export function nextSlaWindowStart(
  date: Date,
  startHour = SLA_COVERAGE_START_HOUR,
  endHour = SLA_COVERAGE_END_HOUR,
): Date {
  if (isWithinSlaCoverage(date, startHour, endHour)) return date;
  const p = etWallParts(date);
  if (p.hour < startHour) {
    return etWallToUtc(p.year, p.month, p.day, startHour, 0, 0);
  }
  const tomorrow = new Date(Date.UTC(p.year, p.month - 1, p.day + 1));
  return etWallToUtc(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth() + 1, tomorrow.getUTCDate(), startHour, 0, 0);
}

/** Due timestamp for the 3-minute speed-to-lead SLA (or start of next shift + 3m). */
export function slaCallbackDueAt(leadCreatedAt: Date, limitMinutes = 3): Date {
  return new Date(nextSlaWindowStart(leadCreatedAt).getTime() + limitMinutes * 60_000);
}

export interface LeadSlaInput {
  createdAt: Date;
  hasValidPhone: boolean;
  recentBurstCount?: number;
  agentOnLiveCall?: boolean;
  burstThreshold?: number;
}

/** Classify whether a lead is SLA-eligible or excluded under Section 2. */
export function classifyLeadSla(input: LeadSlaInput): SlaExclusionReason {
  if (!input.hasValidPhone) return 'invalid_phone';
  if (!isWithinSlaCoverage(input.createdAt)) return 'after_hours';
  const threshold = input.burstThreshold ?? 2;
  if (input.agentOnLiveCall && (input.recentBurstCount ?? 0) > threshold) return 'burst_gt_2';
  return 'none';
}

export interface SpeedToLeadResult {
  elapsedSec: number | null;
  excluded: boolean;
  withinTarget: boolean;
  withinSla: boolean;
}

/** Evaluate speed-to-lead against the 2-minute target and 3-minute SLA limit. */
export function evaluateSpeedToLead(
  createdAt: Date,
  firstDialAt: Date | null,
  exclusion: SlaExclusionReason,
  targetSec = SLA_TARGET_SECONDS,
  limitSec = SLA_LIMIT_SECONDS,
): SpeedToLeadResult {
  const excluded = exclusion !== 'none';
  if (!firstDialAt) {
    return { elapsedSec: null, excluded, withinTarget: false, withinSla: false };
  }
  const elapsedSec = Math.max(0, Math.round((firstDialAt.getTime() - createdAt.getTime()) / 1000));
  return {
    elapsedSec,
    excluded,
    withinTarget: elapsedSec <= targetSec,
    withinSla: elapsedSec <= limitSec,
  };
}

export interface UptimeRemedyInput {
  connectedMinutes: number;
  scheduledMinutes: number;
  baseFeeCents: number;
  thresholdPct?: number;
  creditPerPointPct?: number;
  maxCreditPct?: number;
}

export interface UptimeRemedyResult {
  uptimePct: number;
  shortfallPoints: number;
  creditPct: number;
  creditCents: number;
}

/**
 * Section 2 uptime remedy: if monthly uptime falls below 98%, Thorwell
 * receives a credit of [5]% of that month's base fee per full percentage point
 * below 98%, capped at [25]%.
 */
export function calculateUptimeRemedy(input: UptimeRemedyInput): UptimeRemedyResult {
  if (input.scheduledMinutes <= 0) {
    return { uptimePct: 100, shortfallPoints: 0, creditPct: 0, creditCents: 0 };
  }
  const thresholdPct = input.thresholdPct ?? 98;
  const creditPerPointPct = input.creditPerPointPct ?? 5;
  const maxCreditPct = input.maxCreditPct ?? 25;

  const rawPct = Math.min(100, Math.max(0, (input.connectedMinutes / input.scheduledMinutes) * 100));
  const uptimePct = Math.round(rawPct * 100) / 100;
  const shortfallPoints = uptimePct < thresholdPct ? Math.floor(thresholdPct - uptimePct) : 0;
  const creditPct = Math.min(maxCreditPct, shortfallPoints * creditPerPointPct);
  const creditCents = Math.round((input.baseFeeCents * creditPct) / 100);
  return { uptimePct, shortfallPoints, creditPct, creditCents };
}

export interface CommissionCandidate {
  id: string;
  leadId: string;
  bookedByChannel: AppointmentChannel;
  status: AppointmentStatus;
  scheduledAt: Date;
  completedAt: Date | null;
}

export interface ReconciledAppointment extends CommissionCandidate {
  commissionEligible: boolean;
  ineligibleReason: 'ai_assistant' | 'internal' | 'not_completed' | 'duplicate_within_window' | null;
  commissionCents: number;
}

/**
 * Exhibit A commission reconciliation: $10.00 per completed appointment booked
 * by an REM agent; excludes AI assistant bookings, cancelled/no-show, and
 * duplicate bookings for the same lead within [30] days.
 */
export function reconcileCommissionAppointments(
  rows: CommissionCandidate[],
  opts: { rateCents?: number; dedupeDays?: number } = {},
): { items: ReconciledAppointment[]; eligibleCount: number; totalCommissionCents: number } {
  const rateCents = opts.rateCents ?? 1000;
  const dedupeMs = (opts.dedupeDays ?? 30) * 86_400_000;

  const sorted = [...rows].sort((a, b) => {
    const ta = (a.completedAt ?? a.scheduledAt).getTime();
    const tb = (b.completedAt ?? b.scheduledAt).getTime();
    return ta - tb;
  });

  const lastEligibleByLead = new Map<string, number>();
  let eligibleCount = 0;
  let totalCommissionCents = 0;

  const items: ReconciledAppointment[] = sorted.map((r) => {
    if (r.bookedByChannel === 'ai_assistant') {
      return { ...r, commissionEligible: false, ineligibleReason: 'ai_assistant', commissionCents: 0 };
    }
    if (r.bookedByChannel === 'internal') {
      return { ...r, commissionEligible: false, ineligibleReason: 'internal', commissionCents: 0 };
    }
    if (r.status !== 'completed') {
      return { ...r, commissionEligible: false, ineligibleReason: 'not_completed', commissionCents: 0 };
    }
    const eventTime = (r.completedAt ?? r.scheduledAt).getTime();
    const prev = lastEligibleByLead.get(r.leadId);
    if (prev !== undefined && eventTime - prev < dedupeMs) {
      return { ...r, commissionEligible: false, ineligibleReason: 'duplicate_within_window', commissionCents: 0 };
    }
    lastEligibleByLead.set(r.leadId, eventTime);
    eligibleCount += 1;
    totalCommissionCents += rateCents;
    return { ...r, commissionEligible: true, ineligibleReason: null, commissionCents: rateCents };
  });

  return { items, eligibleCount, totalCommissionCents };
}
