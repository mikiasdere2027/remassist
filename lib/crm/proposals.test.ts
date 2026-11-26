import { describe, expect, it } from 'vitest';
import { ProposalLine, isEditable, isExpired, isOpen, lineAmount, parsePercentToBps, proposalNumber, totals } from './proposals';

const monthly = (o: Partial<ProposalLine>) => ProposalLine.parse({ kind: 'monthly', description: 'SDR', ...o });
const oneOff = (amountCents: number) => ProposalLine.parse({ kind: 'one_off', description: 'Recruitment fee', amountCents });

describe('proposal maths', () => {
  it('prices a monthly line from hours and rate, else the amount given', () => {
    expect(lineAmount(monthly({ hoursPerMonth: 320, rateCents: 900 }))).toBe(288000);
    expect(lineAmount(monthly({ amountCents: 150000 }))).toBe(150000);
    expect(lineAmount(oneOff(50000))).toBe(50000);
  });
  it('totals with a discount on the monthly fees only', () => {
    const t = totals([monthly({ hoursPerMonth: 320, rateCents: 900 }), monthly({ hoursPerMonth: 160, rateCents: 1100 }), oneOff(50000)], 1000);
    expect(t).toEqual({ monthlySubtotal: 464000, discount: 46400, monthly: 417600, oneOff: 50000, firstMonth: 467600, annual: 5011200 });
    expect(totals([], 0)).toEqual({ monthlySubtotal: 0, discount: 0, monthly: 0, oneOff: 0, firstMonth: 0, annual: 0 });
    expect(totals([monthly({ amountCents: 100 })], 50_000).monthly).toBe(0); // clamped at 100%
  });
  it('numbers and percentages', () => {
    expect(proposalNumber(2026, 7)).toBe('P-2026-0007');
    expect(parsePercentToBps('12.5')).toBe(1250);
    expect(parsePercentToBps('10%')).toBe(1000);
    expect(parsePercentToBps('')).toBe(0);
    expect(parsePercentToBps('150')).toBeNull();
    expect(parsePercentToBps('ten')).toBeNull();
  });
  it('states', () => {
    expect(isEditable('draft')).toBe(true);
    expect(isEditable('sent')).toBe(false);
    expect(isOpen('viewed')).toBe(true);
    expect(isOpen('accepted')).toBe(false);
    expect(isExpired('2026-11-01', '2026-11-23')).toBe(true);
    expect(isExpired('2026-12-01', '2026-11-23')).toBe(false);
    expect(isExpired(null, '2026-11-23')).toBe(false);
  });
  it('rejects bad lines', () => {
    expect(ProposalLine.safeParse({ kind: 'monthly', description: '' }).success).toBe(false);
    expect(ProposalLine.safeParse({ kind: 'monthly', description: 'x', seats: -1 }).success).toBe(false);
  });
});
