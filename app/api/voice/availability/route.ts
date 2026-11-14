import { z } from 'zod';
import { guard } from '@/lib/voice/guard';
import { voiceAgentConfigured } from '@/lib/voice/config';
import { availableTimes, calendlyConfigured, CalendlyError, eventType } from '@/lib/booking/calendly';
import { pickSlots, safeTimeZone } from '@/lib/booking/slots';
import { markMeetingRequested } from '@/lib/booking/stamp';

/**
 * POST /api/voice/availability — Maya's check_availability tool.
 *
 * Returns a handful of open consultation times, already labelled in the
 * visitor's timezone so Maya can read them out. `not_configured` is an answer,
 * not a failure: it is how Maya learns to say booking is not available yet.
 *
 * Asking for times is also the moment the visitor said they want a call, so
 * the saved lead is marked "meeting requested" here — before the Calendly
 * check, because that request matters most exactly when booking is off.
 */
export const dynamic = 'force-dynamic';

const Body = z.object({
  timezone: z.string().max(64).optional(),
  /** "Next week", "Thursday": the model turns those into a date. */
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** The lead capture_lead saved in this call, to mark as wanting a meeting. */
  leadId: z.string().uuid().optional(),
  email: z.string().max(200).optional(),
});

/** How far past `from` to look. Well inside Calendly's 31-day cap. */
const WINDOW_DAYS = 7;

export async function POST(req: Request) {
  if (!voiceAgentConfigured()) return Response.json({ ok: false, error: 'disabled' }, { status: 404 });
  const refused = guard(req, 'voice-avail', 10, 600);
  if (refused) return refused;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: 'invalid' }, { status: 400 });

  await markMeetingRequested(
    parsed.data.leadId,
    parsed.data.email,
    req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip'),
  );
  if (!calendlyConfigured()) return Response.json({ ok: false, error: 'not_configured' });

  const tz = safeTimeZone(parsed.data.timezone);
  const now = new Date();
  /* Calendly rejects a start in the past, and a date the model got wrong
     should still produce times rather than an error. */
  const asked = parsed.data.fromDate ? Date.parse(parsed.data.fromDate + 'T00:00:00Z') : NaN;
  const from = new Date(Math.max(now.getTime() + 60_000, Number.isNaN(asked) ? 0 : asked));
  const to = new Date(from.getTime() + WINDOW_DAYS * 86_400_000);

  try {
    const et = await eventType();
    const slots = pickSlots(await availableTimes(et, from, to), tz, now);
    return Response.json({ ok: true, timezone: tz, durationMinutes: et.duration, slots });
  } catch (err) {
    console.error('[voice] availability failed', err);
    const code = err instanceof CalendlyError ? err.code : 'unavailable';
    return Response.json({ ok: false, error: code === 'rate_limited' ? 'rate_limited' : 'unavailable' });
  }
}
