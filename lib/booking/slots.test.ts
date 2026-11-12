import { describe, expect, it } from 'vitest';
import { pickSlots, safeTimeZone, slotLabel } from './slots';

const now = new Date('2026-10-05T12:00:00Z'); // Monday 8am New York

/** Half-hourly open times from 13:00 to 21:00 UTC on each of the given days. */
function openDays(days: string[]) {
  return days.flatMap((d) =>
    Array.from({ length: 17 }, (_, i) => ({
      status: 'available',
      start_time: new Date(Date.parse(`${d}T13:00:00Z`) + i * 30 * 60_000).toISOString(),
    })),
  );
}

describe('pickSlots', () => {
  it('offers a morning and an afternoon slot on each of the first three days', () => {
    const slots = pickSlots(openDays(['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']), 'America/New_York', now);
    expect(slots).toHaveLength(6);
    expect(slots[0].label).toBe('Tuesday, Oct 6 at 9:00 AM');
    expect(slots[1].label).toBe('Tuesday, Oct 6 at 12:00 PM');
    expect(slots.at(-1)!.label.startsWith('Thursday')).toBe(true);
  });

  it('skips anything within the next hour and anything not available', () => {
    const slots = pickSlots(
      [
        { status: 'available', start_time: '2026-10-05T12:30:00Z' },
        { status: 'unavailable', start_time: '2026-10-05T15:00:00Z' },
        { status: 'available', start_time: '2026-10-05T16:00:00Z' },
      ],
      'America/New_York',
      now,
    );
    expect(slots.map((s) => s.start)).toEqual(['2026-10-05T16:00:00Z']);
  });

  it('labels in the visitor’s timezone', () => {
    expect(slotLabel('2026-10-06T13:00:00Z', 'Africa/Addis_Ababa')).toBe('Tuesday, Oct 6 at 4:00 PM');
  });

  it('falls back to UTC for a timezone Intl does not know', () => {
    expect(safeTimeZone('Mars/Olympus')).toBe('UTC');
    expect(safeTimeZone(undefined)).toBe('UTC');
  });
});
