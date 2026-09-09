import styles from '../../../admin.module.css';

/**
 * How a review is drawn in the admin, shared by the list and the edit page.
 *
 * Presentation only, and deliberately so: the source's display name and the
 * avatar tint are design with two possible values that change roughly never,
 * which is the same reasoning lib/reviews/content.ts gives for keeping the
 * logos out of the database. Nothing here reads or writes anything.
 */

export const SOURCE_LABEL: Record<string, string> = {
  trustpilot: 'Trustpilot',
  google: 'Google',
};

/**
 * Initials for the avatar.
 *
 * Authors here are whatever the source printed — "TANO Group", "ROOFING PROS",
 * "Surafel Dereje" — so this takes the first letter of the first two words and
 * falls back to the first two characters of a single-word name. Decorative: the
 * meta line underneath spells the name out, which is why the avatar is
 * aria-hidden and is the first thing dropped on a narrow screen.
 */
export function initials(author: string): string {
  const words = author.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const STAR = 'm12 3 2.6 5.6 6 .6-4.5 4 1.2 5.9L12 16.4 6.7 19l1.2-5.9-4.5-4 6-.6z';

/**
 * The star row: filled to the rating, outlined for the rest.
 *
 * Five stars are always drawn rather than only the earned ones, because "four
 * filled of five" and "four stars, total unknown" look identical when the
 * remainder is left off, and the difference is the whole meaning.
 */
export function Stars({ rating }: { rating: number }) {
  return (
    <div className={styles.stars} role="img" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 24 24"
          fill={n <= rating ? 'currentColor' : 'none'}
          stroke={n <= rating ? 'none' : 'currentColor'}
          strokeWidth={1.6}
          aria-hidden="true"
        >
          <path d={STAR} />
        </svg>
      ))}
    </div>
  );
}

/**
 * The source's own mark, drawn beside its name in a panel head.
 *
 * Inlined rather than pointed at /images/*-logo.svg, because those two files
 * are sized for the public page: Trustpilot's is the full wordmark, which
 * spells out a name the heading beside it is about to repeat, and at 18px it
 * would be unreadable anyway. The useful part of that asset next to a heading
 * is its star, so the star is what this draws, with Google's G at the same
 * size. Both paths are lifted verbatim from those files, so the marks here are
 * the ones the site already shows.
 *
 * Always aria-hidden: the heading it sits against says the name in words.
 * Returns null for a source nobody has drawn a mark for — a new row in
 * review_sources should show up as a heading with no logo, not a broken one.
 */
export function SourceMark({ source }: { source: string }) {
  if (source === 'trustpilot') {
    return (
      <svg className={styles.sourceMark} viewBox="0 0 271.3 258" aria-hidden="true">
        <path
          fill="#00b67a"
          d="M271.3 98.6H167.7L135.7 0l-32.1 98.6L0 98.5l83.9 61L51.8 258l83.9-60.9 83.8 60.9-32-98.5 83.8-60.9z"
        />
        <path fill="#005128" d="M194.7 181.8l-7.2-22.3-51.8 37.6z" />
      </svg>
    );
  }

  if (source === 'google') {
    return (
      <svg className={styles.sourceMark} viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
        />
        <path
          fill="#34A853"
          d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
        />
        <path
          fill="#FBBC05"
          d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
        />
        <path
          fill="#EA4335"
          d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
        />
      </svg>
    );
  }

  return null;
}
