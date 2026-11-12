import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/require';
import { CODE_LENGTH, CODE_TTL_SEC } from '@/lib/auth/code';
import { PENDING_EMAIL_COOKIE, VERIFY_PENDING_COOKIE } from '@/lib/auth/verify';
import styles from '../../admin.module.css';

/**
 * Type the emailed code — MIGRATION-PLAN §10.
 *
 * The alternative to clicking the link, and not merely a convenience: corporate
 * mail scanners follow links to check them, and because the token is single-use
 * a scanner that follows it consumes it. That is the usual cause of "the link
 * says it already expired". A typed code cannot be spent by a scanner.
 *
 * Redemption is a plain GET on the Auth.js callback, so this form does not need
 * a server action of its own — it hands the code straight to the endpoint the
 * link would have hit.
 */
export const dynamic = 'force-dynamic';

/**
 * Title varies with the cookie for the same reason the heading does: this one
 * screen serves both an ordinary sign-in and a verification started from
 * settings, and a tab reading "Enter your sign-in code" while the page says
 * "Verify your email" is the sort of small contradiction that makes people
 * think they clicked the wrong thing. The page is already force-dynamic, so
 * reading a cookie here costs nothing.
 */
export async function generateMetadata() {
  const verifying = (await cookies()).get(VERIFY_PENDING_COOKIE)?.value === '1';
  return {
    title: verifying ? 'Verify your email' : 'Enter your sign-in code',
    robots: { index: false, follow: false },
  };
}

const MINUTES = Math.round(CODE_TTL_SEC / 60);

export default async function SignInCodePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const jar = await cookies();

  /**
   * Set by the settings screen alongside a verification email. Without it a
   * signed-in visitor is bounced to /admin/leads, which is right for a sign-in
   * and wrong for somebody who has just asked to verify the address they are
   * already signed in with.
   */
  const verifying = jar.get(VERIFY_PENDING_COOKIE)?.value === '1';

  /* The same decision the gate makes, for the same reason as /admin/signin:
     a session this allowlist admits but the user row does not is a bounce to
     a page that bounces straight back. */
  const user = await currentUser();
  if (!verifying && user) redirect('/admin/leads');

  /* Set when the code was requested, so nobody types their address twice. */
  const pending = jar.get(PENDING_EMAIL_COOKIE)?.value ?? '';

  return (
    <div className={styles.signinWrap}>
      <div className={styles.signinCard}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.signinLogo} src="/images/rem-logo.svg" alt="Rem Assist" />
        <h1 className={styles.signinTitle}>
          {verifying ? 'Verify your email' : 'Enter your code'}
        </h1>
        <p className={styles.signinLede}>
          {pending
            ? <>We emailed a {CODE_LENGTH}-digit code to <strong>{pending}</strong>. It expires in {MINUTES} minutes.</>
            : <>Type the {CODE_LENGTH}-digit code from your sign-in email.</>}
        </p>

        {error && (
          <p className={`${styles.signinMsg} ${styles.msgErr}`} role="alert">
            {/* One message for a wrong code, an expired code, a spent code and
                a locked-out address alike. Distinguishing them would tell an
                attacker which guesses were close and when to back off. */}
            That code did not work. It may have expired or already been used —
            request a new one.
          </p>
        )}

        <form className={styles.signinForm} action="/admin/signin/code/verify" method="get">
          {!pending && (
            <div className={styles.signinField}>
              <label className={styles.signinLabel} htmlFor="code-email">Work email</label>
              <input
                className={styles.signinInput}
                id="code-email"
                name="email"
                type="email"
                placeholder="you@remassistance.com"
                autoComplete="email"
                required
              />
            </div>
          )}

          <div className={styles.signinField}>
            <label className={styles.signinLabel} htmlFor="code-token">
                {verifying ? 'Verification code' : 'Sign-in code'}
              </label>
            <input
              className={`${styles.signinInput} ${styles.codeInput}`}
              id="code-token"
              name="code"
              type="text"
              /* numeric keypad on phones, and lets the OS offer the code straight
                 from the message notification */
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern={`[0-9 ]{${CODE_LENGTH},}`}
              maxLength={CODE_LENGTH + 6}
              placeholder="000000"
              required
              autoFocus
            />
          </div>

          <button className={styles.signinBtn} type="submit">
            {verifying ? 'Verify' : 'Sign in'}
          </button>
        </form>

        <p className={styles.signinFoot}>
          <Link href="/admin/signin">Send a new code</Link>
        </p>
      </div>
    </div>
  );
}
