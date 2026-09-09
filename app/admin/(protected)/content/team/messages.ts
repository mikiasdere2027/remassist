/**
 * What the Team editor can say after an action.
 *
 * Fixed codes in the query string, resolved to text here — the same rule as
 * every other admin screen. An action must never put its own wording into a
 * URL that is rendered back into the page, and an unknown code renders nothing.
 */
export const TEAM_OK = {
  added: 'Team member added as a draft.',
  saved: 'Saved.',
  published: 'That member is live on the homepage.',
  unpublished: 'That member is off the homepage. Nothing was deleted — their card is kept.',
  moved: 'Order updated.',
} as const;

export const TEAM_ERR = {
  'no-database': 'The database is unavailable, so nothing was changed.',
  'not-found': 'That team member no longer exists.',
  empty: 'Name, role and initials are all required.',
  'too-long': 'That is longer than the field allows.',
  'bad-initials': 'Initials may only be up to four letters.',
  'bad-linkedin': 'LinkedIn must be a full https:// URL, or left blank.',
  'bad-type': 'That file type is not supported — use a JPEG, PNG or WebP image.',
  'too-big': 'That photo is larger than 4 MB.',
  'photo-failed': 'The photo could not be saved.',
  'bad-position': 'That position is not a number.',
} as const;

export function teamMessage(
  ok: string | undefined,
  err: string | undefined,
): { text: string; tone: 'ok' | 'err' } | null {
  if (err && err in TEAM_ERR) return { text: TEAM_ERR[err as keyof typeof TEAM_ERR], tone: 'err' };
  if (ok && ok in TEAM_OK) return { text: TEAM_OK[ok as keyof typeof TEAM_OK], tone: 'ok' };
  return null;
}