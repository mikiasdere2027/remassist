import { z } from 'zod';
import { getDb, isDatabaseConfigured } from '@/db';
import { quizSubmissions } from '@/db/schema';
import type { Answers, QuizResult } from '@/lib/quiz/quiz';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/quiz — anonymous funnel capture.
 *
 * §6.2 makes `quiz_submissions.lead_id` nullable on purpose: "the quiz is
 * answered *before* the email is requested, so a partial funnel still produces
 * an analysable row. Writing it only on email capture would discard the most
 * interesting drop-off data." This is the endpoint that writes those rows.
 *
 * It collects no personal data — answers and the quote shown, nothing that
 * identifies a visitor. When an email is captured later, POST /api/leads
 * carries the same quiz payload and links it to the lead.
 */
export const dynamic = 'force-dynamic';

const Body = z.object({
  answers: z.record(z.string(), z.string()),
  result: z.record(z.string(), z.unknown()),
  completed: z.boolean().optional(),
});

function clientIp(req: Request): string {
  return (
    req.headers.get('x-real-ip')?.trim() ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}

export async function POST(req: Request) {
  // Looser than the lead limit: finishing the quiz twice is ordinary
  // behaviour, and there is nothing here worth spamming.
  if (!rateLimit(`quiz:${clientIp(req)}`, { limit: 20, windowSec: 600 })) {
    return Response.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: 'invalid' }, { status: 400 });
  }

  // Analytics must never break the page: with no database the client simply
  // gets an ok and carries on showing the result.
  if (!isDatabaseConfigured()) return Response.json({ ok: true, stored: false });

  try {
    await getDb().insert(quizSubmissions).values({
      leadId: null,
      answers: parsed.data.answers as Partial<Answers>,
      result: parsed.data.result as unknown as QuizResult,
      completed: parsed.data.completed ?? true,
    });
    return Response.json({ ok: true, stored: true });
  } catch (err) {
    console.error('[quiz] insert failed', err);
    return Response.json({ ok: true, stored: false });
  }
}
