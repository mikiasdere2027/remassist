import 'server-only';
import { API_URL } from './server';
import { readApiResponse } from './errors';

/**
 * Cache tags shared with the backend (src/common/revalidation in
 * remassist-backend). When an editor changes content, the backend POSTs the
 * tag to /api/revalidate and every page that fetched with it is rebuilt.
 */
export const TAGS = {
  faq: 'faq',
  posts: 'posts',
  reviews: 'reviews',
  team: 'team',
  popups: 'popups',
  pricing: 'pricing',
} as const;
export type Tag = (typeof TAGS)[keyof typeof TAGS];

/** Backstop if a revalidation call is ever missed: refresh at least hourly. */
const REVALIDATE_SECONDS = 3600;

/**
 * Public content for the marketing pages — GET /v1/public/<…>.
 *
 * Cached with the given tags (on-demand revalidation) plus an hourly
 * backstop. If the backend can't be reached — e.g. during `next build` on a
 * machine where it isn't running — the page falls back to the bundled seed
 * content (lib/content/seed) so it still renders. That fallback is LOUD in the
 * logs: a silently stale page is how a wrong price gets published.
 */
export async function apiPublic<T>(
  path: string,
  { tags, fallback }: { tags: Tag[]; fallback: () => T },
): Promise<T> {
  try {
    const res = await fetch(`${API_URL}/v1${path}`, {
      headers: { accept: 'application/json' },
      next: { tags, revalidate: REVALIDATE_SECONDS },
    });
    return await readApiResponse<T>(res);
  } catch (err) {
    console.error(`[api] GET ${path} failed — serving bundled seed content instead.`, err);
    return fallback();
  }
}
