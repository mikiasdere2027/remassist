import { rateLimit } from '@/lib/rate-limit';

/**
 * Request guards shared by the /api/voice/* routes.
 *
 * Every one of them spends something real (Gemini minutes, a slot on a real
 * person's calendar), so they share one idea of who is calling and whether a
 * page on some other origin is driving them.
 */

/** Same trust rules as /api/leads: Nginx sets x-real-ip, and only XFF's first hop counts. */
export function clientIp(req: Request): string {
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return 'unknown';
}

/**
 * Browsers always send Origin on a cross-origin POST, so a foreign one is
 * somebody else's page spending our quota. A missing Origin is let through:
 * same-origin fetches from older browsers omit it, and curl can forge it anyway.
 */
export function foreignOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

/**
 * The origin check plus a per-IP rate limit, as one early return: a Response
 * when the request should be refused, null when it may proceed.
 */
export function guard(req: Request, bucket: string, limit: number, windowSec: number): Response | null {
  if (foreignOrigin(req)) {
    return Response.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  if (!rateLimit(`${bucket}:${clientIp(req)}`, { limit, windowSec })) {
    return Response.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }
  return null;
}
