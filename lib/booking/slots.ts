/**
 * Turning a calendar's open times into something Maya can say out loud.
 *
 * Calendly answers with every free start time in the window — often dozens.
 * Read aloud that is useless, so this picks a handful spread across the next
 * few days (a morning and an afternoon option per day where there are any)
 * and labels each in the visitor's own timezone.
 *
 * Pure, so it is testable without Calendly.
 */

export interface OpenTime {
  status: string;
  start_time: string;
}

export interface Slot {
  /** ISO start, exactly as Calendly gave it — what book_meeting sends back. */
  start: string;
  /** "Tuesday, Oct 7 at 10:00 AM", in the visitor's timezone. */
  label: string;
}

/** Nothing sooner than this: nobody wants a call that starts before they have hung up. */
const MIN_LEAD_MS = 60 * 60_000;
const MAX_DAYS = 3;
const PER_DAY = 2;

/** A timezone Intl accepts, or UTC. The visitor's browser supplies it, so it is untrusted. */
export function safeTimeZone(tz: string | undefined): string {
  if (!tz) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

export function slotLabel(iso: string, tz: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', month: 'short', day: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(d);
  return `${day} at ${time}`;
}

function localDay(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

function localHour(iso: string, tz: string): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(new Date(iso)));
}

export function pickSlots(times: OpenTime[], tzIn: string | undefined, now: Date = new Date()): Slot[] {
  const tz = safeTimeZone(tzIn);
  const earliest = now.getTime() + MIN_LEAD_MS;
  const open = times
    .filter((t) => t.status === 'available' && Date.parse(t.start_time) >= earliest)
    .sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time));

  const byDay = new Map<string, OpenTime[]>();
  for (const t of open) {
    const k = localDay(t.start_time, tz);
    if (!byDay.has(k) && byDay.size >= MAX_DAYS) break;
    (byDay.get(k) ?? byDay.set(k, []).get(k)!).push(t);
  }

  const out: Slot[] = [];
  for (const day of byDay.values()) {
    /* The first morning slot and the first afternoon one; failing that, the first two. */
    const am = day.find((t) => localHour(t.start_time, tz) < 12);
    const pm = day.find((t) => localHour(t.start_time, tz) >= 12);
    const chosen = [am, pm].filter((t): t is OpenTime => !!t);
    for (const t of day) {
      if (chosen.length >= PER_DAY) break;
      if (!chosen.includes(t)) chosen.push(t);
    }
    chosen.sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time));
    for (const t of chosen.slice(0, PER_DAY)) out.push({ start: t.start_time, label: slotLabel(t.start_time, tz) });
  }
  return out;
}
