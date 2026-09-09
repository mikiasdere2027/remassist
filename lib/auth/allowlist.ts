/**
 * Who may reach /admin — MIGRATION-PLAN §10.
 *
 * Kept in its own module, free of next-auth imports, so the rule can be
 * unit-tested without booting an auth runtime. This is one of two things
 * standing between the public internet and every lead in the database, so it is
 * worth testing directly rather than inferring from a redirect.
 *
 * The other is the account requirement in auth.ts's signIn callback, and the
 * division of labour matters: this says which addresses may hold an account,
 * that says an account must already exist. Neither is sufficient alone. On its
 * own, this one admitted anybody with a company mailbox — Auth.js creates a
 * user for an unrecognised address when an emailed code is redeemed, so the
 * domain check was the whole of registration.
 */

/**
 * One domain, narrowed from two on 2026-09-09.
 *
 * @remconnect.io was dropped: it is a separate business on a shared box (see
 * deploy/README.md) whose staff have no reason to reach this admin, and every
 * address on it was a standing invitation to self-register. Existing
 * @remconnect.io rows are left in the users table — nothing here deletes — and
 * are simply refused from now on.
 *
 * Note this is NOT the sending domain. Mail goes out from a subdomain verified
 * in Resend (see AUTH_EMAIL_FROM), which is a different decision for different
 * reasons; changing one does not imply changing the other.
 */
export const ALLOWED_DOMAINS = ['@remassistance.com'] as const;

/**
 * An allowlist that matches on a bare suffix is a hole: `@remassistance.com`
 * also ends `evil-remassistance.com`, and an attacker who controls that domain
 * gets in. Match on the address's actual domain part instead.
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const at = email.lastIndexOf('@');
  if (at < 1) return false;
  const domain = email.slice(at).toLowerCase();
  return ALLOWED_DOMAINS.some((d) => domain === d.toLowerCase());
}
