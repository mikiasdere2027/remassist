import { describe, expect, it } from 'vitest';
import { formatDuration, fromLocalInput, initials, responseClock } from './display';

describe('crm display helpers', () => {
  it('formats durations compactly', () => {
    expect(formatDuration(30_000)).toBe('under a minute');
    expect(formatDuration(12 * 60_000)).toBe('12m');
    expect(formatDuration(130 * 60_000)).toBe('2h 10m');
    expect(formatDuration(3 * 86_400_000 + 4 * 3_600_000)).toBe('3d 4h');
    expect(formatDuration(2 * 86_400_000)).toBe('2d');
  });
  it('makes initials', () => {
    expect(initials('Amina Bekele')).toBe('AB');
    expect(initials('jane.doe@x.com')).toBe('JD');
    expect(initials('admin@remassistance.com')).toBe('A');
    expect(initials('')).toBe('?');
  });
  it('runs the first-response clock', () => {
    const created = new Date('2026-11-10T08:00:00Z');
    expect(responseClock(created, new Date('2026-11-10T10:10:00Z'))).toEqual({ state: 'responded', ms: 130 * 60_000, late: false });
    const waiting = responseClock(created, null, new Date('2026-11-12T08:00:00Z'));
    expect(waiting.state).toBe('waiting');
    expect(waiting.late).toBe(true);
    expect(responseClock(created, null, new Date(), 'won')).toEqual({ state: 'unknown', ms: 0, late: false });
  });
  it('reads datetime-local in the viewer time zone', () => {
    // 09:30 in Addis Ababa (UTC+3, offset -180) is 06:30 UTC.
    expect(fromLocalInput('2026-11-14T09:30', -180)?.toISOString()).toBe('2026-11-14T06:30:00.000Z');
    expect(fromLocalInput('2026-11-14T09:30', 300)?.toISOString()).toBe('2026-11-14T14:30:00.000Z');
    expect(fromLocalInput('tomorrow', 0)).toBeNull();
    expect(fromLocalInput('', 0)).toBeNull();
  });
});
