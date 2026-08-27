import { beforeEach, describe, expect, it } from 'vitest';
import { POST as leadsPOST } from '@/app/api/leads/route';
import { POST as quizPOST } from '@/app/api/quiz/route';
import { resetRateLimits } from '@/lib/rate-limit';

/**
 * Route-level tests for the capture endpoints — MIGRATION-PLAN §13.2.
 *
 * lib/leads/schema.test.ts covers the parser and lib/rate-limit.test.ts covers
 * the limiter; this covers the handler that wires them together, which is where
 * a regression would actually reach a visitor.
 *
 * Everything here runs without a database. The one case that needs one — a
 * successful insert — is deliberately absent rather than mocked into looking
 * like it passed; see the note at the bottom.
 *
 * These live in lib/ because vitest only collects `lib/ ** /*.test.ts`, and a
 * *.test.ts under app/ would be swept into Next's file tracing.
 */
function post(body: unknown, headers: Record<string, string> = {}, url = 'http://localhost/api/leads') {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const ip = (v: string) => ({ 'x-real-ip': v });
const valid = { email: 'a@b.com', source: 'contact_form' as const };

beforeEach(() => {
  resetRateLimits();
  delete process.env.DATABASE_URL;
});

describe('POST /api/leads', () => {
  it('rejects an invalid payload with 400', async () => {
    const res = await leadsPOST(post({ email: 'not-an-email', source: 'contact_form' }, ip('1.1.1.1')));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects an unknown source rather than storing it', async () => {
    const res = await leadsPOST(post({ ...valid, source: 'facebook_ad' }, ip('1.1.1.2')));
    expect(res.status).toBe(400);
  });

  it('survives a malformed body instead of throwing a 500', async () => {
    const res = await leadsPOST(post('not json at all', ip('1.1.1.3')));
    expect(res.status).toBe(400);
  });

  it('answers 200 to a filled honeypot and writes nothing', async () => {
    // 200 so the bot learns nothing. It must not reach the database branch —
    // with no DATABASE_URL a write attempt would surface as 503, so 200 here
    // is also proof the request was dropped before that point.
    const res = await leadsPOST(post({ ...valid, honey: 'http://spam' }, ip('1.1.1.4')));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('answers 503 when the database is not configured, so the client falls back to email', async () => {
    // §9.2: the mailto fallback fires on a non-ok response. A 200 here would
    // silently swallow the lead — the exact failure the fallback exists for.
    const res = await leadsPOST(post(valid, ip('1.1.1.5')));
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'unavailable' });
  });

  it('trips the rate limit on the sixth request from one address', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await leadsPOST(post(valid, ip('9.9.9.9')))).status, `request ${i + 1}`).toBe(503);
    }
    const res = await leadsPOST(post(valid, ip('9.9.9.9')));
    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'rate_limited' });
  });

  it('rate limits per address, so one visitor cannot lock out another', async () => {
    for (let i = 0; i < 6; i++) await leadsPOST(post(valid, ip('9.9.9.8')));
    expect((await leadsPOST(post(valid, ip('9.9.9.8')))).status).toBe(429);
    expect((await leadsPOST(post(valid, ip('9.9.9.7')))).status).toBe(503);
  });

  it('reads only the first hop of x-forwarded-for', async () => {
    // Everything after the first entry is attacker-supplied. If the handler
    // used the whole header, or the last hop, a bot could rotate the value and
    // bypass the limit entirely.
    const spoofed = { 'x-forwarded-for': '7.7.7.7, 6.6.6.6, 5.5.5.5' };
    for (let i = 0; i < 5; i++) await leadsPOST(post(valid, spoofed));
    expect((await leadsPOST(post(valid, spoofed))).status).toBe(429);
    // same first hop, different tail — must still be the same bucket
    const rotated = { 'x-forwarded-for': '7.7.7.7, 1.2.3.4' };
    expect((await leadsPOST(post(valid, rotated))).status).toBe(429);
  });

  it('prefers x-real-ip over x-forwarded-for', async () => {
    const headers = { 'x-real-ip': '4.4.4.4', 'x-forwarded-for': '8.8.8.8' };
    for (let i = 0; i < 6; i++) await leadsPOST(post(valid, headers));
    expect((await leadsPOST(post(valid, headers))).status).toBe(429);
    // the forwarded-for address was never the key, so it is still unused
    expect((await leadsPOST(post(valid, ip('8.8.8.8')))).status).toBe(503);
  });
});

describe('POST /api/quiz', () => {
  const quizUrl = 'http://localhost/api/quiz';
  const body = { answers: { gap: 'back' }, result: { cost: '$1,280+' } };

  it('rejects an invalid payload with 400', async () => {
    const res = await quizPOST(post({ answers: 'nope' }, ip('2.2.2.1'), quizUrl));
    expect(res.status).toBe(400);
  });

  it('accepts without a database and reports that nothing was stored', async () => {
    // Analytics must never break the result screen, so this is 200 even with
    // no database — but `stored` has to tell the truth.
    const res = await quizPOST(post(body, ip('2.2.2.2'), quizUrl));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, stored: false });
  });

  it('allows more submissions than the lead endpoint before limiting', async () => {
    // Finishing the quiz twice is ordinary behaviour; five would be too few.
    for (let i = 0; i < 20; i++) {
      expect((await quizPOST(post(body, ip('2.2.2.3'), quizUrl))).status, `submission ${i + 1}`).toBe(200);
    }
    expect((await quizPOST(post(body, ip('2.2.2.3'), quizUrl))).status).toBe(429);
  });

  it('keys its limit separately from the lead endpoint', async () => {
    for (let i = 0; i < 6; i++) await leadsPOST(post(valid, ip('3.3.3.3')));
    expect((await leadsPOST(post(valid, ip('3.3.3.3')))).status).toBe(429);
    // the quiz bucket for the same address is untouched
    expect((await quizPOST(post(body, ip('3.3.3.3'), quizUrl))).status).toBe(200);
  });
});

/**
 * NOT COVERED, on purpose: a successful insert, and §13.2's seed-idempotency
 * check. Both need a live Postgres. Mocking the Drizzle chain would assert that
 * the mock was called, not that a row lands — and a green test saying "insert
 * works" when nothing has ever written to a database is worse than no test.
 * Add them once DATABASE_URL exists in CI.
 */
