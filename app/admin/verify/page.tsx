import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { signOut } from '@/auth';
import { currentUser } from '@/lib/auth/require';
import { REMEMBER_COOKIE } from '@/lib/auth/remember';
import { CODE_LENGTH } from '@/lib/auth/code';
import { verifyDeadline, verifyState } from '@/lib/auth/verify';
import { sendVerificationEmail } from '../(protected)/settings/actions';
import { formatDate } from '@/lib/leads/display';
import { verifyMessage } from './messages';
import styles from '../admin.module.css';

/**
 * The activation screen — MIGRATION-PLAN §10, phase 5.
 *
 * Where requireUser sends an account that never proved its address inside the
 * day it had. Deliberately OUTSIDE (protected): the gate in that layout is the
 * thing that redirects here, so a screen for locked accounts placed under it
 * would redirect to itself forever — the same trap as putting the gate in
 * app/admin/layout.tsx and sending /admin/signin to itself.
 *
 * It is a locked screen, not a sign-out. The session is valid and the row is
 * fine; the person is one emailed code away from working again, and this screen
 * is what makes that a thing they can do rather than a support request. Signing
 * out is still offered, because somebody who signed in as the wrong account
 * needs a way back that is not the browser's cookie settings.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Activate your account',
  robots: { index: false, follow: false },
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [user, sp] = await Promise.all([currentUser(), searchParams]);

  /* No session at all is a sign-in, not an activation. */
  if (!user) redirect('/admin/signin');

  /**
   * Anyone not actually locked is sent on, and both cases are real: a verified
   * account reaching this URL has nothing to do here, and an account still
   * inside its grace window belongs in the admin with the banner — being shown
   * a lock screen a day early is indistinguishable from a broken deadline.
   */
  if (verifyState(user) !== 'locked') redirect('/admin/leads');

  const error = verifyMessage(sp.error);

  return (
    <div className={styles.signinWrap}>
      <div className={styles.signinCard}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.signinLogo} src="/images/rem-logo.svg" alt="Rem Assist" />
        <h1 className={styles.signinTitle}>Activate your account</h1>
        <p className={styles.signinLede}>
          This account was created for <strong>{user.email}</strong> on{' '}
          {formatDate(user.createdAt)} and that address was never confirmed. The day it
          had to be confirmed in ran out on {formatDate(verifyDeadline(user.createdAt))},
          so the admin stays locked until it is.
        </p>

        {error && (
          <p className={`${styles.signinMsg} ${styles.msgErr}`} role="alert">
            {error}
          </p>
        )}

        <p className={styles.signinLede}>
          We will email a {CODE_LENGTH}-digit code to that address. Typing it back proves the
          address can receive mail, which is the only thing standing between a lost
          password and a support request — and it unlocks the account immediately.
        </p>

        <form className={styles.signinForm} action={sendVerificationEmail}>
          {/* Where a failed send should land. Resolved through an allowlist in
              lib/auth/verify.ts, never used as a path as posted. */}
          <input type="hidden" name="returnTo" value="verify" />
          <button className={styles.signinBtn} type="submit">
            Email me an activation code
          </button>
        </form>

        <div className={styles.signinFoot}>
          <form
            action={async () => {
              'use server';
              /* Same as the admin layout's: a remember flag left behind would
                 hand the next person to sign in on this browser a 30-day
                 session they never asked for. */
              (await cookies()).delete(REMEMBER_COOKIE);
              await signOut({ redirectTo: '/admin/signin' });
            }}
          >
            <button className={styles.linkBtn} type="submit">
              Sign in as somebody else
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
