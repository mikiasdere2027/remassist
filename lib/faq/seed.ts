import { answerHtml } from '@/lib/content/sanitize';
import seed from '@/lib/content/seed/content.json';
import { MAX_FEATURED } from '@/lib/api/faq';

/**
 * The FAQ as the bundled seed (lib/content/seed/content.json) has it — what
 * lib/faq/content.ts serves when the backend cannot be reached (e.g. `next
 * build` on a machine without it). Pure and server-free, so it is testable.
 *
 * The live rule — starred questions in their own order, else the top of the
 * FAQ — is enforced by the backend (src/modules/faq/faq.featured.ts);
 * selectFeatured mirrors it here only so the fallback homepage card matches.
 */

export interface FaqEntry {
  question: string;
  /** Sanitised HTML, ready for dangerouslySetInnerHTML. */
  answer: string;
}

export interface FaqGroup {
  slug: string;
  title: string;
  blurb: string | null;
  linkHref: string | null;
  linkLabel: string | null;
  items: FaqEntry[];
}

/** The shape selectFeatured needs — a subset of a faq_items row. */
export interface Featurable {
  featured: boolean;
  featuredOrder: number;
}

/**
 * Which questions the homepage shows, given every published question in page
 * order: the starred ones in their own order (stable, so ties keep page
 * order), or the first `max` when nothing is starred.
 */
export function selectFeatured<T extends Featurable>(
  publishedInPageOrder: readonly T[],
  max: number = MAX_FEATURED,
): T[] {
  const starred = publishedInPageOrder
    .filter((i) => i.featured)
    .sort((a, b) => a.featuredOrder - b.featuredOrder);
  return (starred.length > 0 ? starred : [...publishedInPageOrder]).slice(0, max);
}

function groupsInOrder() {
  return seed.faqGroups.slice().sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Every published seed question, in the order /faq renders them. */
function seedItemsInPageOrder() {
  const rank = new Map(groupsInOrder().map((g, i) => [g.slug, i] as const));
  return seed.faqItems
    .filter((i) => i.published)
    .sort((a, b) => {
      const byGroup = (rank.get(a.groupSlug) ?? 0) - (rank.get(b.groupSlug) ?? 0);
      return byGroup !== 0 ? byGroup : a.sortOrder - b.sortOrder;
    });
}

/** Same shape as GET /v1/public/faq. */
export function seedFaq(): FaqGroup[] {
  return groupsInOrder().map((g) => ({
    slug: g.slug,
    title: g.title,
    blurb: g.blurb,
    linkHref: g.linkHref,
    linkLabel: g.linkLabel,
    items: seed.faqItems
      .filter((i) => i.groupSlug === g.slug && i.published)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({ question: i.question, answer: answerHtml(i.answer) })),
  }));
}

/** Same shape as GET /v1/public/faq/featured. */
export function seedFeaturedFaq(): FaqEntry[] {
  return selectFeatured(seedItemsInPageOrder()).map((i) => ({
    question: i.question,
    answer: answerHtml(i.answer),
  }));
}
