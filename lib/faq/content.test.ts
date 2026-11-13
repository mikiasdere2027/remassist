import { describe, expect, it } from 'vitest';
import seed from '@/lib/content/seed/content.json';
import { MAX_FEATURED } from '@/lib/api/faq';
import { seedFaq, seedFeaturedFaq, selectFeatured } from './seed';

/**
 * The fallback's data.
 *
 * lib/faq/content.ts reads the FAQ from the backend and, when it can't be
 * reached (a `next build` with no backend running), serves the bundled seed
 * via lib/faq/seed.ts. If that file is ever wrong or short, the fallback ships
 * an empty FAQ page and nobody notices until the site is live.
 *
 * Tested through seed.ts rather than content.ts: content.ts is server-only
 * and fetches, while the seed builders are pure.
 */
describe('the FAQ seed that CI builds from', () => {
  it('has every group and question', () => {
    expect(seed.faqGroups).toHaveLength(6);
    // 29 imported from the old /faq page, plus the four the homepage used to
    // hard-code in components/home/FaqSection.tsx.
    expect(seed.faqItems).toHaveLength(33);
  });

  it('keeps the group blurbs and source links', () => {
    // These were nearly lost in the cutover: faq_groups had no column for them,
    // so every count matched while six lines of visible copy would have gone.
    for (const g of seed.faqGroups) {
      expect(g.blurb, g.slug).toBeTruthy();
      expect(g.linkHref, g.slug).toBeTruthy();
      expect(g.linkLabel, g.slug).toBeTruthy();
    }
  });

  it('keeps the anchors the jump nav links to, in order', () => {
    // The slugs are hrefs. Changing one silently breaks a link on the page.
    expect(seed.faqGroups.map((g) => g.slug)).toEqual([
      'pricing', 'starting', 'people', 'tools-data', 'scope', 'oversight',
    ]);
  });

  it('has no empty question or answer', () => {
    for (const i of seed.faqItems) {
      expect(i.question.trim().length, i.groupSlug).toBeGreaterThan(0);
      expect(i.answer.trim().length, i.question).toBeGreaterThan(0);
    }
  });

  it('stocks the homepage card', () => {
    // The homepage is prerendered by the same CI build. Without featured rows
    // here it would fall back to the top of the FAQ — not broken, but not the
    // four questions that were chosen for it either, and nobody would notice.
    const featured = seed.faqItems.filter((i) => i.featured);
    expect(featured).toHaveLength(4);
    expect(featured.every((i) => i.published)).toBe(true);
    expect(featured.length).toBeLessThanOrEqual(MAX_FEATURED);
  });

  it('gives the featured questions a position each', () => {
    // Duplicates would leave the homepage order down to the page-order
    // tiebreak, which is not what somebody arranging four questions meant.
    const orders = seed.faqItems.filter((i) => i.featured).map((i) => i.featuredOrder);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('assigns every question to a group that exists', () => {
    const slugs = new Set(seed.faqGroups.map((g) => g.slug));
    for (const i of seed.faqItems) expect(slugs.has(i.groupSlug), i.groupSlug).toBe(true);
  });
});

/**
 * The homepage's selection rule.
 *
 * Pure, so this is the whole of it — no database, no fixtures beyond the four
 * fields it reads. The fallback is the case worth the test: an editor
 * unstarring the last question is an ordinary action, and it must not empty the
 * homepage's FAQ card.
 */
describe('the seed fallback loaders', () => {
  it('builds every section, in order, with sanitised answers', () => {
    const groups = seedFaq();
    expect(groups.map((g) => g.slug)).toEqual([
      'pricing', 'starting', 'people', 'tools-data', 'scope', 'oversight',
    ]);
    const items = groups.flatMap((g) => g.items);
    expect(items.length).toBe(seed.faqItems.filter((i) => i.published).length);
    for (const i of items) expect(i.answer.startsWith('<')).toBe(true);
  });

  it('stocks the fallback homepage card with the starred questions in order', () => {
    const starred = seed.faqItems
      .filter((i) => i.featured && i.published)
      .sort((a, b) => a.featuredOrder - b.featuredOrder)
      .map((i) => i.question);
    expect(seedFeaturedFaq().map((i) => i.question)).toEqual(starred);
  });
});

describe('selectFeatured', () => {
  const q = (id: string, featured: boolean, featuredOrder = 0) => ({ id, featured, featuredOrder });

  it('takes the starred questions, in their own order', () => {
    const picked = selectFeatured([
      q('a', false),
      q('b', true, 1),
      q('c', false),
      q('d', true, 0),
    ]);
    expect(picked.map((i) => i.id)).toEqual(['d', 'b']);
  });

  it('falls back to page order when nothing is starred', () => {
    const picked = selectFeatured([q('a', false), q('b', false), q('c', false)], 2);
    expect(picked.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('breaks a tie on page order rather than arbitrarily', () => {
    // Two questions share a position until one of them is moved — the column
    // default is 0 — so this is the state right after starring a second one.
    const picked = selectFeatured([q('a', true), q('b', true), q('c', true)]);
    expect(picked.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('never returns more than the card holds', () => {
    const many = Array.from({ length: 20 }, (_, i) => q(String(i), true, i));
    expect(selectFeatured(many)).toHaveLength(MAX_FEATURED);
    // Including down the fallback path, where the whole FAQ is the candidate list.
    expect(selectFeatured(many.map((i) => ({ ...i, featured: false })))).toHaveLength(MAX_FEATURED);
  });

  it('does not reorder the list it was given', () => {
    const rows = [q('a', true, 2), q('b', true, 1)];
    selectFeatured(rows);
    expect(rows.map((i) => i.id)).toEqual(['a', 'b']);
  });
});
