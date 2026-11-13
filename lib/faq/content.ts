import 'server-only';
import { apiPublic, TAGS } from '@/lib/api/public';
import { seedFaq, seedFeaturedFaq, type FaqEntry, type FaqGroup } from './seed';

/**
 * The public FAQ, read from the backend (GET /v1/public/faq…), cached under
 * the `faq` tag — the backend revalidates it whenever a published question or
 * a section changes.
 *
 * If the backend can't be reached, apiPublic logs loudly and serves the
 * bundled seed (lib/faq/seed.ts) so the page still renders.
 *
 * Answers arrive as sanitised HTML, ready for dangerouslySetInnerHTML.
 */

export type { FaqEntry, FaqGroup, Featurable } from './seed';
export { selectFeatured } from './seed';
export { MAX_FEATURED } from '@/lib/api/faq';

/** /faq — every section in order with its published questions (empty sections included). */
export function getFaq(): Promise<FaqGroup[]> {
  return apiPublic<FaqGroup[]>('/public/faq', { tags: [TAGS.faq], fallback: seedFaq });
}

/** The homepage card: starred published questions, else the top of the FAQ. */
export function getFeaturedFaq(): Promise<FaqEntry[]> {
  return apiPublic<FaqEntry[]>('/public/faq/featured', {
    tags: [TAGS.faq],
    fallback: seedFeaturedFaq,
  });
}

/**
 * Published questions picked by an article layout, in the editor's order.
 * Unknown or unpublished ids are dropped. The seed has no ids, so the
 * fallback is an empty list (the article renders without its FAQ block).
 */
export async function getFaqByIds(ids: string[]): Promise<FaqEntry[]> {
  if (!ids.length) return [];
  const qs = encodeURIComponent(ids.slice(0, 50).join(','));
  return apiPublic<FaqEntry[]>(`/public/faq/items?ids=${qs}`, {
    tags: [TAGS.faq],
    fallback: () => [],
  });
}
