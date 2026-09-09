/**
 * What the popup editor can say after an action.
 *
 * Fixed codes in the query string, resolved to text here — an action never puts
 * its own wording into a URL that gets rendered back into the page. Unknown
 * codes render nothing.
 */
export const POPUP_OK = {
  saved: 'Saved.',
  added: 'Popup created as a draft. It is shown nowhere until you publish it.',
  published: 'That popup is live — it can now appear on its placement.',
  unpublished: 'That popup is suspended. Nothing was deleted — the draft is kept.',
} as const;

export const POPUP_ERR = {
  'no-database': 'The database is unavailable, so nothing was changed.',
  'not-found': 'That popup no longer exists.',
  empty:
    'Everything this template shows has to be filled in — the editor marks what is still missing.',
  'too-long': 'That is longer than the field allows.',
  'bad-url': 'The CTA link must be an http or https URL.',
  'bad-tracking-key':
    'A tracking key may only contain lowercase letters, numbers and hyphens — it is the identity of this popup in every analytics report.',
  'tracking-taken': 'Another popup already uses that tracking key.',
  'bad-placement': 'That placement is not one of the choices.',
  'bad-template': 'That template is not one of the choices.',
  'bad-schedule': 'The end time is before the start time.',
  'bad-delay': 'The delay and display length must be whole numbers of seconds within the allowed ranges.',
  'bad-image': 'An image must be a JPEG, PNG or WebP file.',
  'image-too-big': 'That image is over 4 MB. Save a smaller version and upload that.',
  incomplete:
    'That popup is not finished, so it cannot be published. Open it — the editor lists what is still needed.',
} as const;

export function popupMessage(
  ok: string | undefined,
  err: string | undefined,
): { text: string; tone: 'ok' | 'err' } | null {
  if (err && err in POPUP_ERR) return { text: POPUP_ERR[err as keyof typeof POPUP_ERR], tone: 'err' };
  if (ok && ok in POPUP_OK) return { text: POPUP_OK[ok as keyof typeof POPUP_OK], tone: 'ok' };
  return null;
}