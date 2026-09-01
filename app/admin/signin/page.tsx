import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';
import { isAllowedEmail } from '@/lib/auth/allowlist';
import styles from '../admin.module.css';

/**
 * Admin sign-in — MIGRATION-PLAN §10.
 *
 * Lives under /admin but outside (protected), so a signed-out visitor can
 * actually reach it. robots.txt disallows /admin, which covers this too.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin sign-in',
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  /* Already signed in and allowed — no reason to show a sign-in form. */
  const session = await auth();
  if (isAllowedEmail(session?.user?.email)) redirect('/admin/leads');

  return (
    <div className={styles.signinWrap}>
      <div className={styles.signinCard}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.signinLogo} src="/images/rem-logo.svg" alt="Rem Assist" />
        <h1 className={styles.signinTitle}>Admin sign-in</h1>
        <p className={styles.signinLede}>
          Sign in with your work address. We email you a link — there is no password to remember
          or to leak.
        </p>

        {sent && (
          <p className={`${styles.signinMsg} ${styles.msgOk}`} role="status">
            Check your inbox. The link works once and expires in 24 hours.
          </p>
        )}
        {error && (
          <p className={`${styles.signinMsg} ${styles.msgErr}`} role="alert">
            {/* Deliberately vague about *why*. Saying "that domain is not
                allowed" would confirm to a stranger which addresses exist and
                which domains we trust. */}
            That did not work. Check the address and try again, or ask an
            administrator whether your account has access.
          </p>
        )}

        <form
          className={styles.signinForm}
          action={async (formData: FormData) => {
            'use server';
            const email = String(formData.get('email') ?? '').trim();
            /* Checked again inside auth.ts's signIn callback — this copy just
               avoids a pointless round trip to the mail provider. */
            if (!isAllowedEmail(email)) redirect('/admin/signin?error=1');
            await signIn('resend', { email, redirectTo: '/admin/leads' });
          }}
        >
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
          <button className={styles.signinBtn} type="submit">Email me a sign-in link</button>
        </form>
      </div>
    </div>
  );
}
