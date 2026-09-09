/**
 * How a post's date reads on the site.
 *
 * Extracted from app/blog/page.tsx when the article page and the admin's
 * preview started needing the same string. Three copies of a date format is
 * how the index ends up saying "Aug 6, 2026" while the article says
 * "2026-08-06".
 */

/** "Aug 6, 2026" — the format the index cards have always printed. */
export function formatPostDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}
