import { createHash, randomBytes } from 'node:crypto';
import { CODE_TTL_SEC } from './code';

/**
 * Invitation tokens — MIGRATION-PLAN §10.
 *
 * An invitation is the only way a second account comes into existence, so the
 * token in the emailed link is a credential that creates an account. It is
 * stored hashed, it expires, and it is single-use.
 *
 * That first sentence was aspirational until 2026-09-09 and is now enforced.
 * Auth.js creates a user for any address it does not recognise when an emailed
 * code is redeemed, so anybody with a mailbox on an allowed domain could skip
 * all of this and mint themselves a manager account by asking for a code. The
 * account requirement in auth.ts's signIn callback is what makes this module
 * the only door.
 *
 * Pure and free of next-auth, next/headers and database imports, matching
 * allowlist.ts and roles.ts, so all of it is unit-testable without a database.
 */

/** A week. Long enough to survive a holiday, short enough to expire. */
export const INVITE_TTL_SEC = 7 * 24 * 60 * 60;

/** The second factor's lifetime — the same fifteen minutes as a sign-in code. */
export const INVITE_CODE_TTL_SEC = CODE_TTL_SEC;

/** 32 bytes, base64url so it survives a URL path segment without escaping. */
export function generateInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * SHA-256, and deliberately not scrypt.
 *
 * A slow hash buys nothing against 256 bits of entropy — there is no candidate
 * list to work through, so the only attack is a preimage, which SHA-256 does
 * not have. Unsalted for the same reason, and because it must be: redemption
 * looks the row up *by* this value, which a per-row salt would make impossible.
 *
 * The 6-digit code below is the opposite case and gets scrypt — see codeHash in
 * db/schema/auth.ts.
 */
export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** 32 base64url bytes is always 43 characters, with no padding. */
export function isWellFormedInviteToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function inviteExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITE_TTL_SEC * 1000);
}

export function inviteCodeExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITE_CODE_TTL_SEC * 1000);
}

export function invitePath(token: string): string {
  return `/admin/invite/${token}`;
}

/**
 * Why an invitation cannot be used, or null when it can.
 *
 * Separated from the query so the reasons are testable without a database, and
 * so the page has one value to switch on rather than three conditions it could
 * get subtly wrong — a redeemed invitation that is also expired must report as
 * redeemed, because "expired" invites the person to ask for a new one.
 */
export type InviteRefusal = 'accepted' | 'expired';

export function inviteRefusal(
  row: { acceptedAt: Date | null; expiresAt: Date },
  now: Date = new Date(),
): InviteRefusal | null {
  if (row.acceptedAt) return 'accepted';
  if (row.expiresAt.getTime() <= now.getTime()) return 'expired';
  return null;
}

/** Whether a code has been issued for this invitation and is still live. */
export function hasLiveCode(
  row: { codeHash: string | null; codeExpiresAt: Date | null },
  now: Date = new Date(),
): boolean {
  return Boolean(row.codeHash && row.codeExpiresAt && row.codeExpiresAt.getTime() > now.getTime());
}
