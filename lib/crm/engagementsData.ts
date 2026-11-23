import { and, asc, desc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getDb } from '@/db';
import { attachments, companies, contacts, deals, engagements, users, workspaces } from '@/db/schema';
import { logActivity, recordEvent } from './events';
import { isoDay, onboardingTemplate, rolesFromDeal, RENEWAL_WINDOW_DAYS } from './engagements';
import { getTasksFor, getTimeline } from './records';
import type { WorkspaceId } from './workspace';

/** Engagement reads and writes. The rules they apply are in engagements.ts. */

type Tx = Pick<ReturnType<typeof getDb>, 'insert' | 'select' | 'update'>;

export async function workspaceSettings(tx: Pick<ReturnType<typeof getDb>, 'select'>, ws: WorkspaceId) {
  const [w] = await tx.select({ settings: workspaces.settings }).from(workspaces).where(eq(workspaces.id, ws)).limit(1);
  return (w?.settings ?? {}) as Record<string, unknown>;
}

/**
 * A won deal becomes a customer engagement: same company, value and owner,
 * the deal's seats as its first role, and the workspace's onboarding steps.
 * Idempotent: a deal that is won, reopened and won again keeps one engagement.
 */
export async function createEngagementForDeal(tx: Tx, ws: WorkspaceId, dealId: string, actorId: string | null): Promise<string> {
  const [existing] = await tx.select({ id: engagements.id, status: engagements.status }).from(engagements).where(eq(engagements.dealId, dealId)).limit(1);
  if (existing) {
    /* Won again after being lost: bring a churned engagement back to onboarding. */
    if (existing.status === 'churned') {
      await tx.update(engagements).set({ status: 'onboarding', churnedAt: null, churnReason: null, updatedAt: new Date() }).where(eq(engagements.id, existing.id));
    }
    return existing.id;
  }
  const [d] = await tx.select().from(deals).where(and(eq(deals.workspaceId, ws), eq(deals.id, dealId))).limit(1);
  if (!d) throw new Error('deal not found');
  const settings = await workspaceSettings(tx, ws);
  const [row] = await tx.insert(engagements).values({
    workspaceId: ws,
    companyId: d.companyId,
    dealId: d.id,
    title: d.title,
    service: d.service,
    ownerId: d.ownerId,
    monthlyValueCents: d.monthlyValueCents,
    currency: d.currency,
    roles: rolesFromDeal(d),
    onboarding: onboardingTemplate(settings),
  }).returning({ id: engagements.id });
  await recordEvent(tx, { workspaceId: ws, type: 'engagement.created', subjectType: 'engagement', subjectId: row.id, actorId, payload: { dealId, companyId: d.companyId } });
  await logActivity(tx, { workspaceId: ws, type: 'system', engagementId: row.id, actorId, body: `Customer engagement started from the won deal ${d.title}`, meta: { dealId } });
  await logActivity(tx, { workspaceId: ws, type: 'system', dealId, actorId, body: 'Customer engagement created', meta: { engagementId: row.id } });
  return row.id;
}

export const CUSTOMER_VIEWS = [
  { key: '', label: 'All' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'active', label: 'Active' },
  { key: 'renewal', label: 'Renewal due' },
  { key: 'paused', label: 'Paused' },
  { key: 'churned', label: 'Churned' },
] as const;

function viewWhere(view: string, today: string): SQL[] {
  switch (view) {
    case 'onboarding': case 'active': case 'paused': case 'churned':
      return [eq(engagements.status, view)];
    case 'renewal':
      return [
        sql`${engagements.status} <> 'churned'`,
        sql`${engagements.renewalDate} <= (${today}::date + ${RENEWAL_WINDOW_DAYS}::int)`,
      ];
    default:
      return [];
  }
}

export async function listEngagements(ws: WorkspaceId, f: { view?: string; ownerId?: string; q?: string } = {}) {
  const owner = alias(users, 'owner');
  const today = isoDay(new Date());
  const where: SQL[] = [eq(engagements.workspaceId, ws), isNull(engagements.archivedAt), ...viewWhere(f.view ?? '', today)];
  if (f.ownerId) where.push(eq(engagements.ownerId, f.ownerId));
  return getDb()
    .select({
      id: engagements.id,
      title: engagements.title,
      service: engagements.service,
      status: engagements.status,
      monthlyValueCents: engagements.monthlyValueCents,
      currency: engagements.currency,
      roles: engagements.roles,
      onboarding: engagements.onboarding,
      startDate: engagements.startDate,
      renewalDate: engagements.renewalDate,
      noticeDays: engagements.noticeDays,
      companyId: engagements.companyId,
      companyName: companies.name,
      ownerName: owner.name,
      ownerEmail: owner.email,
    })
    .from(engagements)
    .leftJoin(companies, eq(companies.id, engagements.companyId))
    .leftJoin(owner, eq(owner.id, engagements.ownerId))
    .where(and(...where))
    .orderBy(sql`${engagements.renewalDate} asc nulls last`, asc(companies.name))
    .limit(500);
}

/** Counts and recurring revenue for the Customers summary and tab badges. */
export async function customerSummary(ws: WorkspaceId) {
  const today = isoDay(new Date());
  const [r] = await getDb()
    .select({
      all: sql<number>`count(*)::int`,
      onboarding: sql<number>`count(*) filter (where ${engagements.status} = 'onboarding')::int`,
      active: sql<number>`count(*) filter (where ${engagements.status} = 'active')::int`,
      paused: sql<number>`count(*) filter (where ${engagements.status} = 'paused')::int`,
      churned: sql<number>`count(*) filter (where ${engagements.status} = 'churned')::int`,
      renewal: sql<number>`count(*) filter (where ${engagements.status} <> 'churned' and ${engagements.renewalDate} <= (${today}::date + ${RENEWAL_WINDOW_DAYS}::int))::int`,
      mrr: sql<number>`coalesce(sum(${engagements.monthlyValueCents}) filter (where ${engagements.status} in ('active', 'onboarding')), 0)::bigint`,
    })
    .from(engagements)
    .where(and(eq(engagements.workspaceId, ws), isNull(engagements.archivedAt)));
  return { ...r, mrr: Number(r.mrr) };
}

export async function getEngagementDetail(ws: WorkspaceId, id: string) {
  const db = getDb();
  const owner = alias(users, 'owner');
  const [row] = await db
    .select({
      engagement: engagements,
      company: companies,
      deal: { id: deals.id, title: deals.title },
      ownerName: owner.name,
      ownerEmail: owner.email,
    })
    .from(engagements)
    .leftJoin(companies, eq(companies.id, engagements.companyId))
    .leftJoin(deals, eq(deals.id, engagements.dealId))
    .leftJoin(owner, eq(owner.id, engagements.ownerId))
    .where(and(eq(engagements.workspaceId, ws), eq(engagements.id, id)))
    .limit(1);
  if (!row) return null;
  const uploader = alias(users, 'uploader');
  const [people, files, timeline, taskRows] = await Promise.all([
    row.company
      ? db.select().from(contacts).where(and(eq(contacts.companyId, row.company.id), isNull(contacts.archivedAt))).orderBy(desc(contacts.isPrimary), asc(contacts.firstName))
      : Promise.resolve([]),
    db
      .select({
        id: attachments.id, kind: attachments.kind, name: attachments.name, sizeBytes: attachments.sizeBytes,
        createdAt: attachments.createdAt, uploaderName: uploader.name, uploaderEmail: uploader.email,
      })
      .from(attachments)
      .leftJoin(uploader, eq(uploader.id, attachments.uploadedBy))
      .where(and(eq(attachments.engagementId, id), isNull(attachments.archivedAt)))
      .orderBy(desc(attachments.createdAt)),
    getTimeline(ws, { engagementId: id }),
    getTasksFor(ws, { engagementId: id }),
  ]);
  return { ...row, contacts: people, files, timeline, tasks: taskRows };
}

export async function engagementsForCompany(ws: WorkspaceId, companyId: string) {
  return getDb()
    .select({
      id: engagements.id, title: engagements.title, status: engagements.status,
      monthlyValueCents: engagements.monthlyValueCents, currency: engagements.currency, renewalDate: engagements.renewalDate,
    })
    .from(engagements)
    .where(and(eq(engagements.workspaceId, ws), eq(engagements.companyId, companyId), isNull(engagements.archivedAt)))
    .orderBy(desc(engagements.createdAt));
}
