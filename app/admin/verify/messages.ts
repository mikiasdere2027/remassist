/**
 * What the activation screen can say — MIGRATION-PLAN §10, phase 5.
 *
 * The same rule as settings/messages.ts and for the same reason: a fixed set of
 * codes carried in the query string, resolved to text here, so no action ever
 * puts its own wording in a URL. A code that is not in this table renders
 * nothing at all.
 */
export const VERIFY_ERR = {
  'verify-failed':
    'The activation code could not be sent. That is a mail configuration problem '
    + 'rather than anything you did — an administrator can confirm this address '
    + 'directly on the server with npm run admin:verify.',
} as const;

export function verifyMessage(err: string | undefined): string | null {
  return err && err in VERIFY_ERR ? VERIFY_ERR[err as keyof typeof VERIFY_ERR] : null;
}
