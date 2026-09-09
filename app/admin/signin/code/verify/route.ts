import { cookies } from 'next/headers';
import { isAllowedEmail } from '@/lib/auth/allowlist';
import { isWellFormedCode, normaliseCode } from '@/lib/auth/code';
import { PENDING_EMAIL_COOKIE, VERIFY_PENDING_COOKIE } from '@/lib/auth/verify';

/**
 * Hand a typed code to the Auth.js callback — MIGRATION-PLAN §10.
 *
 * A thin shim rather than pointing the form straight at the callback, because
 * two things have to happen first: the code needs normalising (people paste
 * "483 920", and phone keyboards add trailing spaces), and the address usually
 * comes from the cookie set when the code was requested rather than from a
 * field the person fills in twice.
 *
 * Everything after that is the ordinary link flow. The token is the same token,
 * the callback is the same callback, and the lockout in auth.ts's wrapped
 * adapter counts these attempts exactly as it counts a mangled link.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();

  const email = (
    url.searchParams.get('email') ?? jar.get(PENDING_EMAIL_COOKIE)?.value ?? ''
  ).trim();
  const code = normaliseCode(url.searchParams.get('code') ?? '');

  /* Bounce anything malformed without touching the callback. This is not a
     security control — the callback enforces the real thing — it just avoids
     spending one of the five lockout attempts on an obvious typo. */
  if (!isAllowedEmail(email) || !isWellFormedCode(code)) {
    return Response.redirect(new URL('/admin/signin/code?error=1', url), 303);
  }

  const callback = new URL('/api/auth/callback/resend', url);
  callback.searchParams.set('token', code);
  callback.searchParams.set('email', email);
  /* A verification started from the settings screen belongs back there; an
     ordinary sign-in belongs at the leads list. */
  const verifying = jar.get(VERIFY_PENDING_COOKIE)?.value === '1';
  callback.searchParams.set('callbackUrl', verifying ? '/admin/settings' : '/admin/leads');

  /* 303 so the browser follows with GET, which is what the callback expects. */
  return Response.redirect(callback, 303);
}
