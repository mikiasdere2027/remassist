import { z } from 'zod';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { getDb } from '@/db';
import { companies, contacts, deals, leads, lossReasons, pipelineStages, quizSubmissions } from '@/db/schema';
import { companyDomainFromEmail, domainFromWebsite, normalizeEmail } from './dedupe';
import { logActivity, recordEvent } from './events';
import { monthlyValueCents, parseMoneyToCents } from './money';
import { toE164 } from './phone';
import type { WorkspaceId } from './workspace';
import { createEngagementForDeal } from './engagementsData';

/**
 * Deal writes: create (from a lead or from scratch), find-or-create the
 * company and contact, and move between stages. Every function runs inside
 * the caller's transaction and writes its own events and timeline entries.
 */

type Tx = Pick<ReturnType<typeof getDb>, 'insert' | 'select' | 'update'>;

const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));
const optInt = (max: number) =>
  z.union([z.literal(''), z.coerce.number().int().min(0).max(max)]).optional().transform((v) => (v === '' || v === undefined ? undefined : v));

export const DealInput = z.object({
  title: z.string().trim().min(1, 'Give the deal a title.').max(200, 'Keep the title under 200 characters.'),
  companyName: optText(160),
  contactEmail: z.union([z.literal(''), z.string().trim().toLowerCase().email('The contact email is not valid.')]).optional()
    .transform((v) => (v ? v : undefined)),
  contactName: optText(120),
  service: optText(120),
  tier: optText(80),
  seats: optInt(10_000),
  hoursPerMonth: optInt(100_000),
  rate: optText(20),
  monthlyValue: optText(20),
  probability: optInt(100),
  expectedClose: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a full date for expected close.')]).optional()
    .transform((v) => (v ? v : undefined)),
  stageId: z.string().uuid('Choose a stage.'),
  ownerId: optText(100),
});
export type DealFields = z.infer<typeof DealInput>;

/** Money fields as cents, or an error message. */
export function dealMoney(d: Pick<DealFields, 'rate' | 'monthlyValue' | 'hoursPerMonth'>):
  { rateCents: number | null; monthlyValueCents: number } | { error: string } {
  const rateCents = d.rate ? parseMoneyToCents(d.rate) : null;
  if (d.rate && rateCents === null) return { error: 'The hourly rate must be an amount like 9 or 12.50.' };
  const entered = d.monthlyValue ? parseMoneyToCents(d.monthlyValue) : null;
  if (d.monthlyValue && entered === null) return { error: 'The monthly value must be an amount like 2400.' };
  return { rateCents, monthlyValueCents: monthlyValueCents(d.hoursPerMonth ?? null, rateCents, entered) };
}

/** A company by domain, then by name (case-insensitive); created if neither matches. */
export async function findOrCreateCompany(
  tx: Tx, ws: WorkspaceId, name: string, hints: { email?: string | null; website?: string | null; country?: string | null; ownerId?: string | null },
  actorId: string | null,
): Promise<{ id: string; created: boolean }> {
  const domain = domainFromWebsite(hints.website) ?? companyDomainFromEmail(hints.email);
  if (domain) {
    const [byDomain] = await tx.select({ id: companies.id }).from(companies)
      .where(and(eq(companies.workspaceId, ws), eq(companies.domain, domain))).limit(1);
    if (byDomain) return { id: byDomain.id, created: false };
  }
  const [byName] = await tx.select({ id: companies.id }).from(companies)
    .where(and(eq(companies.workspaceId, ws), sql`lower(${companies.name}) = lower(${name})`, isNull(companies.archivedAt))).limit(1);
  if (byName) return { id: byName.id, created: false };

  const [row] = await tx.insert(companies).values({
    workspaceId: ws, name, domain, website: hints.website ?? null, country: hints.country ?? null, ownerId: hints.ownerId ?? null,
  }).returning({ id: companies.id });
  await recordEvent(tx, { workspaceId: ws, type: 'company.created', subjectType: 'company', subjectId: row.id, actorId, payload: { name, domain } });
  await logActivity(tx, { workspaceId: ws, type: 'system', companyId: row.id, actorId, body: 'Company added' });
  return { id: row.id, created: true };
}

/** A contact by email within the workspace; created (linked to the company) if new. */
export async function findOrCreateContact(
  tx: Tx, ws: WorkspaceId,
  p: { email: string; firstName?: string | null; lastName?: string | null; phone?: string | null; country?: string | null; companyId: string | null; ownerId?: string | null },
  actorId: string | null,
): Promise<{ id: string; created: boolean }> {
  const email = normalizeEmail(p.email);
  if (email) {
    const [found] = await tx.select({ id: contacts.id, companyId: contacts.companyId }).from(contacts)
      .where(and(eq(contacts.workspaceId, ws), eq(contacts.email, email))).limit(1);
    if (found) {
      if (!found.companyId && p.companyId) await tx.update(contacts).set({ companyId: p.companyId, updatedAt: new Date() }).where(eq(contacts.id, found.id));
      return { id: found.id, created: false };
    }
  }
  const hasPrimary = p.companyId
    ? (await tx.select({ id: contacts.id }).from(contacts).where(and(eq(contacts.companyId, p.companyId), eq(contacts.isPrimary, true))).limit(1)).length > 0
    : true;
  const [row] = await tx.insert(contacts).values({
    workspaceId: ws, companyId: p.companyId, email, firstName: p.firstName ?? null, lastName: p.lastName ?? null,
    phone: p.phone ?? null, phoneE164: toE164(p.phone, p.country), ownerId: p.ownerId ?? null, isPrimary: !hasPrimary,
  }).returning({ id: contacts.id });
  await recordEvent(tx, { workspaceId: ws, type: 'contact.created', subjectType: 'contact', subjectId: row.id, actorId, payload: { companyId: p.companyId } });
  return { id: row.id, created: true };
}

async function stageById(tx: Tx, ws: WorkspaceId, id: string) {
  const [s] = await tx.select().from(pipelineStages)
    .where(and(eq(pipelineStages.workspaceId, ws), eq(pipelineStages.id, id), isNull(pipelineStages.archivedAt))).limit(1);
  return s ?? null;
}

/**
 * Create a deal. With `leadId` this is a conversion: the lead's contact
 * details and fit-finder quote carry over, and the lead becomes Converted.
 */
export async function createDeal(
  tx: Tx, ws: WorkspaceId, input: DealFields, actorId: string, leadId?: string,
): Promise<{ dealId: string; companyId: string | null; contactId: string | null } | { error: string }> {
  const money = dealMoney(input);
  if ('error' in money) return money;
  const stage = await stageById(tx, ws, input.stageId);
  if (!stage || stage.kind !== 'open') return { error: 'Choose an open stage for a new deal.' };

  const lead = leadId
    ? (await tx.select().from(leads).where(and(eq(leads.workspaceId, ws), eq(leads.id, leadId))).for('update').limit(1))[0]
    : undefined;
  if (leadId && !lead) return { error: 'That lead no longer exists.' };
  if (lead?.status === 'converted') return { error: 'This lead has already been converted.' };

  const ownerId = input.ownerId ?? lead?.ownerId ?? actorId;
  const companyName = input.companyName ?? lead?.company ?? undefined;
  const company = companyName
    ? await findOrCreateCompany(tx, ws, companyName, { email: lead?.email ?? input.contactEmail, country: lead?.country, ownerId }, actorId)
    : null;

  const email = lead?.email ?? input.contactEmail;
  const [first, ...rest] = (input.contactName ?? '').split(/\s+/).filter(Boolean);
  const contact = email
    ? await findOrCreateContact(tx, ws, {
      email,
      firstName: lead?.firstName ?? (lead?.name ? lead.name.split(/\s+/)[0] : first),
      lastName: lead?.lastName ?? (lead?.name ? lead.name.split(/\s+/).slice(1).join(' ') || null : rest.join(' ') || null),
      phone: lead?.phone, country: lead?.country, companyId: company?.id ?? null, ownerId,
    }, actorId)
    : null;

  const quiz = lead
    ? (await tx.select({ id: quizSubmissions.id }).from(quizSubmissions).where(eq(quizSubmissions.leadId, lead.id)).orderBy(desc(quizSubmissions.createdAt)).limit(1))[0]
    : undefined;

  const [deal] = await tx.insert(deals).values({
    workspaceId: ws,
    title: input.title,
    companyId: company?.id ?? null,
    contactId: contact?.id ?? null,
    leadId: lead?.id ?? null,
    ownerId,
    stageId: stage.id,
    service: input.service ?? lead?.serviceInterest ?? null,
    tier: input.tier ?? null,
    seats: input.seats ?? null,
    hoursPerMonth: input.hoursPerMonth ?? null,
    rateCents: money.rateCents,
    monthlyValueCents: money.monthlyValueCents,
    probability: input.probability ?? null,
    expectedClose: input.expectedClose ?? null,
    quizSubmissionId: quiz?.id ?? null,
  }).returning({ id: deals.id });

  await recordEvent(tx, {
    workspaceId: ws, type: 'deal.created', subjectType: 'deal', subjectId: deal.id, actorId,
    payload: { leadId: lead?.id ?? null, companyId: company?.id ?? null, stageId: stage.id, monthlyValueCents: money.monthlyValueCents },
  });
  await logActivity(tx, {
    workspaceId: ws, type: 'system', dealId: deal.id, actorId,
    body: lead ? `Deal created from the lead ${lead.name || lead.email}` : 'Deal created', meta: { stage: stage.name },
  });
  if (company) {
    await logActivity(tx, { workspaceId: ws, type: 'system', companyId: company.id, actorId, body: `Deal opened: ${input.title}`, meta: { dealId: deal.id } });
  }

  if (lead) {
    await tx.update(leads).set({
      status: 'converted',
      convertedAt: new Date(),
      companyId: company?.id ?? lead.companyId,
      contactId: contact?.id ?? lead.contactId,
      ownerId: lead.ownerId ?? ownerId,
      firstContactedAt: lead.firstContactedAt ?? (lead.status === 'new' ? new Date() : null),
      updatedAt: new Date(),
    }).where(eq(leads.id, lead.id));
    await recordEvent(tx, {
      workspaceId: ws, type: 'lead.converted', subjectType: 'lead', subjectId: lead.id, actorId,
      payload: { dealId: deal.id, companyId: company?.id ?? null, contactId: contact?.id ?? null },
    });
    await logActivity(tx, {
      workspaceId: ws, type: 'status_change', leadId: lead.id, actorId,
      meta: { from: lead.status, to: 'converted', dealId: deal.id },
    });
  }

  return { dealId: deal.id, companyId: company?.id ?? null, contactId: contact?.id ?? null };
}

/**
 * Move a deal to another stage. Won closes it and makes the company a
 * customer; Lost needs a reason; moving a closed deal back to an open stage
 * reopens it.
 */
export async function moveDeal(
  tx: Tx, ws: WorkspaceId, dealId: string, stageId: string, actorId: string,
  loss?: { reasonId?: string; note?: string },
): Promise<{ ok: true } | { error: string }> {
  const [deal] = await tx.select().from(deals).where(and(eq(deals.workspaceId, ws), eq(deals.id, dealId))).for('update').limit(1);
  if (!deal) return { error: 'That deal no longer exists.' };
  if (deal.stageId === stageId) return { ok: true };
  const [from, to] = await Promise.all([stageById(tx, ws, deal.stageId), stageById(tx, ws, stageId)]);
  if (!to) return { error: 'That stage no longer exists.' };

  let lossReasonId: string | null = null;
  if (to.kind === 'lost') {
    if (!loss?.reasonId) return { error: 'Choose why the deal was lost.' };
    const [r] = await tx.select({ id: lossReasons.id, label: lossReasons.label }).from(lossReasons)
      .where(and(eq(lossReasons.workspaceId, ws), eq(lossReasons.id, loss.reasonId))).limit(1);
    if (!r) return { error: 'That loss reason no longer exists.' };
    lossReasonId = r.id;
  }

  const now = new Date();
  await tx.update(deals).set({
    stageId,
    stageChangedAt: now,
    closedAt: to.kind === 'open' ? null : now,
    lossReasonId: to.kind === 'lost' ? lossReasonId : null,
    lossNote: to.kind === 'lost' ? (loss?.note?.trim() || null) : null,
    updatedAt: now,
  }).where(eq(deals.id, dealId));

  const meta = { from: deal.stageId, to: stageId, fromName: from?.name ?? null, toName: to.name, toKind: to.kind };
  await recordEvent(tx, { workspaceId: ws, type: 'deal.stage_changed', subjectType: 'deal', subjectId: dealId, actorId, payload: meta });
  if (to.kind === 'won') await recordEvent(tx, { workspaceId: ws, type: 'deal.won', subjectType: 'deal', subjectId: dealId, actorId, payload: { monthlyValueCents: deal.monthlyValueCents } });
  if (to.kind === 'lost') await recordEvent(tx, { workspaceId: ws, type: 'deal.lost', subjectType: 'deal', subjectId: dealId, actorId, payload: { lossReasonId } });
  if (to.kind === 'open' && from && from.kind !== 'open') await recordEvent(tx, { workspaceId: ws, type: 'deal.reopened', subjectType: 'deal', subjectId: dealId, actorId, payload: {} });
  await logActivity(tx, {
    workspaceId: ws, type: 'stage_change', dealId, actorId, meta,
    body: to.kind === 'lost' && loss?.note?.trim() ? loss.note.trim() : null,
  });

  if (to.kind === 'won' && deal.companyId) {
    await tx.update(companies).set({ lifecycle: 'customer', updatedAt: now }).where(eq(companies.id, deal.companyId));
    await logActivity(tx, { workspaceId: ws, type: 'system', companyId: deal.companyId, actorId, body: `Became a customer: ${deal.title} won`, meta: { dealId } });
  }
  /* Every won deal becomes a customer engagement (lib/crm/engagementsData.ts). */
  if (to.kind === 'won') await createEngagementForDeal(tx, ws, dealId, actorId);
  return { ok: true };
}
