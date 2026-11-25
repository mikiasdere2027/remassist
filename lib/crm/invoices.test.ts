import { describe, expect, it } from 'vitest';
import {
  addDays, ageingBucket, balance, displayStatus, documentNumber, invoiceTotals, lineTotal, monthPeriod, monthlyLine, nextMonthStart, settledStatus,
  canSettle, percentToBps, readBilling,
} from './invoices';

describe('invoice maths', () => {
  it('totals: discount first, then tax on the rest', () => {
    const lines = [{ description: 'Team', quantity: 1, unitCents: 316800 }, { description: 'Extra hours', quantity: 10, unitCents: 1100 }];
    expect(lineTotal(lines[1])).toBe(11000);
    expect(invoiceTotals(lines, 1000, 1500)).toEqual({ subtotal: 327800, discount: 32780, tax: 44253, total: 339273 });
    expect(invoiceTotals([], 0, 0)).toEqual({ subtotal: 0, discount: 0, tax: 0, total: 0 });
  });
  it('balance and status after payments and credits', () => {
    expect(balance(1000, 400, 0)).toBe(600);
    expect(balance(1000, 800, 300)).toBe(0);
    expect(settledStatus(1000, 0, 0)).toBe('issued');
    expect(settledStatus(1000, 400, 0)).toBe('partially_paid');
    expect(settledStatus(1000, 700, 300)).toBe('paid');
  });
  it('overdue only when unpaid past the due date', () => {
    expect(displayStatus('issued', '2026-11-15', '2026-11-23')).toBe('overdue');
    expect(displayStatus('partially_paid', '2026-11-15', '2026-11-23')).toBe('overdue');
    expect(displayStatus('issued', '2026-11-30', '2026-11-23')).toBe('issued');
    expect(displayStatus('paid', '2026-11-15', '2026-11-23')).toBe('paid');
    expect(displayStatus('draft', null, '2026-11-23')).toBe('draft');
  });
  it('ageing buckets', () => {
    expect(ageingBucket('2026-11-30', '2026-11-23')).toBe('current');
    expect(ageingBucket('2026-11-23', '2026-11-23')).toBe('current');
    expect(ageingBucket('2026-11-01', '2026-11-23')).toBe('1-30');
    expect(ageingBucket('2026-10-01', '2026-11-23')).toBe('31-60');
    expect(ageingBucket('2026-09-01', '2026-11-23')).toBe('61-90');
    expect(ageingBucket('2026-01-01', '2026-11-23')).toBe('90+');
  });
  it('periods and dates', () => {
    expect(monthPeriod('2026-12-01')).toEqual({ start: '2026-12-01', end: '2026-12-31', label: 'December 2026' });
    expect(monthPeriod('2028-02-10').end).toBe('2028-02-29');
    expect(nextMonthStart('2026-11-23')).toBe('2026-12-01');
    expect(nextMonthStart('2026-12-05')).toBe('2027-01-01');
    expect(addDays('2026-12-01', 15)).toBe('2026-12-16');
    expect(documentNumber('INV', 2026, 42)).toBe('INV-2026-0042');
    expect(monthlyLine(null, 'Northwind team', 'December 2026', 316800)).toEqual({ description: 'Northwind team — December 2026', quantity: 1, unitCents: 316800 });
  });
  it('billing settings and percentages', () => {
    expect(readBilling(undefined).invoicePrefix).toBe('INV');
    expect(readBilling({ billing: { invoicePrefix: 'bad prefix' } }).invoicePrefix).toBe('INV');
    expect(readBilling({ billing: { legalName: 'Rem Assist PLC', paymentTermsDays: 30 } }).paymentTermsDays).toBe(30);
    expect(percentToBps('15')).toBe(1500);
    expect(percentToBps('7.5%')).toBe(750);
    expect(percentToBps('')).toBe(0);
    expect(percentToBps('120')).toBeNull();
    expect(percentToBps('abc')).toBeNull();
    expect(canSettle('issued')).toBe(true);
    expect(canSettle('void')).toBe(false);
  });
});
