import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { isApiError } from '@/lib/api/errors';
import { apiServer } from '@/lib/api/server';
import type { AdminUser } from '@/lib/api/types';
import type { Role } from '@/lib/auth/roles';

/**
 * Who is signed in — decided by the backend.
 *
 * Sign-in, sessions, roles and disabling live in remassist-backend. This module
 * asks it (GET /v1/admin/auth/me with the visitor's cookie) and keeps the same
 * helpers every admin page and action already calls, so pages that still read
 * the old database keep working until their slice is rewired.
 *
 * `currentUser` is memoised per request (React `cache`), so a layout and a
 * page asking in the same render cost one API call.
 */

export type { AdminUser } from '@/lib/api/types';

/** The signed-in user, or null. Backend unreachable → throws (error page). */
export const currentUser = cache(async (): Promise<AdminUser | null> => {
  try {
    const { user } = await apiServer<{ user: AdminUser }>('/admin/auth/me');
    return user;
  } catch (err) {
    if (isApiError(err, 401)) return null;
    throw err;
  }
});

/** For pages and layouts: the user, or a redirect to sign-in. */
export async function requireUser(): Promise<AdminUser> {
  const user = await currentUser();
  if (!user) redirect('/admin/signin');
  return user;
}

/** For pages: the user if they hold the role, or back to the dashboard. */
export async function requireRole(role: Role): Promise<AdminUser> {
  const user = await requireUser();
  if (user.role !== role) redirect('/admin');
  return user;
}

/**
 * For server actions and route handlers, which render outside the layout tree.
 * Throws rather than redirects — a redirect from a POST action is not a refusal
 * the caller can act on. (The backend enforces the same rules on every call;
 * these are for the old database-backed actions until they move to the API.)
 */
export async function assertUser(): Promise<AdminUser> {
  const user = await currentUser();
  if (!user) throw new Error('unauthorised');
  return user;
}

export async function assertRole(role: Role): Promise<AdminUser> {
  const user = await assertUser();
  if (user.role !== role) throw new Error('forbidden');
  return user;
}
