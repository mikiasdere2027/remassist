import { getDb, isDatabaseConfigured } from '@/db';
import { parseCalendly, verifyCalendlySignature } from '@/lib/crm/automation';
import { recordBooking } from '@/lib/crm/automationData';
import { currentWorkspaceId } from '@/lib/crm/workspace';

/**
 * Calendly webhook (invitee.created / invitee.canceled). Each delivery is
 * signed with the subscription's signing key (CALENDLY_WEBHOOK_SIGNING_KEY);
 * an unsigned, tampered or stale request is refused. Bookings are logged on
 * the matching lead (or create a "Booked a call" lead) with a task at the
 * meeting time; cancellations are logged and close that task.
 *
 * Register the subscription once with tools/calendly-webhook.mts.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const key = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (!key || !isDatabaseConfigured()) return new Response('Not found', { status: 404 });

  const raw = await req.text();
  if (raw.length > 200_000) return new Response('Too large', { status: 413 });
  if (!verifyCalendlySignature(req.headers.get('calendly-webhook-signature'), raw, key)) {
    return new Response('Invalid signature', { status: 401 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }
  const booking = parseCalendly(body);
  /* Other event types are acknowledged so Calendly does not retry them. */
  if (!booking) return Response.json({ ok: true, ignored: true });

  try {
    const r = await getDb().transaction((tx) => recordBooking(tx, currentWorkspaceId(), booking));
    return Response.json({ ok: true, ...r });
  } catch (err) {
    console.error('[calendly] could not record booking', err);
    return new Response('Error', { status: 500 });           // Calendly retries 5xx
  }
}
