import { apiPublic, TAGS } from '@/lib/api/public';
import seed from '@/lib/content/seed/content.json';

/**
 * Reviews, from the backend (GET /v1/public/reviews): sources in order, each
 * with its published reviews in order. Cached under the `reviews` tag, which
 * the backend revalidates on every edit. If the backend can't be reached the
 * bundled seed is served instead (see lib/api/public.ts).
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
  return apiPublic<ReviewSourceData[]>('/public/reviews', {
    tags: [TAGS.reviews],
    fallback: fromSeed,
  });
}
