import 'server-only';
import { API_URL } from '@/lib/api/server';

/**
 * Write Maya's booking onto the lead she saved earlier in the same
 * conversation — POST /v1/public/leads/:id/booking on the backend. The
 * backend only accepts it for that lead's own email and within two hours of
 * the lead being created, adds a "meeting" entry to the lead's timeline, and
 * (for a confirmed booking) alerts the team.
 *
 * Best effort: a failure here must never fail the visitor's booking, which
 * Calendly has already made. Errors are logged.
 */
async function postBooking(
  leadId: string,
  body: { email: string; kind: 'requested' | 'booked'; fields?: Record<string, string>; note?: string },
  forwardedFor: string | null,
): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/v1/public/leads/${encodeURIComponent(leadId)}/booking`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok && res.status !== 404) {
      console.error(`[voice] booking stamp answered ${res.status}`);
    }
  } catch (err) {
    console.error('[voice] booking stamp failed', err);
  }
}

/** After a confirmed Calendly booking. */
export async function stampLead(
  leadId: string | undefined,
  email: string | undefined,
  fields: Record<string, string>,
  note: string | undefined,
  forwardedFor: string | null,
): Promise<void> {
  if (!leadId || !email) return;
  await postBooking(leadId, { email, kind: 'booked', fields, note }, forwardedFor);
}

/** As soon as the visitor asks for a call, whether or not the booking works. */
export async function markMeetingRequested(
  leadId: string | undefined,
  email: string | undefined,
  forwardedFor: string | null,
): Promise<void> {
  if (!leadId || !email) return;
  await postBooking(leadId, { email, kind: 'requested' }, forwardedFor);
}
