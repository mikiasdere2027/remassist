import {
  pgTable, pgEnum, text, integer, boolean, timestamp, uuid, index,
} from 'drizzle-orm/pg-core';
import { POPUP_PLACEMENT_VALUES } from '../../lib/popups/placement';
import { POPUP_TEMPLATE_VALUES } from '../../lib/popups/templates';

/**
 * Editable site content — the CMS tables.
 *
 * Everything here is currently hardcoded in app/: blog metadata in
 * lib/blog/posts.ts, the one article body in app/blog/[slug]/ArticleBody.tsx,
 * reviews in app/reviews/page.tsx, and 29 FAQ entries as raw <details> markup
 * in app/faq/page.tsx. These tables are the destination; the public pages are
 * cut over in a later step, after a seed has proven the same content survives
 * the round trip.
 *
 * What is deliberately NOT modelled: a source's logo and its tone colour. Those
 * are design, not content — there are exactly two of them, they change roughly
 * never, and an editor wants to add a review or correct a footnote rather than
 * swap Trustpilot's wordmark. Storing JSX in a column to avoid a decision is
 * how a CMS turns into a worse version of the code it replaced.
 */

/* ── Blog ──────────────────────────────────────────────────────────────── */

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** The URL segment. Unique because it is the route. */
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  excerpt: text('excerpt').notNull(),
  /**
   * The article itself, HTML.
   *
   * Nullable, and that is not laziness: today four posts have metadata and
   * exactly one has a body (ArticleBody.tsx). A null body is the honest
   * representation of "listed but not written yet", which is also why three of
   * the four are published: false.
   */
  body: text('body'),
  /**
   * Editorial blocks around the rich-text body: overview, callouts, KPI strip,
   * CTA, article FAQ, sources, tags and the author card. Kept as JSON text so
   * an article can use only the blocks it needs.
   */
  articleLayout: text('article_layout'),
  /**
   * Kept as text in YYYY-MM-DD, matching lib/blog/posts.ts. A date column would
   * be tidier, but this value is displayed rather than compared, and changing
   * its type at the same time as changing where it is stored would make a
   * failed cutover harder to read.
   */
  date: text('date').notNull(),
  readTime: text('read_time').notNull(),
  category: text('category').notNull(),
  /**
   * The public URL of the cover image. An image uploaded from the editor's own
   * machine is stored on disk via lib/uploads/images.ts and served at
   * /uploads/blog/<uuid>.<ext>; the seeded posts point at the static files in
   * /public/images/blog. Either way this is a path the browser can fetch.
   */
  image: text('image').notNull(),
  authorName: text('author_name').notNull(),
  /** Same two shapes as `image`: an uploaded /uploads/blog/ URL or a static path. */
  authorAvatar: text('author_avatar').notNull(),
  /** Unpublished posts are listed nowhere public; publishedPosts() filters on it. */
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('posts_published_date_idx').on(t.published, t.date),
]);

/* ── Reviews ───────────────────────────────────────────────────────────── */

export const reviewSource = pgEnum('review_source', ['trustpilot', 'google']);

/**
 * Per-source figures and wording. One row per source, keyed by the source
 * itself — there is no second Trustpilot.
 */
export const reviewSources = pgTable('review_sources', {
  source: reviewSource('source').primaryKey(),
  url: text('url').notNull(),
  /** The star row. The score the source publishes, never one computed here. */
  stars: integer('stars').notNull(),
  /**
   * What the source prints beside the score: Trustpilot says "Excellent",
   * Google says "5.0". Stored as the label rather than derived, because each
   * source words it its own way and inventing a shared rule would misquote one
   * of them.
   */
  ratingLabel: text('rating_label').notNull(),
  /**
   * Anything the reader needs in order to read the cards correctly — that one
   * Trustpilot review was removed by its author, or that Google publishes
   * relative dates. Load-bearing for honesty, so it is content, not a comment.
   */
  footnote: text('footnote'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: reviewSource('source').notNull(),
  author: text('author').notNull(),
  /** Whatever the source prints under the name: country, review count. */
  meta: text('meta').notNull(),
  /**
   * Verbatim as the source states it, including "7 months ago" — Google
   * publishes relative dates and rewriting one into an absolute date would be
   * us asserting something the source did not.
   */
  dateText: text('date_text').notNull(),
  /** Trustpilot reviews carry their own headline. Google reviews do not. */
  headline: text('headline'),
  body: text('body').notNull(),
  rating: integer('rating').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  published: boolean('published').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('reviews_source_order_idx').on(t.source, t.sortOrder),
]);

/* ── FAQ ───────────────────────────────────────────────────────────────── */

export const faqGroups = pgTable('faq_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** The anchor the jump nav links to, so these must keep their current values. */
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  /** The line under the heading. Every group has one. */
  blurb: text('blurb'),
  /**
   * The "Pricing page →" link beside each heading. Two columns rather than one
   * stored anchor: the label is content an editor may reword, the href is a
   * route that has to stay valid, and conflating them means validating markup.
   */
  linkHref: text('link_href'),
  linkLabel: text('link_label'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const faqItems = pgTable('faq_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  /**
   * No cascade. Deleting a group that still holds questions should fail loudly
   * rather than quietly taking 29 answers with it — the same instinct as
   * disabling a user instead of deleting them.
   */
  groupId: uuid('group_id').notNull().references(() => faqGroups.id),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  published: boolean('published').notNull().default(true),
  /**
   * Promoted to the homepage FAQ card.
   *
   * The homepage used to carry four questions hard-coded in
   * components/home/FaqSection.tsx, which meant the one FAQ an editor could
   * not edit was the one most visitors read. A flag rather than a seventh
   * group, so a question lives in exactly one place: featuring it puts the
   * same wording on the homepage as on /faq, and correcting it corrects both.
   *
   * `published` still governs. A featured draft is an editor's intent, not a
   * live answer — getFeaturedFaq filters on both.
   */
  featured: boolean('featured').notNull().default(false),
  /**
   * Position within the homepage card, independent of sortOrder.
   *
   * The homepage order is a pitch — the question that earns the click first —
   * and the /faq order is a reference. Sharing one column would mean reordering
   * one page silently reorders the other.
   */
  featuredOrder: integer('featured_order').notNull().default(0),
}, (t) => [
  index('faq_items_group_order_idx').on(t.groupId, t.sortOrder),
  index('faq_items_featured_idx').on(t.featured, t.featuredOrder),
]);

/* ── Popup ads ─────────────────────────────────────────────────────────── */

/**
 * Where a popup may appear. The same list drives the admin dropdown and the
 * schema so the two cannot disagree — see lib/popups/placement.ts.
 */
export const popupPlacement = pgEnum(
  'popup_placement',
  POPUP_PLACEMENT_VALUES,
);

/**
 * What shape the popup takes on the page — a corner card that leaves the page
 * usable, or the image alone over a dimmed one. Same arrangement as the
 * placement enum above: the list lives in lib/popups/templates.ts.
 */
export const popupTemplate = pgEnum(
  'popup_template',
  POPUP_TEMPLATE_VALUES,
);

export const popups = pgTable('popups', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Internal label shown in the admin list, never on the popup itself. */
  name: text('name').notNull(),
  /** The headline the visitor sees. */
  title: text('title').notNull(),
  /** The supporting line under the headline. */
  message: text('message').notNull(),
  /** Optional artwork. Uploaded files live under /uploads/popup/. */
  image: text('image'),
  /** The button's wording — one or two words, not a sentence. */
  ctaLabel: text('cta_label').notNull(),
  /** Where the button goes. */
  ctaHref: text('cta_href').notNull(),
  /** The grouping label shared by every popup in one push, e.g. "Summer promo". */
  campaign: text('campaign').notNull(),
  /**
   * The key reported to analytics when the popup is shown and clicked.
   * Unique because it is the identity of the campaign in every report, and
   * URL/GA-shaped so it cannot collide with a built-in event.
   */
  trackingKey: text('tracking_key').notNull().unique(),
  /** Which surface the popup may appear on; 'everywhere' is the default. */
  placement: popupPlacement('placement').notNull().default('everywhere'),
  /**
   * Which of the two shapes it takes. The default is the corner card, because
   * the non-blocking one is the safe thing for a popup to be if nobody chose.
   */
  template: popupTemplate('template').notNull().default('corner'),
  /** When it may start showing. Null = immediately, on publish. */
  startsAt: timestamp('starts_at', { withTimezone: true }),
  /** When it stops. Null = until it is unpublished. */
  endsAt: timestamp('ends_at', { withTimezone: true }),
  /** Seconds after the page loads before the popup appears. */
  delaySeconds: integer('delay_seconds').notNull().default(1),
  /** How long it stays up before auto-dismissing. Null = stays until closed. */
  displaySeconds: integer('display_seconds'),
  /** Unpublished popups are shown nowhere. */
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('popups_live_placement_idx').on(t.published, t.placement),
  index('popups_schedule_idx').on(t.startsAt, t.endsAt),
]);

/* ── Team ──────────────────────────────────────────────────────────────── */

export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  /** "Chief Executive Officer", or any title the editor wants published. */
  role: text('role').notNull(),
  /** The monogram shown when no photo is set — "Johnathan Zemene" -> JZ. */
  initials: text('initials').notNull(),
  /** The small pill on the card ("Exec", "Tech"). Empty means no pill. */
  tag: text('tag').notNull().default(''),
  /** The one-line description under the card on the homepage. */
  blurb: text('blurb'),
  /** Optional profile URL, rendered as a small LinkedIn glyph. */
  linkedin: text('linkedin'),
  /**
   * The public URL of the headshot. Uploaded photos are stored on disk via
   * lib/uploads/images.ts and served at /uploads/team/<uuid>.<ext>; the seeded
   * members point at the static files in /public/images/teams. Null means the
   * card falls back to the initials monogram.
   */
  image: text('image'),
  sortOrder: integer('sort_order').notNull().default(0),
  published: boolean('published').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('team_members_order_idx').on(t.sortOrder),
]);
