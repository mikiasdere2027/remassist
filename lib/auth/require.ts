import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isDatabaseConfigured } from '@/db';
import { findUserByEmail } from '@/lib/auth/lookup';
import { authorise, type AdminUser } from '@/lib/auth/session';
import { type Role } from '@/lib/auth/roles';
import { isLockedForVerification } from '@/lib/auth/verify';

/**
 * The one place authorisation is decided — MIGRATION-PLAN §10.
 *
 * Before this existed the same rule was copied into the layout, two route
 * handlers and a server action. Adding a second rule to each of those is how
 * authorisation bugs get written, so every gate calls in here rather than
 * reimplementing.
 *
 * This module is the plumbing: read the session, read the row, hand both to
 * authorise(). The rules themselves live in session.ts, which imports no
 * next-auth and is therefore testable — see the note at the top of that file.
 *
 * The user row is loaded on every call rather than trusted from the session.
 * That is what makes disabling someone take effect on their next request
 * instead of at their next sign-in.
 */

export type { AdminUser } from '@/lib/auth/session';

/** The signed-in user, or null. */
export async function currentUser(): Promise<AdminUser | null> {
  /* No database means no row to read, and authorise() denies without one. The
     early return is only about not calling getDb(); the decision is identical,
     which is why the fail-closed rule is not restated here. */
  if (!isDatabaseConfigured()) return authorise(null, undefined);

  const session = await auth();
  const email = session?.user?.email;
  if (!email) return authorise(null, undefined);

  return authorise(email, await findUserByEmail(email));
}

/**
 * For pages and layouts: the user, or a redirect.
 *
 * Two different redirects, and the difference matters. No session goes to
 * sign-in. A session whose address was never proved within the day it had goes
 * to the activation screen instead — signing them out would be wrong twice
 * over: they hold a valid session, and the screen that clears the lock is the
 * one place they still need to reach. See lib/auth/verify.ts.
 */
export async function requireUser(): Promise<AdminUser> {
  const user = await currentUser();
  if (!user) redirect('/admin/signin');
  if (isLockedForVerification(user)) redirect('/admin/verify');
  return user;
}

/** For pages: the user if they hold the role, or a redirect. */
export async function requireRole(role: Role): Promise<AdminUser> {
  const user = await requireUser();
  if (user.role !== role) redirect('/admin/leads');
  return user;
}

/**
 * For server actions and route handlers, which render outside the layout tree
 * and are therefore not covered by its gate. Throws rather than redirects — a
 * redirect from a POST action is not a refusal the caller can act on.
 */
export async function assertRole(role: Role): Promise<AdminUser> {
  const user = await assertUser();
  if (user.role !== role) throw new Error('forbidden');
  return user;
}

/**
 * For actions any signed-in user may perform.
 *
 * The activation lock is enforced here and not only in requireUser, and that
 * is the whole point of it being in two places: a server action is a POST
 * endpoint with a generated name that renders outside the layout tree, so a
 * lock applied only at the page would stop a locked account seeing the admin
 * while leaving it able to write to it.
 */
export async function assertUser(): Promise<AdminUser> {
  const user = await assertUnverifiedUser();
  if (isLockedForVerification(user)) throw new Error('unverified');
  return user;
}

/**
 * The one exception: actions the activation screen itself needs.
 *
 * Sending an activation code is the action that clears the lock, so it cannot
 * be behind it. Nothing else may use this — it authorises a session whose
 * address has never been proved, which is exactly what everything above
 * refuses.
 */
export async function assertUnverifiedUser(): Promise<AdminUser> {
  const user = await currentUser();
  if (!user) throw new Error('unauthorised');
  return user;
}
