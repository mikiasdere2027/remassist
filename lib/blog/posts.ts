/**
 * The shape of a blog post as the public site renders it.
 *
 * The posts themselves come from the backend API — see lib/blog/content.ts.
 * The list that used to live here was a second, hardcoded copy of them.
 */
export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  /** ISO date — the artboard's display strings are derived from this. */
  date: string;
  /**
   * ISO date of the last substantive edit, when there has been one. Left unset
   * until an article is actually revised: BlogPostingJsonLd and the article's
   * og:modified_time both fall back to `date`, and claiming a modification
   * that did not happen is a freshness signal Google learns to discount.
   */
  updated?: string;
  readTime: string;
  category: string;
  image: string;
  published: boolean;
  /** Byline, as /blog and the article itself already render it. */
  author: { name: string; avatar: string };
}

/**
 * "Kalkidan T., Aug 4, 2026 · 7 min" — the byline the /blog cards render, built
 * from the data so a service page and the blog index cannot drift apart.
 * Dates are formatted in UTC: `date` is a bare ISO day, so a negative-offset
 * server would otherwise render the day before.
 */
export function byline(post: Post) {
  const when = new Date(`${post.date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
  return `${post.author.name}, ${when} · ${post.readTime.replace(' read', '')}`;
}
