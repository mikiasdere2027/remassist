import { z } from 'zod';

/**
 * Proposal rules — pure and unit-tested. A proposal's lines and totals are
 * frozen when it is sent: what the client saw is what is stored, never
 * recalculated from today's rates.
 */

export const PROPOSAL_STATUSES = ['draft', 'sent', 'viewed', 'accepted', 'declined', 'withdrawn'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Draft', sent: 'Sent', viewed: 'Viewed', accepted: 'Accepted', declined: 'Declined', withdrawn: 'Withdrawn',
};

/** Only drafts can be edited; sent ones can be withdrawn and copied into a new draft. */
export function isEditable(status: ProposalStatus): boolean {
  return status === 'draft';
}
/** The client can still answer. */
export function isOpen(status: ProposalStatus): boolean {
  return status === 'sent' || status === 'viewed';
}

export const ProposalLine = z.object({
  kind: z.enum(['monthly', 'one_off']),
  description: z.string().trim().min(1, 'Every line needs a description.').max(300),
  /** Monthly lines: the catalogue tier and coverage they were priced from (for the record). */
  tier: z.string().max(40).nullable().default(null),
  coverage: z.string().max(40).nullable().default(null),
  seats: z.number().int().min(0).max(1000).nullable().default(null),
  hoursPerMonth: z.number().int().min(0).max(100_000).nullable().default(null),
  rateCents: z.number().int().min(0).max(10_000_000).nullable().default(null),
  /** One-off lines: the amount. Monthly lines: computed (hours × rate) unless given with no hours. */
  amountCents: z.number().int().min(0).max(1_000_000_000).default(0),
});
export type ProposalLine = z.infer<typeof ProposalLine>;

export const MAX_LINES = 30;

/** A monthly line's amount: hours × hourly rate when both are known, else the amount entered. */
export function lineAmount(l: ProposalLine): number {
  if (l.kind === 'monthly' && l.hoursPerMonth && l.rateCents) return l.hoursPerMonth * l.rateCents;
  return l.amountCents;
}

export interface Totals {
  monthlySubtotal: number;
  discount: number;
  monthly: number;
  oneOff: number;
  /** First invoice: one month plus the one-off fees. */
  firstMonth: number;
  annual: number;
}

/** Discount in basis points (1000 = 10%) applies to the monthly fees only. */
export function totals(lines: ProposalLine[], discountBps: number): Totals {
  const monthlySubtotal = lines.filter((l) => l.kind === 'monthly').reduce((n, l) => n + lineAmount(l), 0);
  const oneOff = lines.filter((l) => l.kind === 'one_off').reduce((n, l) => n + lineAmount(l), 0);
  const bps = Math.max(0, Math.min(10_000, Math.round(discountBps)));
  const discount = Math.round((monthlySubtotal * bps) / 10_000);
  const monthly = monthlySubtotal - discount;
  return { monthlySubtotal, discount, monthly, oneOff, firstMonth: monthly + oneOff, annual: monthly * 12 };
}

/** "P-2026-0007". */
export function proposalNumber(year: number, sequence: number): string {
  return `P-${year}-${String(sequence).padStart(4, '0')}`;
}

/** "12.5" → 1250 basis points; null for anything that is not 0–100. */
export function parsePercentToBps(input: string | null | undefined): number | null {
  const t = (input ?? '').trim().replace('%', '');
  if (!t) return 0;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return null;
  const bps = Math.round(Number(t) * 100);
  return bps > 10_000 ? null : bps;
}

/** A proposal is expired once its valid-until day has passed (still answerable only while open). */
export function isExpired(validUntil: string | null, today: string): boolean {
  return Boolean(validUntil && validUntil < today);
}
