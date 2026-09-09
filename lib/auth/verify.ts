/**
 * The activation deadline — MIGRATION-PLAN §10, phase 5.
 *
 * An account whose address has never been proved is an account nobody can
 * recover and nobody can reach. Phase 5 shipped that as a banner, which is a
 * request; this makes it a deadline: verify within a day of the row being
 * created, or the account is locked to one screen until it is verified.
 *
 * "Locked" here is not "signed out" and not "disabled". The session stays
 * valid, `authorise` still resolves the person, and the only thing that changes
 * is that every admin screen and every write refuses until the address is
 * proved — with the activation screen, which mails a code, left reachable. A
 * lock somebody cannot clear on their own is an outage, not a control.
 *
 * Pure and free of next-auth, next/headers and database imports, matching
 * allowlist.ts, roles.ts, invite.ts and session.ts, so the deadline arithmetic
 * is testable without a database or a clock.
 */

/**
 * A day, and the reason it is a day rather than the week the banner used.
 *
 * The week was chosen when email delivery in this deployment was the broken
 * thing being worked on, and a red banner on day two blamed the person for
 * something they could not fix. The deadline is now enforced, so the number has
 * to be one somebody can actually meet: an address that cannot receive mail
 * within a day of an account being made for it is not an address that account
 * should be trusted to recover through.
 */
export const VERIFY_GRACE_SEC = 24 * 60 * 60;

/** The columns the deadline reads. A subset of AdminUser, on purpose. */
export interface VerifiableUser {
  emailVerified: Date | null;
  createdAt: Date;
}

/**
 * - `verified` — the address has been proved.
 * - `pending`  — not yet, and still inside the grace window.
 * - `locked`   — not yet, and out of time.
 */
export type VerifyState = 'verified' | 'pending' | 'locked';

/**
 * Measured from `createdAt`, not from a column of its own.
 *
 * There is nothing to store: the clock starts when the row exists, and an
 * account has exactly one creation. A separate `verifyDeadline` column would be
 * a second source of truth for a value derivable from the first, and the
 * failure mode of those two disagreeing is somebody locked out a day early.
 */
export function verifyDeadline(createdAt: Date): Date {
  return new Date(createdAt.getTime() + VERIFY_GRACE_SEC * 1000);
}

export function verifyState(user: VerifiableUser, now: Date = new Date()): VerifyState {
  if (user.emailVerified) return 'verified';
  return now.getTime() >= verifyDeadline(user.createdAt).getTime() ? 'locked' : 'pending';
}

/** The one question the gates ask. */
export function isLockedForVerification(user: VerifiableUser, now: Date = new Date()): boolean {
  return verifyState(user, now) === 'locked';
}

/**
 * Whole hours left, rounded UP, floored at zero.
 *
 * Rounded up so the banner never says "0 hours left" on an account that is
 * still working — a countdown that reaches zero before the thing it counts down
 * to has happened reads as a bug, and teaches people to disbelieve the next
 * one. Zero is reserved for accounts that really are out of time.
 */
export function hoursToVerify(user: VerifiableUser, now: Date = new Date()): number {
  const ms = verifyDeadline(user.createdAt).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 3_600_000);
}

/**
 * Set alongside an activation code so the code screen knows to expect a visitor
 * who is already signed in, and so auth.ts knows to word the mail as an
 * activation rather than a sign-in.
 *
 * Here rather than beside any one of its four readers because it is now read in
 * four places — the action that sets it, the code screen, the redemption shim
 * and the mail renderer — and a cookie name that disagrees between the writer
 * and a reader fails silently: the code still works, the page just claims the
 * wrong thing and the mail gives the wrong instruction.
 */
export const VERIFY_PENDING_COOKIE = 'admin-verify-pending';

/** Set when a code is requested, so nobody types their address twice. */
export const PENDING_EMAIL_COOKIE = 'admin-signin-email';

/**
 * Where the activation action may send somebody when the mail fails.
 *
 * An allowlist rather than a path taken from the form, because that path lands
 * in a `redirect()`: a form field carried into one of those is an open
 * redirector, and this form is posted by an account that is by definition not
 * yet proved to belong to the person using it.
 */
export const VERIFY_RETURN = {
  settings: '/admin/settings',
  verify: '/admin/verify',
} as const;

export type VerifyReturn = keyof typeof VERIFY_RETURN;

export function verifyReturnPath(key: string | undefined): string {
  return key && key in VERIFY_RETURN
    ? VERIFY_RETURN[key as VerifyReturn]
    : VERIFY_RETURN.settings;
}
