import { describe, expect, it } from 'vitest';
import { effectiveProbability, formatMoney, formatMoneyShort, monthlyValueCents, parseMoneyToCents, weightedCents } from './money';

describe('money', () => {
  it('formats cents', () => {
    expect(formatMoney(640000)).toBe('$6,400');
    expect(formatMoney(640050)).toBe('$6,400.50');
    expect(formatMoney(null)).toBe('$0');
  });
  it('formats short totals', () => {
    expect(formatMoneyShort(950000)).toBe('$9,500');
    expect(formatMoneyShort(18_420_000)).toBe('$184k');
    expect(formatMoneyShort(120_000_000)).toBe('$1.2M');
    expect(formatMoneyShort(100_000_000)).toBe('$1M');
  });
  it('parses typed amounts exactly', () => {
    expect(parseMoneyToCents('12.5')).toBe(1250);
    expect(parseMoneyToCents('$1,280.05')).toBe(128005);
    expect(parseMoneyToCents('9')).toBe(900);
    expect(parseMoneyToCents('')).toBeNull();
    expect(parseMoneyToCents('12.345')).toBeNull();
    expect(parseMoneyToCents('-5')).toBeNull();
    expect(parseMoneyToCents('abc')).toBeNull();
  });
  it('values a deal from hours and rate, else the entered amount', () => {
    expect(monthlyValueCents(320, 900, 1)).toBe(288000); // 320 h × $9
    expect(monthlyValueCents(null, 900, 50000)).toBe(50000);
    expect(monthlyValueCents(null, null, null)).toBe(0);
  });
  it('weights by probability, deal override first', () => {
    expect(effectiveProbability(null, 55)).toBe(55);
    expect(effectiveProbability(80, 55)).toBe(80);
    expect(effectiveProbability(140, 55)).toBe(100);
    expect(weightedCents(288000, 55)).toBe(158400);
  });
});
