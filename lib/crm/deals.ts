import { and, asc, desc, eq, gte, ilike, isNull, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getDb } from '@/db';
import { companies, contacts, deals, leads, lossReasons, pipelineStages, users } from '@/db/schema';
import { escapeLike } from '@/lib/leads/query';
import { getTasksFor, getTimeline } from './records';
import type { WorkspaceId } from './workspace';

/** Reads for the pipeline board, the deal page and the company pages. */

export async function getStages(ws: WorkspaceId, { includeArchived = false } = {}) {
  return getDb()
    .select()
    .from(pipelineStages)
    .where(and(eq(pipelineStages.workspaceId, ws), includeArchived ? undefined : isNull(pipelineStages.archivedAt)))
    .orderBy(asc(pipelineStages.position), asc(pipelineStages.createdAt));
}
export type Stage = Awaited<ReturnType<typeof getStages>>[number];

export async function getLossReasons(ws: WorkspaceId, { includeArchived = false } = {}) {
  return getDb()
    .select()
    .from(lossReasons)
    .where(and(eq(lossReasons.workspaceId, ws), includeArchived ? undefined : isNull(lossReasons.archivedAt)))
    .orderBy(asc(lossReasons.position), asc(lossReasons.label));
}

export interface DealFilters {
  ownerId?: string;
  service?: string;
  q?: string;
  /** Closed deals (won or lost) are included only if closed on or after this. */
  closedSince?: Date;
}

export async function listDeals(ws: WorkspaceId, f: DealFilters = {}) {
  const owner = alias(users, 'owner');
  const where: SQL[] = [eq(deals.workspaceId, ws), isNull(deals.archivedAt)];
  if (f.ownerId === 'none') where.push(isNull(deals.ownerId));
  else if (f.ownerId) where.push(eq(deals.ownerId, f.ownerId));
  if (f.service) where.push(eq(deals.service, f.service));
  const q = f.q?.trim();
  if (q) {
    const like = `%${escapeLike(q)}%`;
    const m = or(ilike(deals.title, like), ilike(companies.name, like));
    if (m) where.push(m);
  }
  const since = f.closedSince ?? new Date(Date.now() - 30 * 86_400_000);
  where.push(sql`(${pipelineStages.kind} = 'open' or ${deals.closedAt} >= ${since})`);

  return getDb()
    .select({
      id: deals.id,
      title: deals.title,
      stageId: deals.stageId,
      stageKind: pipelineStages.kind,
      stageProbability: pipelineStages.probability,
      probability: deals.probability,
      service: deals.service,
      seats: deals.seats,
      monthlyValueCents: deals.monthlyValueCents,
      currency: deals.currency,
      expectedClose: deals.expectedClose,
      stageChangedAt: deals.stageChangedAt,
      closedAt: deals.closedAt,
      companyId: deals.companyId,
      companyName: companies.name,
      ownerId: deals.ownerId,
      ownerName: owner.name,
      ownerEmail: owner.email,
    })
    .from(deals)
    .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
    .leftJoin(companies, eq(companies.id, deals.companyId))
    .leftJoin(owner, eq(owner.id, deals.ownerId))
    .where(and(...where))
    .orderBy(desc(deals.monthlyValueCents), asc(deals.createdAt))
    .limit(500);
}
export type DealCard = Awaited<ReturnType<typeof listDeals>>[number];

export async function getDealDetail(ws: WorkspaceId, id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      deal: deals,
      stage: pipelineStages,
      company: companies,
      contact: contacts,
      lead: { id: leads.id, name: leads.name, email: leads.email },
      lossReason: lossReasons.label,
    })
    .from(deals)
    .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
    .leftJoin(companies, eq(companies.id, deals.companyId))
    .leftJoin(contacts, eq(contacts.id, deals.contactId))
    .leftJoin(leads, eq(leads.id, deals.leadId))
    .leftJoin(lossReasons, eq(lossReasons.id, deals.lossReasonId))
    .where(and(eq(deals.workspaceId, ws), eq(deals.id, id)))
    .limit(1);
  if (!row) return null;
  const [timeline, taskRows] = await Promise.all([getTimeline(ws, { dealId: id }), getTasksFor(ws, { dealId: id })]);
  return { ...row, timeline, tasks: taskRows };
}

/* ── companies ─────────────────────────────────────────────────────────── */

export async function listCompanies(ws: WorkspaceId, q?: string) {
  const owner = alias(users, 'owner');
  const where: SQL[] = [eq(companies.workspaceId, ws), isNull(companies.archivedAt)];
  const t = q?.trim();
  if (t) {
    const like = `%${escapeLike(t)}%`;
    const m = or(ilike(companies.name, like), ilike(companies.domain, like));
    if (m) where.push(m);
  }
  return getDb()
    .select({
      id: companies.id,
      name: companies.name,
      domain: companies.domain,
      lifecycle: companies.lifecycle,
      country: companies.country,
      ownerName: owner.name,
      ownerEmail: owner.email,
      contacts: sql<number>`(select count(*)::int from ${contacts} c where c.company_id = ${companies.id} and c.archived_at is null)`,
      openDeals: sql<number>`(select count(*)::int from ${deals} d join ${pipelineStages} s on s.id = d.stage_id where d.company_id = ${companies.id} and s.kind = 'open' and d.archived_at is null)`,
      openValue: sql<number>`(select coalesce(sum(d.monthly_value_cents), 0)::int from ${deals} d join ${pipelineStages} s on s.id = d.stage_id where d.company_id = ${companies.id} and s.kind = 'open' and d.archived_at is null)`,
      wonValue: sql<number>`(select coalesce(sum(d.monthly_value_cents), 0)::int from ${deals} d join ${pipelineStages} s on s.id = d.stage_id where d.company_id = ${companies.id} and s.kind = 'won' and d.archived_at is null)`,
    })
    .from(companies)
    .leftJoin(owner, eq(owner.id, companies.ownerId))
    .where(and(...where))
    .orderBy(asc(companies.name))
    .limit(500);
}

export async function getCompanyDetail(ws: WorkspaceId, id: string) {
  const db = getDb();
  const [company] = await db.select().from(companies).where(and(eq(companies.workspaceId, ws), eq(companies.id, id))).limit(1);
  if (!company) return null;
  const [people, companyDeals, companyLeads, timeline, taskRows] = await Promise.all([
    db.select().from(contacts).where(and(eq(contacts.companyId, id), isNull(contacts.archivedAt))).orderBy(desc(contacts.isPrimary), asc(contacts.firstName)),
    db
      .select({
        id: deals.id,
        title: deals.title,
        stageName: pipelineStages.name,
        stageKind: pipelineStages.kind,
        monthlyValueCents: deals.monthlyValueCents,
        currency: deals.currency,
        expectedClose: deals.expectedClose,
        closedAt: deals.closedAt,
      })
      .from(deals)
      .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
      .where(and(eq(deals.companyId, id), isNull(deals.archivedAt)))
      .orderBy(desc(deals.createdAt)),
    db
      .select({ id: leads.id, name: leads.name, email: leads.email, status: leads.status, createdAt: leads.createdAt })
      .from(leads)
      .where(eq(leads.companyId, id))
      .orderBy(desc(leads.createdAt)),
    getTimeline(ws, { companyId: id }),
    getTasksFor(ws, { companyId: id }),
  ]);
  return { company, contacts: people, deals: companyDeals, leads: companyLeads, timeline, tasks: taskRows };
}

/** Recent closed deals for the "won this month" figures. */
export async function closedSince(ws: WorkspaceId, since: Date) {
  return getDb()
    .select({ kind: pipelineStages.kind, value: sql<number>`coalesce(sum(${deals.monthlyValueCents}), 0)::int`, n: sql<number>`count(*)::int` })
    .from(deals)
    .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
    .where(and(eq(deals.workspaceId, ws), gte(deals.closedAt, since)))
    .groupBy(pipelineStages.kind);
}
