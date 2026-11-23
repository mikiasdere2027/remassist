import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

/**
 * Automation rules — pure and unit-tested. The database side is in
 * automationData.ts, the routes in app/api/cron and app/api/webhooks.
 */

/* ── settings (stored on the workspace row: settings.automation) ─────────── */

export const ASSIGN_MODES = ['off', 'round_robin', 'single'] as const;
export type AssignMode = (typeof ASSIGN_MODES)[number];

export const AutomationSettings = z.object({
  /** off: leads arrive unassigned; round_robin: across the people listed; single: always defaultOwnerId. */
  assignMode: z.enum(ASSIGN_MODES).default('off'),
  /** Who takes part in round-robin. Empty = every active team member. */
  pool: z.array(z.string().max(100)).max(50).default([]),
  defaultOwnerId: z.string().max(100).nullable().default(null),
  /** Checked before round-robin: a service name fragment → owner. */
  rules: z.array(z.object({ service: z.string().trim().min(1).max(120), ownerId: z.string().max(100) })).max(30).default([]),
  /** Create a "first contact" task on every new website lead. */
  firstContactTask: z.boolean().default(true),
  /** Business hours to reply in (the task's due time). */
  firstContactHours: z.number().int().min(1).max(72).default(2),
});
export type AutomationSettings = z.infer<typeof AutomationSettings>;

export function readAutomation(settings: Record<string, unknown> | null | undefined): AutomationSettings {
  const parsed = AutomationSettings.safeParse(settings?.automation ?? {});
  return parsed.success ? parsed.data : AutomationSettings.parse({});
}

/* ── business hours ───────────────────────────────────────────────────────── */

/**
 * `hours` working hours after `from`, counting Monday–Friday 09:00–17:00 in
 * the given UTC offset (minutes; +180 for Addis Ababa). A lead at 16:00 on a
 * Friday with a 2-hour target is due 10:00 on Monday.
 */
export function addBusinessHours(from: Date, hours: number, offsetMin = 180, open = 9, close = 17): Date {
  const shift = offsetMin * 60_000;
  let t = new Date(from.getTime() + shift);          // local wall time, expressed in UTC fields
  let left = hours * 60;                              // minutes
  const isWorkday = (d: Date) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6;
  const at = (d: Date, h: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h));
  for (let guard = 0; left > 0 && guard < 400; guard++) {
    if (!isWorkday(t) || t >= at(t, close)) {
      t = at(new Date(t.getTime() + 86_400_000), open);
      continue;
    }
    if (t < at(t, open)) t = at(t, open);
    const room = (at(t, close).getTime() - t.getTime()) / 60_000;
    const use = Math.min(room, left);
    t = new Date(t.getTime() + use * 60_000);
    left -= use;
  }
  return new Date(t.getTime() - shift);
}

/* ── Calendly webhooks ────────────────────────────────────────────────────── */

/**
 * Calendly signs each delivery: header "t=<unix>,v1=<hex hmac-sha256 of
 * `${t}.${rawBody}`>" with the subscription's signing key. Rejects anything
 * older than `toleranceSec` so a captured request cannot be replayed.
 */
export function verifyCalendlySignature(header: string | null, rawBody: string, key: string, nowSec = Math.floor(Date.now() / 1000), toleranceSec = 300): boolean {
  if (!header || !key) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.trim().split('=') as [string, string]));
  const t = Number(parts.t), v1 = parts.v1;
  if (!Number.isFinite(t) || !v1 || !/^[0-9a-f]+$/i.test(v1)) return false;
  if (Math.abs(nowSec - t) > toleranceSec) return false;
  const expected = createHmac('sha256', key).update(`${t}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'hex'), b = Buffer.from(v1, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface CalendlyBooking {
  kind: 'created' | 'canceled';
  email: string;
  name: string | null;
  eventName: string | null;
  startTime: Date | null;
  endTime: Date | null;
  rescheduled: boolean;
  cancelReason: string | null;
  uri: string;
}

/** The parts of a Calendly invitee.created / invitee.canceled payload the CRM uses. */
export function parseCalendly(body: unknown): CalendlyBooking | null {
  const b = body as { event?: string; payload?: Record<string, unknown> };
  if (!b || (b.event !== 'invitee.created' && b.event !== 'invitee.canceled') || !b.payload) return null;
  const p = b.payload as Record<string, unknown> & { cancellation?: { reason?: unknown } };
  const email = typeof p.email === 'string' ? p.email.trim().toLowerCase() : '';
  if (!email) return null;
  const ev = (p.scheduled_event ?? {}) as Record<string, unknown>;
  const date = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v) : null);
  return {
    kind: b.event === 'invitee.created' ? 'created' : 'canceled',
    email,
    name: typeof p.name === 'string' ? p.name : null,
    eventName: typeof ev.name === 'string' ? ev.name : null,
    startTime: date(ev.start_time),
    endTime: date(ev.end_time),
    rescheduled: Boolean(p.rescheduled),
    cancelReason: typeof p.cancellation?.reason === 'string' ? p.cancellation.reason : null,
    uri: typeof p.uri === 'string' ? p.uri : '',
  };
}

/* ── the daily digest ─────────────────────────────────────────────────────── */

export interface DigestInput {
  date: string;
  siteUrl: string;
  waiting: Array<{ id: string; name: string; hours: number; owner: string | null }>;
  overdue: Array<{ title: string; owner: string; dueAt: Date }>;
  dueToday: Array<{ title: string; owner: string }>;
  renewals: Array<{ id: string; name: string; renewalDate: string; days: number; noticeBy: string | null }>;
}

/** One Slack message for the team. Empty sections are left out; null when there is nothing to say. */
export function formatDigest(d: DigestInput): string | null {
  const lines: string[] = [];
  if (d.waiting.length) {
    lines.push(`*Waiting for a first response (${d.waiting.length})*`);
    for (const w of d.waiting.slice(0, 10)) {
      const waited = w.hours < 48 ? `${Math.round(w.hours)} h` : `${Math.round(w.hours / 24)} days`;
      lines.push(`• ${w.name} — ${waited}${w.owner ? ` · ${w.owner}` : ' · unassigned'} · ${d.siteUrl}/admin/leads/${w.id}`);
    }
  }
  if (d.overdue.length) {
    lines.push(`*Overdue tasks (${d.overdue.length})*`);
    for (const t of d.overdue.slice(0, 10)) lines.push(`• ${t.title} · ${t.owner}`);
  }
  if (d.dueToday.length) {
    lines.push(`*Due today (${d.dueToday.length})*`);
    for (const t of d.dueToday.slice(0, 10)) lines.push(`• ${t.title} · ${t.owner}`);
  }
  if (d.renewals.length) {
    lines.push(`*Renewals coming up (${d.renewals.length})*`);
    for (const r of d.renewals.slice(0, 10)) {
      lines.push(`• ${r.name} renews ${r.renewalDate} (${r.days} d)${r.noticeBy ? ` · notice by ${r.noticeBy}` : ''} · ${d.siteUrl}/admin/customers/${r.id}`);
    }
  }
  if (lines.length === 0) return null;
  return [`CRM digest for ${d.date}`, ...lines].join('\n');
}

/**
 * The secret the daily job must present. CRON_SECRET if set; otherwise
 * derived from AUTH_SECRET, so the server's scheduled job (which can read
 * the same .env) works without anyone editing the environment.
 */
export function cronSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.CRON_SECRET) return env.CRON_SECRET;
  if (!env.AUTH_SECRET) return null;
  return createHmac('sha256', env.AUTH_SECRET).update('rem-assist-cron-v1').digest('hex');
}

export function cronAuthorised(presented: string | null, env: NodeJS.ProcessEnv = process.env): boolean {
  const s = cronSecret(env);
  if (!s || !presented) return false;
  const a = Buffer.from(s), b = Buffer.from(presented);
  return a.length === b.length && timingSafeEqual(a, b);
}
