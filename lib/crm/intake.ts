import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';
import type { getDb } from '@/db';
import { leads } from '@/db/schema';
import { TEAM_LEAD_SOURCES } from '@/lib/leads/schema';
import { SOURCE_LABELS } from '@/lib/leads/display';
import { normalizeEmail } from './dedupe';
import { logActivity, recordEvent } from './events';
import { scoreLead } from './scoring';
import type { WorkspaceId } from './workspace';

/**
 * Leads the team creates — added by hand or imported from a file. Validated
 * the same way, scored with the same rules as a website enquiry, and written
 * with the same event and timeline entry, so a lead behaves identically
 * whichever door it came in through.
 */

const opt = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

export const TeamLeadInput = z.object({
  firstName: opt(60),
  lastName: opt(60),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(200),
  phone: opt(40),
  company: opt(160),
  country: opt(80),
  serviceInterest: opt(120),
  message: opt(5000),
  source: z.enum([...TEAM_LEAD_SOURCES, 'import']).default('manual'),
  ownerId: opt(100),
});
export type TeamLead = z.infer<typeof TeamLeadInput>;

type Tx = Pick<ReturnType<typeof getDb>, 'insert' | 'select'>;

/** Existing lead ids by normalised email, for duplicate checks. */
export async function existingByEmail(tx: Tx, ws: WorkspaceId, emails: string[]): Promise<Map<string, string>> {
  const list = [...new Set(emails.map((e) => normalizeEmail(e)).filter((e): e is string => Boolean(e)))];
  if (list.length === 0) return new Map();
  const found = new Map<string, string>();
  /* Chunked so a large import never builds one enormous IN list. */
  for (let i = 0; i < list.length; i += 500) {
    const rows = await tx
      .select({ id: leads.id, email: leads.email })
      .from(leads)
      .where(and(eq(leads.workspaceId, ws), inArray(leads.email, list.slice(i, i + 500))));
    for (const r of rows) if (!found.has(r.email)) found.set(r.email, r.id);
  }
  return found;
}

export async function createTeamLead(
  tx: Tx,
  ws: WorkspaceId,
  input: TeamLead,
  actorId: string,
  note?: string,
): Promise<string> {
  const name = [input.firstName, input.lastName].filter(Boolean).join(' ') || undefined;
  const scored = scoreLead({
    source: input.source,
    email: input.email,
    phone: input.phone,
    company: input.company,
    message: input.message,
    serviceInterest: input.serviceInterest,
  });

  const [row] = await tx
    .insert(leads)
    .values({
      workspaceId: ws,
      name,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      company: input.company,
      country: input.country,
      serviceInterest: input.serviceInterest,
      message: input.message,
      source: input.source,
      ownerId: input.ownerId ?? null,
      score: scored.score,
      priority: scored.priority,
    })
    .returning({ id: leads.id });

  await recordEvent(tx, {
    workspaceId: ws,
    type: 'lead.created',
    subjectType: 'lead',
    subjectId: row.id,
    actorId,
    payload: { source: input.source, score: scored.score, priority: scored.priority, ownerId: input.ownerId ?? null },
  });
  await logActivity(tx, {
    workspaceId: ws,
    type: 'system',
    leadId: row.id,
    actorId,
    body: note ?? `Added by hand · ${SOURCE_LABELS[input.source] ?? input.source}`,
    meta: { source: input.source, score: scored.score, reasons: scored.reasons },
  });
  return row.id;
}
