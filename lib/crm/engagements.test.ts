import { describe, expect, it } from 'vitest';
import { rolesToText, seatCount } from './engagements';

describe('customer display', () => {
  it('writes roles back as editor lines, dropping empty trailing parts', () => {
    expect(
      rolesToText([
        { role: 'SDR', seats: 2, hoursPerMonth: 320, staff: ['Hana', 'Dawit'] },
        { role: 'Team lead', seats: 1, hoursPerMonth: null, staff: [] },
      ]),
    ).toBe('SDR | 2 | 320 | Hana, Dawit\nTeam lead | 1');
  });

  it('counts seats across roles', () => {
    expect(seatCount([{ role: 'SDR', seats: 2 }, { role: 'Lead', seats: 1 }])).toBe(3);
    expect(seatCount([])).toBe(0);
  });
});
