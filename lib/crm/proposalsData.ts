import { randomBytes } from 'node:crypto';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { agentTiers, companies, contacts, coverageOptions, deals, pipelineStages, proposals, workspaces } from '@/db/schema';
import type { ProposalLineRow } from '@/db/schema/crm';
import { moveDeal } from './dealsWrite';
import { isoDay } from './engagements';
import { logActivity, recordEvent } from './events';
import { ProposalLine, isOpen, proposalNumber, totals, type ProposalStatus } from './proposals';
import type { WorkspaceId } from './workspace';

/** Proposal reads and writes. The pricing rules are in proposals.ts. */

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

/** Tiers and coverage options from the rate catalogue (Admin → Rates). */
export async function catalogue() {
  const db = getDb();
  const [tiers, coverage] = await Promise.all([
    db.select({ key: agentTiers.key, label: agentTiers.label, rate: agentTiers.hourlyRateUsd, note: agentTiers.note })
      .from(agentTiers).where(eq(agentTiers.active, true)).orderBy(asc(agentTiers.sortOrder)),
    db.select({ key: coverageOptions.key, label: coverageOptions.label, longLabel: coverageOptions.longLabel, seats: coverageOptions.seats, hours: coverageOptions.monthlyHours })
      .from(coverageOptions).where(eq(coverageOptions.active, true)).orderBy(asc(coverageOptions.sortOrder)),
  ]);
  return {
    tiers: tiers.map((t) => ({ ...t, rateCents: Math.round(Number(t.rate) * 100) })),
    coverage,
  };
}

/** The next number for this year, P-2026-0001 onwards. Locks the workspace row so two drafts never share one. */
async function nextNumber(tx: Tx, ws: WorkspaceId): Promise<string> {
  await tx.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, ws)).for('update');
  const year = new Date().getUTCFullYear();
  const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(proposals)
    .where(and(eq(proposals.workspaceId, ws), sql`${proposals.number} like ${`P-${year}-%`}`));
  return proposalNumber(year, n + 1);
}

function token(): string {
  return randomBytes(24).toString('base64url');
}

/** A new draft for a deal, priced from the deal's own terms. */
export async function createDraft(tx: Tx, ws: WorkspaceId, dealId: string, actorId: string, copyFrom?: string): Promise<string> {
  const [d] = await tx
    .select({ deal: deals, companyName: companies.name, contact: contacts })
    .from(deals)
    .leftJoin(companies, eq(companies.id, deals.companyId))
    .leftJoin(contacts, eq(contacts.id, deals.contactId))
    .where(and(eq(deals.workspaceId, ws), eq(deals.id, dealId)))
    .limit(1);
  if (!d) throw new Error('That deal no longer exists.');

  let base: { title: string; intro: string | null; terms: string | null; lines: ProposalLineRow[]; discountBps: number } | null = null;
  if (copyFrom) {
    const [p] = await tx.select().from(proposals).where(and(eq(proposals.workspaceId, ws), eq(proposals.id, copyFrom), eq(proposals.dealId, dealId))).limit(1);
    if (p) base = { title: p.title, intro: p.intro, terms: p.terms, lines: p.lines, discountBps: p.discountBps };
  }
  const deal = d.deal;
  const lines: ProposalLineRow[] = base?.lines ?? (deal.monthlyValueCents || deal.seats
    ? [{
      kind: 'monthly',
      description: [deal.service ?? 'Dedicated team', deal.tier].filter(Boolean).join(' — '),
      tier: null, coverage: null,
      seats: deal.seats, hoursPerMonth: deal.hoursPerMonth, rateCents: deal.rateCents,
      amountCents: deal.hoursPerMonth && deal.rateCents ? 0 : deal.monthlyValueCents,
    }]
    : []);
  const t = totals(lines.map((l) => ProposalLine.parse(l)), base?.discountBps ?? 0);
  const valid = new Date(Date.now() + 14 * 86_400_000);
  const contactName = d.contact ? [d.contact.firstName, d.contact.lastName].filter(Boolean).join(' ') || null : null;
  const number = await nextNumber(tx, ws);
  const [row] = await tx.insert(proposals).values({
    workspaceId: ws,
    dealId,
    number,
    title: base?.title ?? `${d.companyName ?? deal.title}: ${deal.service ?? 'team'} proposal`,
    intro: base?.intro ?? null,
    terms: base?.terms ?? null,
    lines,
    discountBps: base?.discountBps ?? 0,
    currency: deal.currency,
    monthlyCents: t.monthly,
    oneOffCents: t.oneOff,
    validUntil: isoDay(valid),
    publicToken: token(),
    recipientName: contactName,
    recipientEmail: d.contact?.email ?? null,
    createdBy: actorId,
  }).returning({ id: proposals.id });
  await recordEvent(tx, { workspaceId: ws, type: 'proposal.created', subjectType: 'proposal', subjectId: row.id, actorId, payload: { dealId, number, copyFrom: copyFrom ?? null } });
  await logActivity(tx, { workspaceId: ws, type: 'system', dealId, actorId, body: `Proposal ${number} drafted${copyFrom ? ' (revision)' : ''}`, meta: { proposalId: row.id } });
  return row.id;
}

export async function getProposal(ws: WorkspaceId, id: string) {
  const [row] = await getDb()
    .select({ proposal: proposals, dealTitle: deals.title, dealStageKind: pipelineStages.kind, companyName: companies.name })
    .from(proposals)
    .innerJoin(deals, eq(deals.id, proposals.dealId))
    .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
    .leftJoin(companies, eq(companies.id, deals.companyId))
    .where(and(eq(proposals.workspaceId, ws), eq(proposals.id, id)))
    .limit(1);
  return row ?? null;
}

export async function proposalsForDeal(ws: WorkspaceId, dealId: string) {
  return getDb().select({
    id: proposals.id, number: proposals.number, title: proposals.title, status: proposals.status,
    monthlyCents: proposals.monthlyCents, currency: proposals.currency, sentAt: proposals.sentAt, updatedAt: proposals.updatedAt,
  }).from(proposals).where(and(eq(proposals.workspaceId, ws), eq(proposals.dealId, dealId))).orderBy(desc(proposals.createdAt));
}

export async function listProposals(ws: WorkspaceId, status?: string) {
  const where = [eq(proposals.workspaceId, ws)];
  if (status) where.push(eq(proposals.status, status as ProposalStatus));
  return getDb().select({
    id: proposals.id, number: proposals.number, title: proposals.title, status: proposals.status,
    monthlyCents: proposals.monthlyCents, oneOffCents: proposals.oneOffCents, currency: proposals.currency,
    sentAt: proposals.sentAt, viewedAt: proposals.viewedAt, decidedAt: proposals.decidedAt, validUntil: proposals.validUntil,
    dealId: proposals.dealId, companyName: companies.name,
  }).from(proposals)
    .innerJoin(deals, eq(deals.id, proposals.dealId))
    .leftJoin(companies, eq(companies.id, deals.companyId))
    .where(and(...where)).orderBy(desc(proposals.updatedAt)).limit(300);
}

/** Marks a draft as sent (by email or by hand); moves an early deal on to the "Proposal sent" stage. */
export async function markSent(tx: Tx, ws: WorkspaceId, id: string, actorId: string, how: 'email' | 'link') {
  const [p] = await tx.select().from(proposals).where(and(eq(proposals.workspaceId, ws), eq(proposals.id, id))).for('update');
  if (!p) throw new Error('That proposal no longer exists.');
  if (p.status !== 'draft') throw new Error('This proposal has already been sent.');
  if (p.lines.length === 0) throw new Error('Add at least one line before sending.');
  await tx.update(proposals).set({ status: 'sent', sentAt: new Date(), updatedAt: new Date() }).where(eq(proposals.id, id));
  await recordEvent(tx, { workspaceId: ws, type: 'proposal.sent', subjectType: 'proposal', subjectId: id, actorId, payload: { dealId: p.dealId, how } });
  await logActivity(tx, {
    workspaceId: ws, type: how === 'email' ? 'email' : 'system', dealId: p.dealId, actorId,
    body: `Proposal ${p.number} sent${how === 'email' ? ` by email to ${p.recipientEmail}` : ''}`, meta: { proposalId: id },
  });
  /* Earlier in the pipeline than "Proposal sent"? Move it there. */
  const [deal] = await tx.select({ stageId: deals.stageId, position: pipelineStages.position, kind: pipelineStages.kind }).from(deals)
    .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId)).where(eq(deals.id, p.dealId));
  const [target] = await tx.select({ id: pipelineStages.id, position: pipelineStages.position }).from(pipelineStages)
    .where(and(eq(pipelineStages.workspaceId, ws), eq(pipelineStages.kind, 'open'), sql`lower(${pipelineStages.name}) = 'proposal sent'`, sql`${pipelineStages.archivedAt} is null`)).limit(1);
  if (deal && target && deal.kind === 'open' && deal.position < target.position) await moveDeal(tx, ws, p.dealId, target.id, actorId);
  return p;
}

export async function withdraw(tx: Tx, ws: WorkspaceId, id: string, actorId: string) {
  const [p] = await tx.select().from(proposals).where(and(eq(proposals.workspaceId, ws), eq(proposals.id, id))).for('update');
  if (!p) throw new Error('That proposal no longer exists.');
  if (!isOpen(p.status) && p.status !== 'draft') throw new Error('Only a draft or an unanswered proposal can be withdrawn.');
  await tx.update(proposals).set({ status: 'withdrawn', updatedAt: new Date() }).where(eq(proposals.id, id));
  await recordEvent(tx, { workspaceId: ws, type: 'proposal.withdrawn', subjectType: 'proposal', subjectId: id, actorId, payload: { dealId: p.dealId } });
  await logActivity(tx, { workspaceId: ws, type: 'system', dealId: p.dealId, actorId, body: `Proposal ${p.number} withdrawn`, meta: { proposalId: id } });
}

/* ── the client side (/p/<token>) ─────────────────────────────────────────── */

export async function byToken(tok: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(tok)) return null;
  const [row] = await getDb()
    .select({ proposal: proposals, companyName: companies.name })
    .from(proposals)
    .innerJoin(deals, eq(deals.id, proposals.dealId))
    .leftJoin(companies, eq(companies.id, deals.companyId))
    .where(eq(proposals.publicToken, tok))
    .limit(1);
  /* A draft is not shared yet. */
  return row && row.proposal.status !== 'draft' ? row : null;
}

/** First open by the client: Sent → Viewed. */
export async function markViewed(tok: string) {
  await getDb().transaction(async (tx) => {
    const [p] = await tx.select().from(proposals).where(eq(proposals.publicToken, tok)).for('update');
    if (!p || p.status !== 'sent') return;
    await tx.update(proposals).set({ status: 'viewed', viewedAt: new Date(), updatedAt: new Date() }).where(eq(proposals.id, p.id));
    await recordEvent(tx, { workspaceId: p.workspaceId, type: 'proposal.viewed', subjectType: 'proposal', subjectId: p.id, payload: { dealId: p.dealId } });
    await logActivity(tx, { workspaceId: p.workspaceId, type: 'system', dealId: p.dealId, body: `The client opened proposal ${p.number}`, meta: { proposalId: p.id } });
  });
}

/**
 * The client's answer. Accepting sets the deal's value to the proposal's and
 * moves it to Won (which starts the customer's onboarding); declining logs the
 * reason. Either way the proposal is closed for further answers.
 */
export async function decide(tok: string, accept: boolean, name: string, note: string | null) {
  return getDb().transaction(async (tx) => {
    const [p] = await tx.select().from(proposals).where(eq(proposals.publicToken, tok)).for('update');
    if (!p) throw new Error('This proposal could not be found.');
    if (!isOpen(p.status)) throw new Error('This proposal has already been answered or withdrawn.');
    if (p.validUntil && p.validUntil < isoDay(new Date())) throw new Error('This proposal has expired. Ask us for an updated one.');
    const ws = p.workspaceId;
    await tx.update(proposals).set({
      status: accept ? 'accepted' : 'declined', decidedAt: new Date(), decidedByName: name, decisionNote: note, updatedAt: new Date(),
    }).where(eq(proposals.id, p.id));
    await recordEvent(tx, { workspaceId: ws, type: accept ? 'proposal.accepted' : 'proposal.declined', subjectType: 'proposal', subjectId: p.id, payload: { dealId: p.dealId, name } });
    await logActivity(tx, {
      workspaceId: ws, type: 'system', dealId: p.dealId,
      body: `${name} ${accept ? 'accepted' : 'declined'} proposal ${p.number}${note ? `: ${note}` : ''}`, meta: { proposalId: p.id },
    });
    if (accept) {
      await tx.update(deals).set({ monthlyValueCents: p.monthlyCents, updatedAt: new Date() }).where(eq(deals.id, p.dealId));
      const [won] = await tx.select({ id: pipelineStages.id }).from(pipelineStages)
        .where(and(eq(pipelineStages.workspaceId, ws), eq(pipelineStages.kind, 'won'), sql`${pipelineStages.archivedAt} is null`)).limit(1);
      /* The client acted, not a staff member: no actor. */
      if (won) await moveDeal(tx, ws, p.dealId, won.id, null);
    }
    return { number: p.number };
  });
}

export function totalsFor(p: { lines: ProposalLineRow[]; discountBps: number }) {
  return totals(p.lines.map((l) => ProposalLine.parse(l)), p.discountBps);
}
