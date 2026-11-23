import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  addBusinessHours, cronAuthorised, cronSecret, formatDigest, parseCalendly, readAutomation, verifyCalendlySignature,
} from './automation';

describe('automation settings', () => {
  it('fills defaults and rejects junk', () => {
    expect(readAutomation(null)).toMatchObject({ assignMode: 'off', firstContactTask: true, firstContactHours: 2, rules: [] });
    expect(readAutomation({ automation: { assignMode: 'round_robin', firstContactHours: 4 } })).toMatchObject({ assignMode: 'round_robin', firstContactHours: 4 });
    expect(readAutomation({ automation: { assignMode: 'everyone!' } }).assignMode).toBe('off');
  });
});

describe('business hours (Addis Ababa, UTC+3, 09:00-17:00 Mon-Fri)', () => {
  // 2026-11-23 is a Monday. 10:00 local = 07:00Z.
  it('adds within the day', () => {
    expect(addBusinessHours(new Date('2026-11-23T07:00:00Z'), 2).toISOString()).toBe('2026-11-23T09:00:00.000Z');
  });
  it('rolls past closing into the next morning', () => {
    // 16:00 local + 2h = 1h today, 1h tomorrow -> 10:00 local Tue = 07:00Z
    expect(addBusinessHours(new Date('2026-11-23T13:00:00Z'), 2).toISOString()).toBe('2026-11-24T07:00:00.000Z');
  });
  it('skips the weekend', () => {
    // Fri 2026-11-27 16:00 local + 2h -> Mon 2026-11-30 10:00 local
    expect(addBusinessHours(new Date('2026-11-27T13:00:00Z'), 2).toISOString()).toBe('2026-11-30T07:00:00.000Z');
  });
  it('starts at opening when the lead arrives at night', () => {
    // Tue 02:00 local + 1h -> Tue 10:00 local
    expect(addBusinessHours(new Date('2026-11-23T23:00:00Z'), 1).toISOString()).toBe('2026-11-24T07:00:00.000Z');
  });
});

describe('Calendly webhooks', () => {
  const key = 'test-signing-key';
  const body = JSON.stringify({ event: 'invitee.created' });
  const sign = (t: number, b = body) => `t=${t},v1=${createHmac('sha256', key).update(`${t}.${b}`).digest('hex')}`;
  it('accepts a fresh, correctly signed delivery', () => {
    expect(verifyCalendlySignature(sign(1000), body, key, 1010)).toBe(true);
  });
  it('rejects tampering, the wrong key, replays and junk', () => {
    expect(verifyCalendlySignature(sign(1000), body + ' ', key, 1010)).toBe(false);
    expect(verifyCalendlySignature(sign(1000), body, 'other', 1010)).toBe(false);
    expect(verifyCalendlySignature(sign(1000), body, key, 1000 + 301)).toBe(false);
    expect(verifyCalendlySignature('nonsense', body, key, 1010)).toBe(false);
    expect(verifyCalendlySignature(null, body, key, 1010)).toBe(false);
  });
  it('reads bookings and cancellations', () => {
    const created = parseCalendly({
      event: 'invitee.created',
      payload: { email: ' Hana@Example.com ', name: 'Hana', uri: 'u1', scheduled_event: { name: 'Discovery call', start_time: '2026-11-25T08:00:00Z', end_time: '2026-11-25T08:30:00Z' } },
    });
    expect(created).toMatchObject({ kind: 'created', email: 'hana@example.com', eventName: 'Discovery call', rescheduled: false });
    expect(created?.startTime?.toISOString()).toBe('2026-11-25T08:00:00.000Z');
    expect(parseCalendly({ event: 'invitee.canceled', payload: { email: 'a@b.co', rescheduled: true, cancellation: { reason: 'clash' } } }))
      .toMatchObject({ kind: 'canceled', rescheduled: true, cancelReason: 'clash' });
    expect(parseCalendly({ event: 'routing_form_submission.created', payload: { email: 'a@b.co' } })).toBeNull();
    expect(parseCalendly({ event: 'invitee.created', payload: {} })).toBeNull();
  });
});

describe('daily digest', () => {
  it('says nothing when there is nothing to say', () => {
    expect(formatDigest({ date: '2026-11-23', siteUrl: 'https://x', waiting: [], overdue: [], dueToday: [], renewals: [] })).toBeNull();
  });
  it('lists each section with links', () => {
    const text = formatDigest({
      date: '2026-11-23', siteUrl: 'https://remassistance.com',
      waiting: [{ id: 'L1', name: 'Hana Girma', hours: 30.4, owner: null }],
      overdue: [{ title: 'Send case studies', owner: 'CRM Tester', dueAt: new Date() }],
      dueToday: [],
      renewals: [{ id: 'E1', name: 'Abyssinia', renewalDate: '2027-01-10', days: 48, noticeBy: '2026-12-11' }],
    })!;
    expect(text).toContain('CRM digest for 2026-11-23');
    expect(text).toContain('• Hana Girma — 30 h · unassigned · https://remassistance.com/admin/leads/L1');
    expect(text).toContain('*Overdue tasks (1)*');
    expect(text).not.toContain('Due today');
    expect(text).toContain('notice by 2026-12-11');
  });
});

describe('cron secret', () => {
  it('uses CRON_SECRET, else derives one from AUTH_SECRET', () => {
    expect(cronSecret({ CRON_SECRET: 'abc' } as unknown as NodeJS.ProcessEnv)).toBe('abc');
    const derived = cronSecret({ AUTH_SECRET: 's3cret' } as unknown as NodeJS.ProcessEnv)!;
    expect(derived).toBe(createHmac('sha256', 's3cret').update('rem-assist-cron-v1').digest('hex'));
    expect(cronSecret({} as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
  it('compares safely', () => {
    const env = { CRON_SECRET: 'abc' } as unknown as NodeJS.ProcessEnv;
    expect(cronAuthorised('abc', env)).toBe(true);
    expect(cronAuthorised('abd', env)).toBe(false);
    expect(cronAuthorised(null, env)).toBe(false);
    expect(cronAuthorised('abc', {} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});
