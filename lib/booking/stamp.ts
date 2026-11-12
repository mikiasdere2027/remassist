import { and, eq, gt, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { leads } from '@/db/schema';

/**
 * Write booking progress onto the lead Maya saved earlier in the call.
 *
 * The lead is created once (capture_lead), before the visitor has necessarily
 * said anything about a call. Asking for times and booking one happen later,
 * so they land here: merged into raw_fields for queries, and appended to the
 * message for whoever reads the lead.
 *
 * Matched on id AND email AND recency, because the id arrives from the
 * browser: a guessed or replayed one must not be able to touch somebody
 * else's record. Never throws — the booking itself is what matters.
 */

const MATCH_WINDOW_MS = 2 * 60 * 60_000;

export async function stampLead(
  leadId: string | undefined,
  email: string | undefined,
  fields: Record<string, string>,
  note?: string,
): Promise<void> {
  if (!leadId || !email || !isDatabaseConfigured()) return;
  try {
    await getDb()
      .update(leads)
      .set({
        rawFields: sql`coalesce(${leads.rawFields}, '{}'::jsonb) || ${JSON.stringify(fields)}::jsonb`,
        ...(note ? { message: sql`coalesce(${leads.message}, '') || ${'\n' + note}` } : {}),
      })
      .where(and(
        eq(leads.id, leadId),
        eq(leads.email, email.trim().toLowerCase()),
        gt(leads.createdAt, new Date(Date.now() - MATCH_WINDOW_MS)),
      ));
  } catch (err) {
    console.error('[voice] lead stamp failed', err);
  }
}

/**
 * The visitor asked for a call after their lead was saved. Idempotent: Maya
 * may look up times several times, so this flips the flag and rewrites the
 * "Meeting requested: no" line toLeadBody wrote, rather than appending.
 */
export async function markMeetingRequested(leadId: string | undefined, email: string | undefined): Promise<void> {
  if (!leadId || !email || !isDatabaseConfigured()) return;
  try {
    await getDb()
      .update(leads)
      .set({
        rawFields: sql`coalesce(${leads.rawFields}, '{}'::jsonb) || '{"meetingRequested":"yes"}'::jsonb`,
        message: sql`replace(coalesce(${leads.message}, ''), 'Meeting requested: no', 'Meeting requested: YES')`,
      })
      .where(and(
        eq(leads.id, leadId),
        eq(leads.email, email.trim().toLowerCase()),
        gt(leads.createdAt, new Date(Date.now() - MATCH_WINDOW_MS)),
      ));
  } catch (err) {
    console.error('[voice] meeting-request stamp failed', err);
  }
}
