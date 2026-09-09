import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { auth, signIn } from '@/auth';
import { isAllowedEmail } from '@/lib/auth/allowlist';
import { CODE_TTL_SEC } from '@/lib/auth/code';
import { REMEMBER_COOKIE, rememberCookieOptions } from '@/lib/auth/remember';
import styles from '../admin.module.css';

/**
 * Admin sign-in — MIGRATION-PLAN §10.
 *
 * Two ways in, one form: a password, or a 6-digit code emailed on request. The
 * code path stays because a forgotten password would otherwise need direct
 * database access to fix, and because it is the only way in at all while email
 * delivery is still being sorted out.
 *
 * Neither way in registers anybody. An account has to exist first, created by
 * the admin's invitation — enforced in auth.ts's signIn callback, which until
 * 2026-09-09 let a redeemed code create the user it could not find.
 *
 * Lives under /admin but outside (protected), so a signed-out visitor can
 * actually reach it. robots.txt disallows /admin, which covers this too.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin sign-in',
  robots: { index: false, follow: false },
};

/** Lets the code screen prefill the address instead of asking for it twice. */
const PENDING_EMAIL_COOKIE = 'admin-signin-email';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  /* Already signed in — no reason to show the form. The (protected) layout
     does the real authorisation; this only avoids a pointless round trip. */
  const session = await auth();
  if (session?.user?.email) redirect('/admin/leads');

  async function submit(formData: FormData) {
    'use server';

    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const password = String(formData.get('password') ?? '');
    const wantsCode = formData.get('intent') === 'code';
    const remember = formData.get('remember') === 'yes';

    /* Cheap first gate. The user row is authoritative, but there is no reason
       to touch the database or the mail provider for an address that is not
       even on a company domain. */
    if (!isAllowedEmail(email)) redirect('/admin/signin?error=1');

    /* Written before either sign-in path, because the session row is created
       during that request and auth.ts reads this cookie to size it. */
    const jar = await cookies();
    const isProd = process.env.NODE_ENV === 'production';
    jar.set(REMEMBER_COOKIE, remember ? '1' : '0', rememberCookieOptions(remember, isProd));

    if (wantsCode) {
      jar.set(PENDING_EMAIL_COOKIE, email, {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        path: '/',
        maxAge: CODE_TTL_SEC,
      });
      try {
        await signIn('resend', { email, redirectTo: '/admin/leads' });
      } catch (err) {
        /**
         * The send can fail for a reason that is nobody's fault but ours: no
         * AUTH_RESEND_KEY, or an unverified sending domain. Left unhandled it
         * escaped the server action as a 500, which is the worst possible
         * answer here — it is also the state a freshly provisioned box is in,
         * so the very first thing anyone clicked on production was a crash.
         *
         * Reported separately from a credential failure, and that is not an
         * enumeration leak: a missing key fails identically for every address,
         * known or not. It is worth distinguishing because it tells the person
         * the true thing — mail is broken, use your password.
         */
        /**
         * AccessDenied is not a mail failure, and telling somebody it is would
         * be the wrong answer twice: it fires when the signIn callback refuses
         * the address — off the company domain, or no account here — and it
         * fires BEFORE anything is sent. Reporting "email is not configured"
         * would send an outsider looking for an administrator to fix a server
         * that is working exactly as intended, and would tell them the address
         * itself was fine. It gets the generic credential message instead.
         */
        if (err instanceof AuthError) {
          redirect(err.type === 'AccessDenied'
            ? '/admin/signin?error=1'
            : '/admin/signin?error=mail');
        }
        throw err;
      }
      return;
    }

    if (!password) redirect('/admin/signin?error=1');

    try {
      await signIn('password', { email, password, redirectTo: '/admin/leads' });
    } catch (err) {
      /* signIn signals success by throwing a redirect, so only an AuthError is
         an actual failure. Anything else must be rethrown or the redirect is
         swallowed and the browser sits on a dead form post. */
      if (err instanceof AuthError) redirect('/admin/signin?error=1');
      throw err;
    }
  }

  return (
    <div className={styles.signinWrap}>
      <div className={styles.signinCard}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.signinLogo} src="/images/rem-logo.svg" alt="Rem Assist" />
        <h1 className={styles.signinTitle}>Admin sign-in</h1>

        {error === 'mail' ? (
          <p className={`${styles.signinMsg} ${styles.msgErr}`} role="alert">
            We could not send the code — email is not configured on this server.
            Sign in with your password instead, or ask an administrator to check
            the mail settings.
          </p>
        ) : error ? (
          <p className={`${styles.signinMsg} ${styles.msgErr}`} role="alert">
            {/* One message for every credential failure — wrong password,
                unknown address, disabled account, locked out. Saying which
                would confirm to a stranger that an address has an account
                here. The mail branch above is exempt because it fails the same
                way for every address and so discloses nothing. */}
            That did not work. Check the address and password, or ask an
            administrator whether your account has access.
          </p>
        ) : null}

        <form className={styles.signinForm} action={submit}>
          <label className={styles.fieldLabel} htmlFor="admin-email">Work email</label>
          <input
            className={styles.signinInput}
            id="admin-email"
            name="email"
            type="email"
            placeholder="you@remassistance.com"
            autoComplete="email"
            required
            autoFocus
          />

          <label className={styles.fieldLabel} htmlFor="admin-password">Password</label>
          {/* Not `required`: the same form also requests an emailed code, and a
              required field would block that button. Checked server-side. */}
          <input
            className={styles.signinInput}
            id="admin-password"
            name="password"
            type="password"
            placeholder="Your password"
            autoComplete="current-password"
          />

          <label className={styles.checkRow} htmlFor="admin-remember">
            <input id="admin-remember" name="remember" type="checkbox" value="yes" />
            <span>Keep me signed in</span>
          </label>

          <button className={styles.signinBtn} type="submit" name="intent" value="password">
            Sign in
          </button>
          <button className={styles.signinAlt} type="submit" name="intent" value="code">
            Email me a one-time code instead
          </button>
        </form>

        <p className={styles.signinFoot}>
          <Link href="/admin/signin/code">I already have a code</Link>
        </p>
      </div>
    </div>
  );
}
