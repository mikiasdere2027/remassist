import { getDb, isDatabaseConfigured } from '@/db';
import { leads, quizSubmissions } from '@/db/schema';
import type { Answers, QuizResult } from '@/lib/quiz/quiz';
import { LeadBody, utmFromPage } from '@/lib/leads/schema';
import { rateLimit } from '@/lib/rate-limit';
import { notifyNewLead } from '@/lib/notify';

/**
 * POST /api/leads — MIGRATION-PLAN §9.1.
 *
 * Never statically optimised: it writes.
 */
export const dynamic = 'force-dynamic';

/**
 * The client is behind Nginx, so the socket address is always the proxy.
 * x-real-ip is what the §4 Nginx config sets; x-forwarded-for is the fallback
 * and only its first hop is trusted (the rest is attacker-controlled).
 */
function clientIp(req: Request): string {
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return 'unknown';
}

export async function POST(req: Request) {
  if (!rateLimit(`leads:${clientIp(req)}`, { limit: 5, windowSec: 600 })) {
    return Response.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const parsed = LeadBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: 'invalid' }, { status: 400 });
  }

  const { honey, page, quiz, ...d } = parsed.data;
  // Bots fill the hidden field. Answer 200 so they learn nothing, and write
  // nothing — telling them they were blocked just tells them what to change.
  if (honey) return Response.json({ ok: true });

  // A misconfigured server must not swallow a lead silently. Returning 503
  // makes the client fall back to composing the email (§9.2), which is the
  // whole point of keeping that fallback alive.
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: 'unavailable' }, { status: 503 });
  }

  try {
    const db = getDb();
    const [row] = await db
      .insert(leads)
      .values({
        ...d,
        pageUrl: page,
        referrer: req.headers.get('referer'),
        utm: utmFromPage(page),
      })
      .returning({ id: leads.id });

    if (quiz) {
      await db.insert(quizSubmissions).values({
        leadId: row.id,
        answers: quiz.answers as Partial<Answers>,
        result: quiz.result as unknown as QuizResult,
        completed: quiz.completed ?? true,
      });
    }

    // Notification failures never fail the request — the lead is already saved.
    void notifyNewLead({
      id: row.id,
      email: d.email,
      name: d.name,
      company: d.company,
      phone: d.phone,
      message: d.message,
      source: d.source,
      pageUrl: page,
      quote: quiz?.result?.cost as string | undefined,
      answers: quiz?.answers,
    });

    return Response.json({ ok: true, id: row.id });
  } catch (err) {
    console.error('[leads] insert failed', err);
    // 5xx, so the client composes the email instead of losing the lead.
    return Response.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
