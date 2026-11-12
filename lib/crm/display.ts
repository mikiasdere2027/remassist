/** Presentation helpers for CRM screens. Pure, so they are unit-tested. */

export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABELS: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

export const CALL_OUTCOMES = ['connected', 'voicemail', 'no_answer', 'busy', 'wrong_number'] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];
export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  connected: 'Connected',
  voicemail: 'Left voicemail',
  no_answer: 'No answer',
  busy: 'Busy',
  wrong_number: 'Wrong number',
};

export const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  nurturing: 'Nurturing',
  won: 'Won',
  converted: 'Converted',
  lost: 'Lost',
  unqualified: 'Unqualified',
  spam: 'Spam',
};

/** "3d 4h", "2h 10m", "12m", "under a minute". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 60_000) return 'under a minute';
  const m = Math.floor(ms / 60_000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return min > 0 ? `${h}h ${min}m` : `${h}h`;
  return `${min}m`;
}

/** Up to two initials: "Amina Bekele" → "AB", "jane@x.com" → "J". */
export function initials(nameOrEmail: string | null | undefined): string {
  const s = (nameOrEmail ?? '').trim();
  if (!s) return '?';
  const base = s.includes('@') && !s.includes(' ') ? s.split('@')[0] : s;
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
  return letters.toUpperCase();
}

export interface ResponseClock {
  /** unknown: moved past "new" before response times were recorded. */
  state: 'waiting' | 'responded' | 'unknown';
  ms: number;
  /** Over the first-response target (one business day ≈ 24h for now). */
  late: boolean;
}

export const FIRST_RESPONSE_TARGET_MS = 24 * 60 * 60 * 1000;

export function responseClock(createdAt: Date, firstContactedAt: Date | null, now = new Date(), status = 'new'): ResponseClock {
  if (!firstContactedAt && status !== 'new') return { state: 'unknown', ms: 0, late: false };
  if (firstContactedAt) {
    const ms = firstContactedAt.getTime() - createdAt.getTime();
    return { state: 'responded', ms, late: ms > FIRST_RESPONSE_TARGET_MS };
  }
  const ms = now.getTime() - createdAt.getTime();
  return { state: 'waiting', ms, late: ms > FIRST_RESPONSE_TARGET_MS };
}

/**
 * A datetime-local value ("2026-11-14T09:30") entered in the viewer's time
 * zone → a Date. `offsetMin` is the browser's getTimezoneOffset() (minutes to
 * add to local time to reach UTC; −180 for Addis Ababa).
 */
export function fromLocalInput(value: string | null | undefined, offsetMin: number): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value?.trim() ?? '');
  if (!m) return null;
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const off = Number.isFinite(offsetMin) && Math.abs(offsetMin) <= 14 * 60 ? offsetMin : 0;
  return new Date(asUtc + off * 60_000);
}
