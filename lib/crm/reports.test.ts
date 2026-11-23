import { describe, expect, it } from 'vitest';
import { change, fmtDays, fmtHours, funnel, heatmap, median, pct, percentile, rangeStart, stageDurations, toCsv } from './reports';

describe('report maths', () => {
  it('percentages and change', () => {
    expect(pct(1, 3)).toBe(33.3);
    expect(pct(1, 0)).toBeNull();
    expect(change(15, 10)).toBe(50);
    expect(change(5, 10)).toBe(-50);
    expect(change(5, 0)).toBeNull();
  });
  it('median and percentile', () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(9);
    expect(percentile([7], 90)).toBe(7);
  });
  it('ranges', () => {
    const now = new Date('2026-11-23T12:00:00Z');
    expect(rangeStart('30', now)?.toISOString()).toBe('2026-10-24T12:00:00.000Z');
    expect(rangeStart('all', now)).toBeNull();
    expect(rangeStart('nonsense', now)?.toISOString()).toBe('2026-08-25T12:00:00.000Z'); // default 90
  });
  it('funnel shares', () => {
    expect(funnel([{ key: 'a', label: 'Leads', count: 10 }, { key: 'b', label: 'Qualified', count: 4 }, { key: 'c', label: 'Won', count: 1 }]))
      .toEqual([
        { key: 'a', label: 'Leads', count: 10, ofTop: 100, ofPrev: null },
        { key: 'b', label: 'Qualified', count: 4, ofTop: 40, ofPrev: 40 },
        { key: 'c', label: 'Won', count: 1, ofTop: 10, ofPrev: 25 },
      ]);
  });
  it('time in stage from stage changes', () => {
    const day = (n: number) => new Date(Date.UTC(2026, 10, n));
    const d = stageDurations(
      [
        { dealId: 'x', createdAt: day(1), firstStage: 'Discovery', closed: true },
        { dealId: 'y', createdAt: day(10), firstStage: 'Discovery', closed: false },
      ],
      [{ dealId: 'x', at: day(3), toStage: 'Proposal' }, { dealId: 'x', at: day(8), toStage: 'Won' }],
      day(14),
    );
    expect(d.get('Discovery')).toEqual([2, 4]);   // x: 2 days; y still open: 4 days so far
    expect(d.get('Proposal')).toEqual([5]);
    expect(d.has('Won')).toBe(false);              // a closed deal stops the clock
  });
  it('formats durations', () => {
    expect(fmtDays(null)).toBe('—');
    expect(fmtDays(0.25)).toBe('6 h');
    expect(fmtDays(2.54)).toBe('2.5 d');
    expect(fmtHours(0.5)).toBe('30 min');
    expect(fmtHours(3.26)).toBe('3.3 h');
    expect(fmtHours(72)).toBe('3 d');
  });
  it('heatmap covers whole weeks ending this week, Monday first', () => {
    const counts = new Map([['2026-11-23', 4], ['2026-11-20', 1], ['2026-01-01', 9]]);
    const h = heatmap(counts, '2026-11-23', 2);                    // 2026-11-23 is a Monday
    expect(h.cells).toHaveLength(14);
    expect(h.cells[0].day).toBe('2026-11-16');
    expect(h.cells[7]).toMatchObject({ day: '2026-11-23', n: 4, level: 2, future: false });
    expect(h.cells[8].future).toBe(true);
    expect(h.cells.find((c) => c.day === '2026-11-20')?.n).toBe(1);
    expect(h.busiest).toEqual({ day: '2026-11-23', n: 4 });       // the old 9 is outside the window
  });
  it('CSV quoting and formula injection', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'say "hi"'], ['=SUM(A1)', -5], [null, '12.5%']]))
      .toBe('a,b\r\n"x,y","say ""hi"""\r\n\'=SUM(A1),-5\r\n,12.5%\r\n');
  });
});
