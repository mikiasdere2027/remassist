/**
 * What the FAQ editor can say after an action.
 *
 * Fixed codes in the query string, resolved to text here — the same rule as
 * every other admin screen. An action must never put its own wording into a
 * URL that is rendered back into the page, and an unknown code renders nothing.
 */
export const FAQ_OK = {
  saved: 'Saved.',
  added: 'Question added.',
  published: 'That question is live on the FAQ page.',
  unpublished: 'That question is off the FAQ page. Nothing was deleted — its wording is kept.',
  moved: 'Order updated.',
  featured: 'That question is on the homepage.',
  unfeatured: 'That question is off the homepage. It is still on the FAQ page.',
  'featured-moved': 'Homepage order updated.',
  removed: 'That draft question was removed.',
  'group-saved': 'Section saved.',
} as const;

export const FAQ_ERR = {
  'no-database': 'The database is unavailable, so nothing was changed.',
  'not-found': 'That question no longer exists.',
  'group-not-found': 'That section no longer exists.',
  empty: 'A question and an answer are both required.',
  'too-long': 'That is longer than the field allows.',
  'bad-slug': 'A section anchor may only contain lowercase letters and hyphens — it is part of a URL.',
  'slug-taken': 'Another section already uses that anchor.',
  'group-not-empty': 'That section still holds questions. Move or unpublish them first.',
  'not-confirmed': 'Nothing was removed — the confirmation was not ticked.',
  'delete-published': 'A published question cannot be removed. Take it off the FAQ page first, then remove the draft.',
  'featured-full': 'The homepage card holds six questions. Take one off before adding another.',
  'not-featured': 'That question is not on the homepage, so there is nothing to reorder.',
} as const;

export function faqMessage(
  ok: string | undefined,
  err: string | undefined,
): { text: string; tone: 'ok' | 'err' } | null {
  if (err && err in FAQ_ERR) return { text: FAQ_ERR[err as keyof typeof FAQ_ERR], tone: 'err' };
  if (ok && ok in FAQ_OK) return { text: FAQ_OK[ok as keyof typeof FAQ_OK], tone: 'ok' };
  return null;
}
