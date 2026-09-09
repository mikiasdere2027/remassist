'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { signIn } from '@/auth';
import { getDb, isDatabaseConfigured } from '@/db';
import { users } from '@/db/schema/auth';
import { assertUnverifiedUser, assertUser } from '@/lib/auth/require';
import { CODE_TTL_SEC } from '@/lib/auth/code';
import {
  PENDING_EMAIL_COOKIE, VERIFY_PENDING_COOKIE, verifyReturnPath,
} from '@/lib/auth/verify';
import { hashPassword, passwordProblem, verifyPassword } from '@/lib/auth/password';

/**
 * Own-account actions — MIGRATION-PLAN §10.
 *
 * Every one of these re-checks the session. A server action is a POST endpoint
 * with a generated name; it renders outside the layout tree, so the (protected)
 * gate never runs for it. Trusting the gate here would leave an unauthenticated
 * write against the users table.
 */

function back(param: 'ok' | 'error', code: string): never {
  redirect(`/admin/settings?${param}=${code}`);
}

export async function changePassword(formData: FormData): Promise<void> {
  const user = await assertUser();
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const current = String(formData.get('current') ?? '');
  const next = String(formData.get('next') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  const db = getDb();
  const [row] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  /**
   * A null hash means this account has only ever signed in with an emailed
   * code, so there is no current password to confirm and the field is skipped.
   *
   * That is not a hole worth closing: the person is already holding a valid
   * session, which is strictly more access than a password would give them. It
   * is also the only self-service route out of a code-only account, and the
   * alternative is a support request that ends in direct SQL.
   */
  if (row?.passwordHash && !(await verifyPassword(current, row.passwordHash))) {
    back('error', 'password-current');
  }

  if (next !== confirm) back('error', 'password-mismatch');
  if (passwordProblem(next)) back('error', 'password-weak');
  if (row?.passwordHash && (await verifyPassword(next, row.passwordHash))) {
    back('error', 'password-same');
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next) })
    .where(eq(users.id, user.id));

  /* Existing sessions are deliberately left alone. Auth.js has no bulk
     revocation and this is a nine-person admin where the common reason to
     change a password is routine hygiene, not compromise — signing everyone's
     other devices out on every rotation would train people not to rotate. */
  revalidatePath('/admin/settings');
  back('ok', 'password-changed');
}

/**
 * Send an activation code to the signed-in address.
 *
 * Reuses the ordinary emailed-code sign-in rather than inventing a second
 * token: when Auth.js redeems an email token for a user that already exists it
 * sets emailVerified on that row itself (handle-login.js), so the existing flow
 * already does the one thing this needs.
 *
 * assertUnverifiedUser rather than assertUser, and it has to be: an account
 * past its activation deadline is refused by every other action in the admin,
 * and this is the action that clears that. Behind the ordinary gate it would be
 * a lock with no key. See lib/auth/verify.ts.
 *
 * Called from two screens — the banner inside the grace window and the
 * activation screen after it — which differ only in where a failed send should
 * land. That comes from a hidden field, resolved through an allowlist rather
 * than used as given: this value reaches redirect(), and a posted path carried
 * into one of those is an open redirector.
 */
export async function sendVerificationEmail(formData?: FormData): Promise<void> {
  const user = await assertUnverifiedUser();
  const returnTo = verifyReturnPath(
    formData ? String(formData.get('returnTo') ?? '') : undefined,
  );

  const jar = await cookies();
  const isProd = process.env.NODE_ENV === 'production';
  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProd,
    path: '/',
    maxAge: CODE_TTL_SEC,
  };

  /* The code screen bounces anyone already signed in straight to /admin/leads,
     which is right for a sign-in and wrong here. This cookie tells it that a
     signed-in visitor is expected. It expires with the code it accompanies, so
     there is nothing to clean up. */
  jar.set(VERIFY_PENDING_COOKIE, '1', options);
  jar.set(PENDING_EMAIL_COOKIE, user.email, options);

  try {
    /* Throws a redirect to the verifyRequest page on success, which is how
       Auth.js signals it sent the mail. */
    await signIn('resend', { email: user.email, redirectTo: returnTo });
  } catch (err) {
    /* Only an AuthError is a real failure — the success path throws a redirect
       too, and swallowing that leaves the browser on a dead form post. */
    if (err instanceof AuthError) redirect(`${returnTo}?error=verify-failed`);
    throw err;
  }
}
