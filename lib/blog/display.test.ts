import { describe, expect, it } from 'vitest';
import { formatPostDate } from './display';

describe('formatPostDate', () => {
  it('reads as the cards print it', () => {
    expect(formatPostDate('2026-08-06')).toBe('Aug 6, 2026');
  });

  it('does not drift a day either side of a timezone', () => {
    expect(formatPostDate('2026-01-01')).toBe('Jan 1, 2026');
    expect(formatPostDate('2026-12-31')).toBe('Dec 31, 2026');
  });

  it('hands back anything it cannot parse, rather than "Invalid Date"', () => {
    expect(formatPostDate('')).toBe('');
    expect(formatPostDate('soon')).toBe('soon');
  });
});
