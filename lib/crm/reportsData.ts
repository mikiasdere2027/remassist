import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getDb } from '@/db';
import { activities, companies, deals, engagements, leads, pipelineStages, tasks, users } from '@/db/schema';
import { isoDay, RENEWAL_WINDOW_DAYS } from './engagements';
import { effectiveProbability, weightedCents } from './money';
import { median, percentile, stageDurations } from './reports';
import type { WorkspaceId } from './workspace';

/**
 * Queries behind the dashboard and the Reports page. Each returns plain rows;
 * the maths (rates, medians, stage time) is in reports.ts.
 */

const since = (col: Parameters<typeof gte>[0], from: Date | null): SQL | undefined => (from ? gte(col, from) : undefined);

/* ── reports ─────────────────────────────────────────────────────────────── */

export async function funnelCounts(ws: WorkspaceId, from: Date | null) {
  const [r] = await getDb()
    .select({
      leads: sql<number>`count(*) filter (where ${leads.status} <> 'spam')::int`,
      contacted: sql<number>`count(*) filter (where ${leads.status} not in ('new', 'spam') or ${leads.firstContactedAt} is not null)::int`,
      qualified: sql<number>`count(*) filter (where ${leads.status} in ('qualified', 'converted', 'won'))::int`,
      converted: sql<number>`count(*) filter (where ${leads.status} in ('converted', 'won'))::int`,
      won: sql<number>`count(*) filter (where exists (
        select 1 from ${deals} d join ${pipelineStages} s on s.id = d.stage_id where d.lead_id = "leads"."id" and s.kind = 'won'))::int`,
    })
    .from(leads)
    .where(and(eq(leads.workspaceId, ws), since(leads.createdAt, from)));
  return r;
}

/** Leads, conversions and won monthly value per source. */
export async function bySource(ws: WorkspaceId, from: Date | null) {
  return getDb()
    .select({
      source: leads.source,
      leads: sql<number>`count(*) filter (where ${leads.status} <> 'spam')::int`,
      converted: sql<number>`count(*) filter (where ${leads.status} in ('converted', 'won'))::int`,
      wonValue: sql<number>`coalesce(sum((select sum(d.monthly_value_cents) from ${deals} d join ${pipelineStages} s on s.id = d.stage_id
        where d.lead_id = "leads"."id" and s.kind = 'won')), 0)::bigint`,
    })
    .from(leads)
    .where(and(eq(leads.workspaceId, ws), since(leads.createdAt, from)))
    .groupBy(leads.source)
    .orderBy(desc(sql`count(*)`));
}

/** The same, per campaign (last-touch utm_source / utm_campaign). */
export async function byCampaign(ws: WorkspaceId, from: Date | null) {
  const src = sql<string>`coalesce(nullif(${leads.utm}->>'utm_source', ''), '(none)')`;
  const camp = sql<string>`coalesce(nullif(${leads.utm}->>'utm_campaign', ''), '(none)')`;
  return getDb()
    .select({
      utmSource: src,
      utmCampaign: camp,
      leads: sql<number>`count(*) filter (where ${leads.status} <> 'spam')::int`,
      converted: sql<number>`count(*) filter (where ${leads.status} in ('converted', 'won'))::int`,
    })
    .from(leads)
    .where(and(eq(leads.workspaceId, ws), since(leads.createdAt, from)))
    .groupBy(src, camp)
    .orderBy(desc(sql`count(*)`))
    .limit(50);
}

/** Hours to first contact per lead, with the owner, for the response-time report. */
export async function responseTimes(ws: WorkspaceId, from: Date | null) {
  const owner = alias(users, 'owner');
  const rows = await getDb()
    .select({
      hours: sql<number>`extract(epoch from (${leads.firstContactedAt} - ${leads.createdAt})) / 3600`,
      ownerName: owner.name,
      ownerEmail: owner.email,
    })
    .from(leads)
    .leftJoin(owner, eq(owner.id, leads.ownerId))
    .where(and(eq(leads.workspaceId, ws), isNotNull(leads.firstContactedAt), since(leads.createdAt, from)));
  const [{ waiting }] = await getDb()
    .select({ waiting: sql<number>`count(*)::int` })
    .from(leads)
    .where(and(eq(leads.workspaceId, ws), eq(leads.status, 'new'), isNull(leads.firstContactedAt), since(leads.createdAt, from)));

  const summarise = (hours: number[]) => ({
    count: hours.length,
    median: median(hours),
    p90: percentile(hours, 90),
    within24: hours.length ? Math.round((hours.filter((h) => h <= 24).length / hours.length) * 1000) / 10 : null,
  });
  const byOwner = new Map<string, number[]>();
  for (const r of rows) {
    const k = r.ownerName?.trim() || r.ownerEmail || 'Unassigned';
    byOwner.set(k, [...(byOwner.get(k) ?? []), Number(r.hours)]);
  }
  return {
    overall: summarise(rows.map((r) => Number(r.hours))),
    waiting,
    owners: [...byOwner.entries()].map(([owner, h]) => ({ owner, ...summarise(h) })).sort((a, b) => b.count - a.count),
  };
}

/** Deals per owner: open, won and lost (closed in the range), with won value. */
export async function winRates(ws: WorkspaceId, from: Date | null) {
  const owner = alias(users, 'owner');
  const closedIn = from ? sql`${deals.closedAt} >= ${from}` : sql`true`;
  return getDb()
    .select({
      ownerName: owner.name,
      ownerEmail: owner.email,
      open: sql<number>`count(*) filter (where ${pipelineStages.kind} = 'open')::int`,
      won: sql<number>`count(*) filter (where ${pipelineStages.kind} = 'won' and ${closedIn})::int`,
      lost: sql<number>`count(*) filter (where ${pipelineStages.kind} = 'lost' and ${closedIn})::int`,
      wonValue: sql<number>`coalesce(sum(${deals.monthlyValueCents}) filter (where ${pipelineStages.kind} = 'won' and ${closedIn}), 0)::bigint`,
      openValue: sql<number>`coalesce(sum(${deals.monthlyValueCents}) filter (where ${pipelineStages.kind} = 'open'), 0)::bigint`,
    })
    .from(deals)
    .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
    .leftJoin(owner, eq(owner.id, deals.ownerId))
    .where(and(eq(deals.workspaceId, ws), isNull(deals.archivedAt)))
    .groupBy(owner.name, owner.email)
    .orderBy(desc(sql`count(*)`));
}

/** Why deals were lost, in the range. */
export async function lossReasonsReport(ws: WorkspaceId, from: Date | null) {
  return getDb()
    .select({ reason: sql<string>`coalesce(lr.label, 'No reason recorded')`, n: sql<number>`count(*)::int`, value: sql<number>`coalesce(sum(${deals.monthlyValueCents}), 0)::bigint` })
    .from(deals)
    .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
    .leftJoin(sql`loss_reasons lr`, sql`lr.id = ${deals.lossReasonId}`)
    .where(and(eq(deals.workspaceId, ws), eq(pipelineStages.kind, 'lost'), since(deals.closedAt, from)))
    .groupBy(sql`lr.label`)
    .orderBy(desc(sql`count(*)`));
}

/** Average and median days spent in each stage, for deals created in the range. */
export async function stageTimes(ws: WorkspaceId, from: Date | null) {
  const db = getDb();
  const [stages, dealRows] = await Promise.all([
    db.select({ id: pipelineStages.id, name: pipelineStages.name, kind: pipelineStages.kind, position: pipelineStages.position })
      .from(pipelineStages).where(eq(pipelineStages.workspaceId, ws)).orderBy(asc(pipelineStages.position)),
    db.select({ id: deals.id, createdAt: deals.createdAt, stageId: deals.stageId, closedAt: deals.closedAt })
      .from(deals).where(and(eq(deals.workspaceId, ws), since(deals.createdAt, from))),
  ]);
  if (dealRows.length === 0) return [];
  const ids = dealRows.map((d) => d.id);
  const acts = await db
    .select({ dealId: activities.dealId, type: activities.type, meta: activities.meta, at: activities.occurredAt })
    .from(activities)
    .where(and(eq(activities.workspaceId, ws), inArray(activities.dealId, ids), sql`${activities.type} in ('stage_change', 'system')`))
    .orderBy(asc(activities.occurredAt));
  const nameById = new Map(stages.map((s) => [s.id, s.name]));
  const changes = acts
    .filter((a) => a.type === 'stage_change' && a.dealId)
    .map((a) => ({ dealId: a.dealId as string, at: a.at, toStage: String((a.meta as Record<string, unknown>).toName ?? '') }));
  /* The stage a deal was created in is on its "Deal created" entry; failing that, the stage it left first. */
  const firstStage = new Map<string, string>();
  for (const a of acts) {
    const m = a.meta as Record<string, unknown>;
    if (a.type === 'system' && a.dealId && typeof m.stage === 'string' && !firstStage.has(a.dealId)) firstStage.set(a.dealId, m.stage);
    if (a.type === 'stage_change' && a.dealId && !firstStage.has(a.dealId) && typeof m.fromName === 'string') firstStage.set(a.dealId, m.fromName);
  }
  const durations = stageDurations(
    dealRows.map((d) => ({ dealId: d.id, createdAt: d.createdAt, firstStage: firstStage.get(d.id) ?? nameById.get(d.stageId) ?? '', closed: Boolean(d.closedAt) })),
    changes,
  );
  return stages
    .filter((s) => s.kind === 'open')
    .map((s) => {
      const d = durations.get(s.name) ?? [];
      return { stage: s.name, deals: d.length, avgDays: d.length ? d.reduce((a, b) => a + b, 0) / d.length : null, medianDays: median(d) };
    });
}

/** Recurring revenue by service (live customers) and won value by service in the range. */
export async function revenueByService(ws: WorkspaceId, from: Date | null) {
  const db = getDb();
  const [live, won] = await Promise.all([
    db.select({
      service: sql<string>`coalesce(${engagements.service}, 'Not set')`,
      customers: sql<number>`count(*)::int`,
      mrr: sql<number>`coalesce(sum(${engagements.monthlyValueCents}), 0)::bigint`,
    }).from(engagements)
      .where(and(eq(engagements.workspaceId, ws), inArray(engagements.status, ['onboarding', 'active']), isNull(engagements.archivedAt)))
      .groupBy(sql`coalesce(${engagements.service}, 'Not set')`),
    db.select({
      service: sql<string>`coalesce(${deals.service}, 'Not set')`,
      won: sql<number>`count(*)::int`,
      value: sql<number>`coalesce(sum(${deals.monthlyValueCents}), 0)::bigint`,
    }).from(deals).innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
      .where(and(eq(deals.workspaceId, ws), eq(pipelineStages.kind, 'won'), since(deals.closedAt, from)))
      .groupBy(sql`coalesce(${deals.service}, 'Not set')`),
  ]);
  const names = [...new Set([...live.map((l) => l.service), ...won.map((w) => w.service)])];
  return names
    .map((service) => {
      const l = live.find((x) => x.service === service);
      const w = won.find((x) => x.service === service);
      return { service, customers: l?.customers ?? 0, mrr: Number(l?.mrr ?? 0), won: w?.won ?? 0, wonValue: Number(w?.value ?? 0) };
    })
    .sort((a, b) => b.mrr - a.mrr || b.wonValue - a.wonValue);
}

/** Leads per UTC day since `from` (for the calendar heatmap). */
export async function leadsPerDay(ws: WorkspaceId, from: Date) {
  const day = sql<string>`to_char(${leads.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;
  const rows = await getDb()
    .select({ day, n: sql<number>`count(*)::int` })
    .from(leads)
    .where(and(eq(leads.workspaceId, ws), gte(leads.createdAt, from), sql`${leads.status} <> 'spam'`))
    .groupBy(day);
  return new Map(rows.map((r) => [r.day, r.n]));
}

/* ── dashboard ───────────────────────────────────────────────────────────── */

export async function dashboardNumbers(ws: WorkspaceId, userId: string, now = new Date()) {
  const db = getDb();
  const d30 = new Date(now.getTime() - 30 * 86_400_000), d60 = new Date(now.getTime() - 60 * 86_400_000);
  const [[l], openDeals, [m], [t]] = await Promise.all([
    db.select({
      last30: sql<number>`count(*) filter (where ${leads.createdAt} >= ${d30} and ${leads.status} <> 'spam')::int`,
      prev30: sql<number>`count(*) filter (where ${leads.createdAt} >= ${d60} and ${leads.createdAt} < ${d30} and ${leads.status} <> 'spam')::int`,
      awaiting: sql<number>`count(*) filter (where ${leads.status} = 'new')::int`,
      converted30: sql<number>`count(*) filter (where ${leads.convertedAt} >= ${d30})::int`,
    }).from(leads).where(eq(leads.workspaceId, ws)),
    db.select({ value: deals.monthlyValueCents, probability: deals.probability, stageProbability: pipelineStages.probability })
      .from(deals).innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
      .where(and(eq(deals.workspaceId, ws), eq(pipelineStages.kind, 'open'), isNull(deals.archivedAt))),
    db.select({
      mrr: sql<number>`coalesce(sum(${engagements.monthlyValueCents}) filter (where ${engagements.status} in ('active', 'onboarding')), 0)::bigint`,
      customers: sql<number>`count(*) filter (where ${engagements.status} in ('active', 'onboarding'))::int`,
    }).from(engagements).where(and(eq(engagements.workspaceId, ws), isNull(engagements.archivedAt))),
    db.select({
      mine: sql<number>`count(*) filter (where ${tasks.assigneeId} = ${userId})::int`,
      all: sql<number>`count(*)::int`,
    }).from(tasks).where(and(eq(tasks.workspaceId, ws), isNull(tasks.doneAt), lte(tasks.dueAt, now))),
  ]);
  return {
    leads30: l.last30,
    leadsPrev30: l.prev30,
    awaiting: l.awaiting,
    converted30: l.converted30,
    openDeals: openDeals.length,
    pipeline: openDeals.reduce((n, d) => n + d.value, 0),
    weighted: openDeals.reduce((n, d) => n + weightedCents(d.value, effectiveProbability(d.probability, d.stageProbability)), 0),
    mrr: Number(m.mrr),
    customers: m.customers,
    overdueMine: t.mine,
    overdueAll: t.all,
  };
}

export async function topOpenDeals(ws: WorkspaceId, limit = 5) {
  return getDb()
    .select({
      id: deals.id, title: deals.title, value: deals.monthlyValueCents, currency: deals.currency, expectedClose: deals.expectedClose,
      stage: pipelineStages.name, probability: deals.probability, stageProbability: pipelineStages.probability, companyName: companies.name,
    })
    .from(deals)
    .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
    .leftJoin(companies, eq(companies.id, deals.companyId))
    .where(and(eq(deals.workspaceId, ws), eq(pipelineStages.kind, 'open'), isNull(deals.archivedAt)))
    .orderBy(desc(deals.monthlyValueCents))
    .limit(limit);
}

/** What is coming up: my open tasks due in the next 7 days (and overdue), and renewals in the window. */
export async function comingUp(ws: WorkspaceId, userId: string, now = new Date()) {
  const db = getDb();
  const week = new Date(now.getTime() + 7 * 86_400_000);
  const today = isoDay(now);
  const [taskRows, renewals] = await Promise.all([
    db.select({
      id: tasks.id, title: tasks.title, dueAt: tasks.dueAt, priority: tasks.priority,
      leadId: tasks.leadId, dealId: tasks.dealId, companyId: tasks.companyId, engagementId: tasks.engagementId,
    }).from(tasks)
      .where(and(eq(tasks.workspaceId, ws), eq(tasks.assigneeId, userId), isNull(tasks.doneAt), isNotNull(tasks.dueAt), lte(tasks.dueAt, week)))
      .orderBy(asc(tasks.dueAt)).limit(8),
    db.select({
      id: engagements.id, title: engagements.title, renewalDate: engagements.renewalDate, companyName: companies.name,
      value: engagements.monthlyValueCents, currency: engagements.currency,
    }).from(engagements).leftJoin(companies, eq(companies.id, engagements.companyId))
      .where(and(eq(engagements.workspaceId, ws), sql`${engagements.status} <> 'churned'`, isNull(engagements.archivedAt),
        sql`${engagements.renewalDate} <= (${today}::date + ${RENEWAL_WINDOW_DAYS}::int)`))
      .orderBy(asc(engagements.renewalDate)).limit(6),
  ]);
  return { tasks: taskRows, renewals };
}

/** The latest activity across the CRM, with what it belongs to. */
export async function activityStream(ws: WorkspaceId, limit = 12) {
  const actor = alias(users, 'actor');
  return getDb()
    .select({
      id: activities.id, type: activities.type, body: activities.body, meta: activities.meta, occurredAt: activities.occurredAt,
      actorName: actor.name, actorEmail: actor.email,
      leadId: activities.leadId, dealId: activities.dealId, companyId: activities.companyId, engagementId: activities.engagementId,
      leadName: sql<string | null>`(select coalesce(l.name, l.email) from ${leads} l where l.id = ${activities.leadId})`,
      dealTitle: sql<string | null>`(select d.title from ${deals} d where d.id = ${activities.dealId})`,
      companyName: sql<string | null>`(select c.name from ${companies} c where c.id = ${activities.companyId})`,
      engagementTitle: sql<string | null>`(select e.title from ${engagements} e where e.id = ${activities.engagementId})`,
    })
    .from(activities)
    .leftJoin(actor, eq(actor.id, activities.actorId))
    .where(and(eq(activities.workspaceId, ws), sql`(${activities.type} <> 'system' or ${activities.actorId} is not null)`))
    .orderBy(desc(activities.occurredAt))
    .limit(limit);
}

