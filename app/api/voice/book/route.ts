import { z } from 'zod';
import { guard } from '@/lib/voice/guard';
import { voiceAgentConfigured } from '@/lib/voice/config';
import { book, calendlyConfigured, CalendlyError, eventType } from '@/lib/booking/calendly';
import { safeTimeZone, slotLabel } from '@/lib/booking/slots';
import { markMeetingRequested, stampLead } from '@/lib/booking/stamp';

/**
 * POST /api/voice/book — Maya's book_meeting tool.
 *
 * Books the consultation in Calendly (which sends the invite itself), then
 * stamps the booking onto the lead Maya saved a moment earlier, and tells
 * the team. The lead is the record; Calendly is where the meeting lives.
 */
export const dynamic = 'force-dynamic';

const Body = z.object({
  start: z.string().datetime({ offset: true }),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(40).optional(),
  timezone: z.string().max(64).optional(),
  notes: z.string().trim().max(2000).optional(),
  /** The id /api/leads returned for this visitor, if Maya saved them first. */
  leadId: z.string().uuid().optional(),
  utm: z.record(z.string().max(40), z.string().max(200)).optional(),
});

export async function POST(req: Request) {
  if (!voiceAgentConfigured()) return Response.json({ ok: false, error: 'disabled' }, { status: 404 });
  const refused = guard(req, 'voice-book', 3, 600);
  if (refused) return refused;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: 'bad_input' });
  const d = parsed.data;
  /* The visitor's address, so the backend's per-visitor limits apply. */
  const forwardedFor = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip');

  /* Whatever happens next, they asked for a call: the team should see that. */
  await markMeetingRequested(d.leadId, d.email, forwardedFor);
  if (!calendlyConfigured()) return Response.json({ ok: false, error: 'not_configured' });
  const tz = safeTimeZone(d.timezone);

  let booking;
  try {
    const et = await eventType();
    booking = await book(et, {
      start: d.start,
      name: d.name,
      email: d.email,
      timezone: tz,
      phone: d.phone,
      summary: d.notes || 'Booked by Maya, the website voice assistant.',
      utm: d.utm,
    });
  } catch (err) {
    console.error('[voice] booking failed', err);
    return Response.json({ ok: false, error: err instanceof CalendlyError ? err.code : 'unavailable' });
  }

  const label = slotLabel(d.start, tz);

  await stampLead(
    d.leadId,
    d.email,
    {
      meetingRequested: 'yes',
      meetingBooked: 'yes',
      meetingAt: d.start,
      meetingTimezone: tz,
      calendlyEvent: booking.eventUri,
      rescheduleUrl: booking.rescheduleUrl,
    },
    `Meeting booked: ${label} (${tz})`,
    forwardedFor,
  );
  /* The backend alerts the team (email + webhook) when it records the
     booking on the lead. Calendly also emails the host directly. */

  return Response.json({ ok: true, when: label, timezone: tz });
}
