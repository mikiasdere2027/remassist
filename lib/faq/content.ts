import { asc, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { faqGroups, faqItems } from '@/db/schema';
import { answerHtml } from '@/lib/content/sanitize';
import seed from '@/lib/content/seed/content.json';

/**
 * The FAQ, read from the database.
 *
 * With a fallback to lib/content/seed/content.json — the same file the import was made
 * from — and the condition on that fallback is the whole design:
 *
 *   DATABASE_URL absent  -> use the seed
 *   DATABASE_URL present -> query, and let any error propagate
 *
 * The first case is CI. .github/workflows runs `npm run build` with no
 * database, and /faq is prerendered, so without a fallback either the build
 * fails or the page ships empty. The second case is production, where the
 * deploy sources shared/.env before building: a query that throws there must
 * fail the build loudly rather than quietly shipping the seed, because the seed
 * is a snapshot of what the content was on the day it was imported and serving
 * it after somebody has edited the FAQ would silently undo their work.
 *
 * That asymmetry is deliberate. A fallback that triggers on *any* problem is
 * how stale content gets served for months without anyone noticing.
 */

export interface FaqEntry {
  question: string;
  /**
   * Sanitised HTML, ready for dangerouslySetInnerHTML.
   *
   * Answers are stored as rich text — see lib/content/sanitize.ts — and the
   * rows imported before the editor existed are plain sentences, which
   * answerHtml wraps in a paragraph on the way out. A consumer never has to
   * know which kind it got.
   */
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

/**
 * How many questions the homepage card holds.
 *
 * The artboard's accordion sits beside a fixed-height certifications panel, and
 * past six the card outgrows it and the two columns stop lining up. Enforced in
 * the admin as well as here, so an editor is told "six is the maximum" at the
 * moment of starring a seventh rather than discovering it did nothing.
 */
export const MAX_FEATURED = 6;

/** The shape selectFeatured needs — a subset of a faq_items row. */
export interface Featurable {
  featured: boolean;
  featuredOrder: number;
}

/**
 * Which questions the homepage shows, given every published question in the
 * order /faq renders them.
 *
 * Pure, and separated from the query for that reason: the interesting rule is
 * the fallback, and it is worth a test that does not need a database.
 *
 * The fallback is the first `max` questions in page order when nothing is
 * starred. A homepage whose FAQ card is empty because somebody unstarred the
 * last question is a visible regression caused by an ordinary editing action,
 * and "the top of the FAQ" is a defensible default for a card that has to show
 * something. The admin says so plainly rather than leaving it to be discovered
 * — see the note above the Homepage tab in the FAQ list.
 */
export function selectFeatured<T extends Featurable>(
  publishedInPageOrder: readonly T[],
  max: number = MAX_FEATURED,
): T[] {
  const starred = publishedInPageOrder
    .filter((i) => i.featured)
    /* Stable, so two questions sharing a featuredOrder — which happens the
       moment two are starred before either is moved — fall back to page
       order rather than to whatever the query returned. */
    .sort((a, b) => a.featuredOrder - b.featuredOrder);

  return (starred.length > 0 ? starred : [...publishedInPageOrder]).slice(0, max);
}

/** Every published seed question, in the order /faq renders them. */
function seedItemsInPageOrder() {
  const rank = new Map(
    seed.faqGroups
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((g, i) => [g.slug, i] as const),
  );

  return seed.faqItems
    .filter((i) => i.published)
    .slice()
    .sort((a, b) => {
      const byGroup = (rank.get(a.groupSlug) ?? 0) - (rank.get(b.groupSlug) ?? 0);
      return byGroup !== 0 ? byGroup : a.sortOrder - b.sortOrder;
    });
}

function fromSeed(): FaqGroup[] {
  return seed.faqGroups
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((g) => ({
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

export async function getFaq(): Promise<FaqGroup[]> {
  if (!isDatabaseConfigured()) return fromSeed();

  const db = getDb();
  const [groups, items] = await Promise.all([
    db.select().from(faqGroups).orderBy(asc(faqGroups.sortOrder)),
    db
      .select()
      .from(faqItems)
      /* Unpublished questions exist so an editor can draft one without it
         appearing here. Filtered in the query rather than after, so a draft
         never reaches the page even in a serialised payload. */
      .where(eq(faqItems.published, true))
      .orderBy(asc(faqItems.sortOrder)),
  ]);

  return groups.map((g) => ({
    slug: g.slug,
    title: g.title,
    blurb: g.blurb,
    linkHref: g.linkHref,
    linkLabel: g.linkLabel,
    items: items
      .filter((i) => i.groupId === g.id)
      .map((i) => ({ question: i.question, answer: answerHtml(i.answer) })),
  }));
}

/**
 * The questions on the homepage card.
 *
 * Same fallback rule as getFaq, for the same reason: the homepage is
 * prerendered and CI builds it without a database.
 *
 * A featured *draft* is not shown. Starring is an editorial intent and
 * publishing is the act that puts words in front of a visitor — keeping those
 * separate means an editor can line up next month's homepage question while
 * this month's is still live.
 */
export async function getFeaturedFaq(): Promise<FaqEntry[]> {
  /* Annotated rather than inferred: the two branches are a database row and a
     seed row, and the only thing this function needs from either is the four
     fields named here. */
  const rows: (Featurable & { question: string; answer: string })[] =
    isDatabaseConfigured() ? await featuredRowsFromDb() : seedItemsInPageOrder();

  return selectFeatured(rows).map((i) => ({
    question: i.question,
    answer: answerHtml(i.answer),
  }));
}

/** Published FAQ rows picked by an article layout, retaining the editor's order. */
export async function getFaqByIds(ids: string[]): Promise<FaqEntry[]> {
  if (!ids.length || !isDatabaseConfigured()) return [];
  const rows = await getDb().select({ id: faqItems.id, question: faqItems.question, answer: faqItems.answer })
    .from(faqItems).where(eq(faqItems.published, true));
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map((row) => ({ question: row.question, answer: answerHtml(row.answer) }));
}

async function featuredRowsFromDb() {
  const db = getDb();
  const [groups, items] = await Promise.all([
    db.select({ id: faqGroups.id }).from(faqGroups).orderBy(asc(faqGroups.sortOrder)),
    db
      .select()
      .from(faqItems)
      .where(eq(faqItems.published, true))
      .orderBy(asc(faqItems.sortOrder)),
  ]);

  /* sortOrder is per section, so a flat list has to sort by the section first
     or the six sections interleave — the same reason the admin list does it. */
  const rank = new Map(groups.map((g, i) => [g.id, i] as const));
  return items.slice().sort((a, b) => {
    const byGroup = (rank.get(a.groupId) ?? 0) - (rank.get(b.groupId) ?? 0);
    return byGroup !== 0 ? byGroup : a.sortOrder - b.sortOrder;
  });
}
