/**
 * Reviews and review sources — response shapes and small wrappers for the
 * backend's reviews module (remassist-backend src/modules/reviews).
 *
 *   GET   /v1/admin/reviews?source=      → AdminReview[] (sources' order, then sortOrder)
 *   GET   /v1/admin/reviews/:id          → AdminReview & { siblingIds }
 *   POST  /v1/admin/reviews              → AdminReview (always created hidden)
 *   PATCH /v1/admin/reviews/:id          → AdminReview (corrections, { published })
 *   PUT   /v1/admin/reviews/order        → AdminReview[] — every id of ONE source
 *   GET   /v1/admin/reviews/sources      → AdminReviewSource[]
 *   PATCH /v1/admin/reviews/sources/:src → the source row
 *   GET   /v1/public/reviews             → ReviewSourceData[] (lib/reviews/content.ts)
 *
 * Nothing deletes: hide with `published: false`.
 */
import { api } from './client';
import { ApiError } from './errors';

export type ReviewSourceKey = 'trustpilot' | 'google';

export interface AdminReview {
  id: string;
  source: ReviewSourceKey;
  author: string;
  meta: string;
  dateText: string;
  headline: string | null;
  body: string;
  rating: number;
  sortOrder: number;
  published: boolean;
  createdAt: string;
}

/** GET /admin/reviews/:id — plus the source's review ids in order. */
export interface AdminReviewDetail extends AdminReview {
  siblingIds: string[];
}

export interface AdminReviewSource {
  source: ReviewSourceKey;
  url: string;
  stars: number;
  ratingLabel: string;
  footnote: string | null;
  sortOrder: number;
  reviewCount: number;
  publishedCount: number;
}

/** The text fields of a review (the body of POST, and of a correction PATCH). */
export interface ReviewFields {
  author: string;
  meta: string;
  dateText: string;
  headline: string | null;
  body: string;
  rating: number;
}

export interface ReviewSourceFields {
  url: string;
  ratingLabel: string;
  stars: number;
  footnote: string | null;
}

export const reviewsApi = {
  create: (body: ReviewFields & { source: ReviewSourceKey }) =>
    api.post<AdminReview>('/admin/reviews', body),
  update: (id: string, patch: Partial<ReviewFields> & { published?: boolean }) =>
    api.patch<AdminReview>(`/admin/reviews/${id}`, patch),
  setPublished: (id: string, published: boolean) =>
    api.patch<AdminReview>(`/admin/reviews/${id}`, { published }),
  /** `ids` must be every review of one source, in the new order. */
  reorder: (ids: string[]) => api.put<AdminReview[]>('/admin/reviews/order', { ids }),
  updateSource: (source: ReviewSourceKey, patch: Partial<ReviewSourceFields>) =>
    api.patch<AdminReviewSource>(`/admin/reviews/sources/${source}`, patch),
};

/** `ids` with the entry at `from` moved to `to` (both 0-based, clamped). */
export function moveId(ids: string[], from: number, to: number): string[] {
  const next = ids.slice();
  const [moved] = next.splice(from, 1);
  next.splice(Math.min(Math.max(to, 0), next.length), 0, moved);
  return next;
}

/**
 * What to tell the editor when a call fails: the first validation issue if
 * there is one ("A rating has to be…"), else the API's message.
 */
export function reviewErrorText(err: unknown): string {
  if (err instanceof ApiError) return err.issues[0]?.message ?? err.message;
  return err instanceof Error ? err.message : 'Something went wrong.';
}
