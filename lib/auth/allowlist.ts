/**
 * Who may reach /admin — MIGRATION-PLAN §10.
 *
 * Kept in its own module, free of next-auth imports, so the rule can be
 * unit-tested without booting an auth runtime. This is the only thing standing
 * between the public internet and every lead in the database, so it is worth
 * testing directly rather than inferring from a redirect.
 */
export const ALLOWED_DOMAINS = ['@remconnect.io', '@remassistance.com'] as const;

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
