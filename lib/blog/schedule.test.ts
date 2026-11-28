import { describe, expect, it } from 'vitest';
import { scheduleIso } from './schedule';

const NOW = new Date('2026-11-28T10:00:00Z');

describe('scheduleIso: the time typed into the schedule box', () => {
  it('turns a future local time into an ISO time the API accepts', () => {
    const typed = '2026-12-01T09:30';
    const iso = scheduleIso(typed, NOW);
    expect(iso).toBe(new Date(typed).toISOString());
    expect(iso).toMatch(/Z$/);
  });
  it('refuses a time that is not at least a minute ahead', () => {
    expect(scheduleIso('2026-11-28T09:00', NOW)).toBeNull();
    expect(scheduleIso(new Date(NOW.getTime() + 30_000).toISOString().slice(0, 16), NOW)).toBeNull();
  });
  it('refuses nothing, junk and impossible dates', () => {
    expect(scheduleIso('', NOW)).toBeNull();
    expect(scheduleIso('soon', NOW)).toBeNull();
    expect(scheduleIso('2026-13-45T25:61', NOW)).toBeNull();
  });
});
