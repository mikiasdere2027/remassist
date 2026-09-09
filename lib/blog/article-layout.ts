/**
 * The optional, structured part of an article.
 *
 * The body remains rich text; this object carries the presentation blocks that
 * should not be faked with pasted HTML. Keeping it in one JSON column makes a
 * new block additive without turning every editorial decision into a migration.
 */
export type ArticleLayout = {
  overview?: { title?: string; items: string[] };
  checklist?: { title: string; items: string[] };
  quote?: { text: string; attribution?: string };
  kpis?: Array<{ value: string; label: string }>;
  cta?: { title: string; text?: string; primaryLabel?: string; primaryHref?: string; secondaryLabel?: string; secondaryHref?: string };
  faq?: Array<{ question: string; answer: string }>;
  existingFaqIds?: string[];
  sources?: Array<{ label: string; href?: string }>;
  tags?: string[];
  author?: { role?: string; bio?: string; moreLabel?: string; moreHref?: string };
};

const text = (value: unknown, max = 4_000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const strings = (value: unknown, max = 20, itemMax = 1_000) => Array.isArray(value)
  ? value.map((item) => text(item, itemMax)).filter(Boolean).slice(0, max)
  : [];

/** Parse untrusted form/database JSON into the small, render-safe shape above. */
export function parseArticleLayout(value: string | null | undefined): ArticleLayout {
  if (!value) return {};
  try {
    const raw: unknown = JSON.parse(value);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const v = raw as Record<string, unknown>;
    const object = (key: string) => v[key] && typeof v[key] === 'object' && !Array.isArray(v[key])
      ? v[key] as Record<string, unknown> : null;
    const overview = object('overview');
    const checklist = object('checklist');
    const quote = object('quote');
    const cta = object('cta');
    const author = object('author');
    const list = (key: string) => Array.isArray(v[key]) ? v[key] : [];
    const pairs = (key: string, left: string, right: string, max = 12) => list(key)
      .map((item) => item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : null)
      .filter(Boolean)
      .map((item) => ({ [left]: text(item![left], 200), [right]: text(item![right]) }))
      .filter((item) => Boolean(item[left] || item[right])).slice(0, max);
    return {
      ...(overview && { overview: { title: text(overview.title, 120), items: strings(overview.items) } }),
      ...(checklist && { checklist: { title: text(checklist.title, 160), items: strings(checklist.items) } }),
      ...(quote && { quote: { text: text(quote.text), attribution: text(quote.attribution, 300) } }),
      kpis: pairs('kpis', 'value', 'label', 6) as ArticleLayout['kpis'],
      ...(cta && { cta: {
        title: text(cta.title, 200), text: text(cta.text), primaryLabel: text(cta.primaryLabel, 80), primaryHref: text(cta.primaryHref, 500),
        secondaryLabel: text(cta.secondaryLabel, 80), secondaryHref: text(cta.secondaryHref, 500),
      } }),
      faq: pairs('faq', 'question', 'answer', 12) as ArticleLayout['faq'],
      existingFaqIds: strings(v.existingFaqIds, 12, 80),
      sources: pairs('sources', 'label', 'href', 20) as ArticleLayout['sources'],
      tags: strings(v.tags, 12, 80),
      ...(author && { author: { role: text(author.role, 160), bio: text(author.bio), moreLabel: text(author.moreLabel, 80), moreHref: text(author.moreHref, 500) } }),
    };
  } catch { return {}; }
}

export function serializeArticleLayout(layout: ArticleLayout): string {
  return JSON.stringify(parseArticleLayout(JSON.stringify(layout)));
}
