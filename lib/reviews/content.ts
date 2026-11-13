import { asc, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { reviewSources, reviews } from '@/db/schema';
import seed from '@/lib/content/seed/content.json';

/**
 * Reviews, read from the database.
 *
 * Same fallback rule as lib/faq/content.ts, for the same reasons:
 *
 *   DATABASE_URL absent  -> use the seed, because CI builds without one
 *   DATABASE_URL present -> query, and let an error fail the build loudly
 *
 * Returns plain data only. Logos, tone colours, the source's display name and
 * whether its logo is a wordmark stay in the page as a presentation map: they
 * are design, there are two of them, and they change roughly never. This module
 * deliberately knows nothing about how any of it looks.
 */

export interface ReviewData {
  author: string;
  meta: string;
  dateText: string;
  headline: string | null;
  body: string;
  rating: number;
}

export interface ReviewSourceData {
  source: 'trustpilot' | 'google';
  url: string;
  stars: number;
  ratingLabel: string;
  footnote: string | null;
  reviews: ReviewData[];
}

function fromSeed(): ReviewSourceData[] {
  return seed.reviewSources
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => ({
      source: s.source as 'trustpilot' | 'google',
      url: s.url,
      stars: s.stars,
      ratingLabel: s.ratingLabel,
      footnote: s.footnote,
      reviews: seed.reviews
        .filter((r) => r.source === s.source && r.published)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((r) => ({
          author: r.author,
          meta: r.meta,
          dateText: r.dateText,
          headline: r.headline,
          body: r.body,
          rating: r.rating,
        })),
    }));
}

export async function getReviews(): Promise<ReviewSourceData[]> {
  if (!isDatabaseConfigured()) return fromSeed();

  const db = getDb();
  const [sources, rows] = await Promise.all([
    db.select().from(reviewSources).orderBy(asc(reviewSources.sortOrder)),
    db
      .select()
      .from(reviews)
      /* Unpublished reviews exist so one can be drafted, or taken down without
         losing its wording. Filtered in the query so a draft never reaches the
         page even inside a serialised payload. */
      .where(eq(reviews.published, true))
      .orderBy(asc(reviews.sortOrder)),
  ]);

  return sources.map((s) => ({
    source: s.source,
    url: s.url,
    stars: s.stars,
    ratingLabel: s.ratingLabel,
    footnote: s.footnote,
    reviews: rows
      .filter((r) => r.source === s.source)
      .map((r) => ({
        author: r.author,
        meta: r.meta,
        dateText: r.dateText,
        headline: r.headline,
        body: r.body,
        rating: r.rating,
      })),
  }));
}
