import { and, asc, desc, eq, gte, isNull, lte, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getDb } from '@/db';
import { companies, contacts, crmEvents, engagements, leads, tasks, users } from '@/db/schema';
import { pickOwner } from './assignment';
import { addBusinessHours, readAutomation, type CalendlyBooking, type DigestInput } from './automation';
import { companyDomainFromEmail, normalizeEmail } from './dedupe';
import { daysBetween, isoDay, renewalState } from './engagements';
import { logActivity, recordEvent } from './events';
import { overdueInvoices } from './invoicesData';
import { balance } from './invoices';
import { formatMoney } from './money';
import { createTeamLead } from './intake';
import { workspaceSettings } from './engagementsData';
import type { WorkspaceId } from './workspace';

/**
 * What happens to a lead without anyone clicking: linked to the contact and
 * company already known, assigned by the workspace's rules, and given a
 * first-contact task. Runs inside the transaction that saved the lead.
 */

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

export interface InboundLead {
  id: string;
  email: string;
  name?: string | null;
  serviceInterest?: string | null;
  source: string;
}

export async function applyInboundAutomation(tx: Tx, ws: WorkspaceId, lead: InboundLead, opts: { firstContactTask?: boolean } = {}) {
  const settings = readAutomation(await workspaceSettings(tx, ws));
  const label = lead.name || lead.email;

  /* 1. Known person or company: link instead of starting from nothing. */
  const email = normalizeEmail(lead.email);
  let contactId: string | null = null, companyId: string | null = null, matched: string | null = null;
  if (email) {
    const [c] = await tx.select({ id: contacts.id, companyId: contacts.companyId }).from(contacts)
      .where(and(eq(contacts.workspaceId, ws), eq(contacts.email, email), isNull(contacts.archivedAt))).limit(1);
    if (c) { contactId = c.id; companyId = c.companyId; matched = 'contact'; }
  }
  const domain = companyDomainFromEmail(lead.email);
  if (!companyId && domain) {
    const [co] = await tx.select({ id: companies.id }).from(companies)
      .where(and(eq(companies.workspaceId, ws), eq(companies.domain, domain))).limit(1);
    if (co) { companyId = co.id; matched = matched ?? 'company'; }
  }
  if (contactId || companyId) {
    await tx.update(leads).set({ contactId, companyId }).where(eq(leads.id, lead.id));
    await logActivity(tx, {
      workspaceId: ws, type: 'system', leadId: lead.id, meta: { contactId, companyId },
      body: matched === 'contact' ? 'Matched to an existing contact' : 'Matched to an existing company',
    });
    if (companyId) await logActivity(tx, { workspaceId: ws, type: 'system', companyId, body: `New enquiry from ${label}`, meta: { leadId: lead.id } });
  }

  /* 2. Owner, by the workspace's rules. */
  let ownerId: string | null = null, ownerName: string | null = null;
  if (settings.assignMode !== 'off') {
    const team = await tx.select({ id: users.id, name: users.name, email: users.email }).from(users).where(isNull(users.disabledAt));
    const pool = settings.pool.length ? team.filter((u) => settings.pool.includes(u.id)) : team;
    if (settings.assignMode === 'single') {
      ownerId = team.some((u) => u.id === settings.defaultOwnerId) ? settings.defaultOwnerId : null;
    } else {
      const [last] = await tx.select({ payload: crmEvents.payload }).from(crmEvents)
        .where(and(eq(crmEvents.workspaceId, ws), eq(crmEvents.type, 'lead.assigned'), sql`${crmEvents.payload}->>'auto' = 'true'`))
        .orderBy(desc(crmEvents.id)).limit(1);
      ownerId = pickOwner(
        { service: lead.serviceInterest, source: lead.source },
        pool.map((u) => ({ id: u.id })),
        settings.rules.filter((r) => team.some((u) => u.id === r.ownerId)),
        (last?.payload as { to?: string } | undefined)?.to ?? null,
      );
    }
    if (ownerId) {
      const owner = team.find((u) => u.id === ownerId)!;
      ownerName = owner.name?.trim() || owner.email;
      await tx.update(leads).set({ ownerId }).where(eq(leads.id, lead.id));
      const meta = { from: null, to: ownerId, toName: ownerName, auto: true, mode: settings.assignMode };
      await recordEvent(tx, { workspaceId: ws, type: 'lead.assigned', subjectType: 'lead', subjectId: lead.id, payload: meta });
      await logActivity(tx, { workspaceId: ws, type: 'owner_change', leadId: lead.id, meta });
    }
  }

  /* 3. The first-contact task, due within the target in business hours. */
  if (settings.firstContactTask && opts.firstContactTask !== false) {
    const dueAt = addBusinessHours(new Date(), settings.firstContactHours);
    const [t] = await tx.insert(tasks).values({
      workspaceId: ws, title: `First contact: ${label}`, dueAt, priority: 'high', assigneeId: ownerId, leadId: lead.id,
    }).returning({ id: tasks.id });
    await tx.update(leads).set({ nextFollowUpAt: dueAt }).where(eq(leads.id, lead.id));
    await recordEvent(tx, { workspaceId: ws, type: 'task.created', subjectType: 'task', subjectId: t.id, payload: { leadId: lead.id, auto: true, dueAt: dueAt.toISOString() } });
    await logActivity(tx, { workspaceId: ws, type: 'system', leadId: lead.id, body: `Task added: First contact within ${settings.firstContactHours} business ${settings.firstContactHours === 1 ? 'hour' : 'hours'}`, meta: { taskId: t.id } });
  }
  return { ownerId, ownerName, contactId, companyId };
}

/* ── Calendly ─────────────────────────────────────────────────────────────── */

/**
 * A booking or cancellation from Calendly, matched to the lead with that
 * email (or created as a "Booked a call" lead). A booking logs a meeting and
 * adds a task at the meeting time for the owner; a cancellation logs it and
 * closes that task.
 */
export async function recordBooking(tx: Tx, ws: WorkspaceId, b: CalendlyBooking) {
  const [existing] = await tx.select({ id: leads.id, ownerId: leads.ownerId, name: leads.name }).from(leads)
    .where(and(eq(leads.workspaceId, ws), eq(leads.email, b.email))).orderBy(desc(leads.createdAt)).limit(1);
  let leadId = existing?.id ?? null, ownerId = existing?.ownerId ?? null;
  let created = false;
  if (!leadId && b.kind === 'created') {
    const [first, ...rest] = (b.name ?? '').split(/\s+/).filter(Boolean);
    leadId = await createTeamLead(tx, ws, {
      email: b.email, firstName: first, lastName: rest.join(' ') || undefined, source: 'booking',
      phone: undefined, company: undefined, country: undefined, serviceInterest: undefined, message: undefined, ownerId: undefined,
    }, null, `Booked a call through Calendly${b.eventName ? `: ${b.eventName}` : ''}`);
    const auto = await applyInboundAutomation(tx, ws, { id: leadId, email: b.email, name: b.name, source: 'booking' }, { firstContactTask: false });
    ownerId = auto.ownerId;
    created = true;
  }
  if (!leadId) return { matched: false };

  const title = `Meeting: ${b.eventName ?? 'Call'} with ${b.name ?? b.email}`;
  const when = b.startTime?.toISOString() ?? null;
  if (b.kind === 'created') {
    await logActivity(tx, {
      workspaceId: ws, type: 'meeting', leadId, body: `${b.eventName ?? 'Call'} booked${b.rescheduled ? ' (rescheduled)' : ''}`,
      meta: { calendly: b.uri, startTime: when, endTime: b.endTime?.toISOString() ?? null },
    });
    if (b.startTime) {
      await tx.insert(tasks).values({ workspaceId: ws, title, dueAt: b.startTime, priority: 'high', assigneeId: ownerId, leadId });
      await tx.update(leads).set({ nextFollowUpAt: sql`least(coalesce(${leads.nextFollowUpAt}, ${b.startTime}), ${b.startTime})` }).where(eq(leads.id, leadId));
    }
    /* A booking is a first touch: the response clock stops. */
    await tx.update(leads).set({ firstContactedAt: sql`coalesce(${leads.firstContactedAt}, now())`, updatedAt: new Date() }).where(eq(leads.id, leadId));
  } else {
    await logActivity(tx, {
      workspaceId: ws, type: 'meeting', leadId, body: `${b.eventName ?? 'Call'} cancelled${b.cancelReason ? `: ${b.cancelReason}` : ''}`,
      meta: { calendly: b.uri, canceled: true, rescheduled: b.rescheduled },
    });
    await tx.update(tasks).set({ doneAt: new Date() })
      .where(and(eq(tasks.leadId, leadId), isNull(tasks.doneAt), sql`${tasks.title} like 'Meeting:%'`, b.startTime ? eq(tasks.dueAt, b.startTime) : sql`true`));
  }
  await recordEvent(tx, { workspaceId: ws, type: 'activity.logged', subjectType: 'lead', subjectId: leadId, payload: { kind: 'meeting', calendly: b.kind, created } });
  return { matched: true, leadId, created };
}

/* ── the daily digest ─────────────────────────────────────────────────────── */

export async function digestData(ws: WorkspaceId, siteUrl: string, now = new Date()): Promise<DigestInput> {
  const db = getDb();
  const owner = alias(users, 'owner');
  const dayAgo = new Date(now.getTime() - 24 * 3_600_000);
  const endOfDay = new Date(now); endOfDay.setUTCHours(23, 59, 59, 999);
  const today = isoDay(now);
  const [waiting, open, renew, unpaid] = await Promise.all([
    db.select({ id: leads.id, name: leads.name, email: leads.email, createdAt: leads.createdAt, ownerName: owner.name, ownerEmail: owner.email })
      .from(leads).leftJoin(owner, eq(owner.id, leads.ownerId))
      .where(and(eq(leads.workspaceId, ws), eq(leads.status, 'new'), isNull(leads.firstContactedAt), lte(leads.createdAt, dayAgo)))
      .orderBy(asc(leads.createdAt)).limit(25),
    db.select({ title: tasks.title, dueAt: tasks.dueAt, ownerName: owner.name, ownerEmail: owner.email })
      .from(tasks).leftJoin(owner, eq(owner.id, tasks.assigneeId))
      .where(and(eq(tasks.workspaceId, ws), isNull(tasks.doneAt), lte(tasks.dueAt, endOfDay)))
      .orderBy(asc(tasks.dueAt)).limit(50),
    db.select({ id: engagements.id, title: engagements.title, renewalDate: engagements.renewalDate, noticeDays: engagements.noticeDays, companyName: companies.name })
      .from(engagements).leftJoin(companies, eq(companies.id, engagements.companyId))
      .where(and(eq(engagements.workspaceId, ws), ne(engagements.status, 'churned'), isNull(engagements.archivedAt),
        sql`${engagements.renewalDate} <= (${today}::date + 30)`, gte(engagements.renewalDate, today)))
      .orderBy(asc(engagements.renewalDate)),
    overdueInvoices(ws, today, 25),
  ]);
  const who = (n: string | null, e: string | null) => n?.trim() || e || 'Unassigned';
  return {
    date: today,
    siteUrl,
    waiting: waiting.map((l) => ({ id: l.id, name: l.name || l.email, hours: (now.getTime() - l.createdAt.getTime()) / 3_600_000, owner: l.ownerName?.trim() || l.ownerEmail || null })),
    overdue: open.filter((t) => t.dueAt && t.dueAt < now).map((t) => ({ title: t.title, owner: who(t.ownerName, t.ownerEmail), dueAt: t.dueAt! })),
    dueToday: open.filter((t) => t.dueAt && t.dueAt >= now).map((t) => ({ title: t.title, owner: who(t.ownerName, t.ownerEmail) })),
    renewals: renew.map((r) => {
      const st = renewalState(r.renewalDate, r.noticeDays, today);
      return { id: r.id, name: r.companyName ?? r.title, renewalDate: r.renewalDate!, days: daysBetween(today, r.renewalDate!), noticeBy: st?.noticeBy ?? null };
    }),
    unpaid: unpaid.map((i) => ({
      id: i.id, number: i.number ?? '', company: i.companyName,
      owed: formatMoney(balance(i.totalCents, i.paidCents, i.creditedCents), i.currency), daysLate: daysBetween(i.dueDate!, today),
    })),
  };
}

/** Leads that have waited over 24 h for a first response (dashboard alert). */
export async function overdueResponses(ws: WorkspaceId, now = new Date()) {
  const [r] = await getDb().select({ n: sql<number>`count(*)::int` }).from(leads)
    .where(and(eq(leads.workspaceId, ws), eq(leads.status, 'new'), isNull(leads.firstContactedAt), lte(leads.createdAt, new Date(now.getTime() - 24 * 3_600_000))));
  return r.n;
}

