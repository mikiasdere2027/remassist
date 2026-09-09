/**
 * Turn a post title into a URL slug.
 *
 * The editor generates the slug from the title as it is typed and stops the
 * moment the slug is edited by hand — see PostForm. This function is only the
 * transform; the decision about when to apply it lives there.
 *
 * The output has to satisfy the same shape the save action enforces
 * (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`), so it is deliberately strict: accents are
 * folded to their base letters, everything that is not a letter or digit
 * becomes a single hyphen, and leading, trailing and doubled hyphens are
 * dropped. A title with nothing usable in it — punctuation only, or a script
 * NFD cannot decompose — yields an empty string rather than an invalid slug,
 * and the field then simply stays empty for the editor to fill in.
 */

/** Long enough for any real headline; the column allows 300. */
const MAX_SLUG = 120;

export function slugify(title: string): string {
  return title
    .normalize('NFD')
    /* Combining marks, left behind by NFD: "é" is now "e" + U+0301. */
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    /* An apostrophe joins words rather than separating them: "team's" should
       become "teams", not "team-s". */
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG)
    /* The slice can leave a trailing hyphen behind. */
    .replace(/-+$/g, '');
}
