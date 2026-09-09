'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { asc, count, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { reviewSources, reviews } from '@/db/schema';
import { assertUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';

/**
 * Review editing.
 *
 * Same gate as every other action: assertUser plus canEditContent, checked here
 * and not merely on the page, because a server action is a POST endpoint that
 * renders outside the layout tree.
 *
 * A note on what these rows ARE, because it changes what the screen should
 * allow. Each one is a quote from a named person on Trustpilot or Google. The
 * fields exist so a transcription error can be corrected, not so the wording
 * can be improved — a tool that freely rewrites testimonial text is a tool for
 * fabricating testimonials. Two things follow, and both are enforced rather
 * than merely suggested: a source must keep a working link, so a reader can
 * check the original; and nothing here deletes, so a review that is taken down
 * still has its wording on record.
 *
 * These are called from two screens — the list, and one review's edit page —
 * and each returns to the one it was called from. See backToReview.
 */

const MAX_SHORT = 200;
const MAX_BODY = 4000;

/**
 * Back to the list.
 *
 * The list is tabbed by source, so every redirect that knows which source it
 * touched names it. Landing on Trustpilot after hiding a Google review is the
 * kind of thing that makes a tab bar feel broken when each tab works
 * perfectly on its own. `back` without a tab is for the failures that happen
 * before a source is known — no database, no such row.
 */
function back(param: 'ok' | 'error', code: string, tab?: string): never {
  const at = tab ? `tab=${tab}&` : '';
  redirect(`/admin/content/reviews?${at}${param}=${code}`);
}

/**
 * Back to one review's edit page rather than to the list.
 *
 * Used where staying put is the useful outcome: a validation failure has to
 * return to the form holding the text — losing a re-typed quote to a rating of
 * 6 is how an editor learns to stop correcting things — and hiding or
 * reordering from the edit page should not eject you from it, since the second
 * move up would otherwise need a round trip through the list.
 */
function backToReview(id: string, param: 'ok' | 'error', code: string): never {
  redirect(`/admin/content/reviews/${id}?${param}=${code}`);
}

/** The state a review form's action returns on a refused save. */
export type ReviewActionState = { error?: string };

/** Which screen the form was submitted from; see backToReview. */
function cameFromEditPage(formData: FormData): boolean {
  return formData.get('from') === 'item';
}

async function assertEditor() {
  const user = await assertUser();
  if (!canEditContent(user.role)) throw new Error('forbidden');
  return user;
}

/** /reviews is prerendered, so this is what makes an edit visible. */
function published() {
  revalidatePath('/reviews');
  revalidatePath('/admin/content/reviews');
}

function ratingOf(v: FormDataEntryValue | null): number | null {
  const n = Number(String(v ?? ''));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

export async function saveReview(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const id = String(formData.get('id') ?? '');
  const author = String(formData.get('author') ?? '').trim();
  const meta = String(formData.get('meta') ?? '').trim();
  const dateText = String(formData.get('dateText') ?? '').trim();
  const headline = String(formData.get('headline') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const rating = ratingOf(formData.get('rating'));

  if (!author || !dateText || !body) backToReview(id, 'error', 'empty');
  if (author.length > MAX_SHORT || meta.length > MAX_SHORT
    || dateText.length > MAX_SHORT || headline.length > MAX_SHORT) {
    backToReview(id, 'error', 'too-long');
  }
  if (body.length > MAX_BODY) backToReview(id, 'error', 'too-long');
  if (rating === null) backToReview(id, 'error', 'bad-rating');

  const db = getDb();
  const [row] = await db
    .update(reviews)
    /* headline is nullable and only Trustpilot uses it, so an empty box stores
       null rather than '' — otherwise the public page renders an empty heading
       above every Google review. */
    .set({ author, meta, dateText, headline: headline || null, body, rating })
    .where(eq(reviews.id, id))
    .returning({ id: reviews.id, source: reviews.source });

  if (!row) back('error', 'not-found');

  published();
  back('ok', 'saved', row.source);
}

export async function addReview(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  await assertEditor();
  if (!isDatabaseConfigured()) return { error: 'no-database' };

  const source = String(formData.get('source') ?? '');
  const author = String(formData.get('author') ?? '').trim();
  const meta = String(formData.get('meta') ?? '').trim();
  const dateText = String(formData.get('dateText') ?? '').trim();
  const headline = String(formData.get('headline') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const rating = ratingOf(formData.get('rating'));

  /* A refused save returns the code to the Add review form, which is still
     mounted — the typed quote is not thrown away by a redirect back to a
     freshly-rendered page. */
  if (!author || !dateText || !body) return { error: 'empty' };
  /* The same length gate saveReview applies. The form's maxLength stops a paste
     in a browser; this stops one that did not come from the form. */
  if (author.length > MAX_SHORT || meta.length > MAX_SHORT
    || dateText.length > MAX_SHORT || headline.length > MAX_SHORT) return { error: 'too-long' };
  if (body.length > MAX_BODY) return { error: 'too-long' };
  if (rating === null) return { error: 'bad-rating' };

  const db = getDb();
  const [known] = await db
    .select({ source: reviewSources.source })
    .from(reviewSources)
    .where(eq(reviewSources.source, source as 'trustpilot' | 'google'))
    .limit(1);
  if (!known) return { error: 'source-not-found' };

  const [{ n }] = await db
    .select({ n: count() })
    .from(reviews)
    .where(eq(reviews.source, known.source));

  await db.insert(reviews).values({
    source: known.source,
    author,
    meta,
    dateText,
    headline: headline || null,
    body,
    rating,
    sortOrder: Number(n),
    /* Off the page until somebody has checked it against the original. These
       are other people's words; publishing one the instant it is typed is how
       a transcription error becomes a public misquote. */
    published: false,
  });

  published();
  back('ok', 'added', known.source);
}

export async function setReviewPublished(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const id = String(formData.get('id') ?? '');
  const next = formData.get('published') === '1';

  const db = getDb();
  const [row] = await db
    .update(reviews)
    .set({ published: next })
    .where(eq(reviews.id, id))
    .returning({ id: reviews.id, source: reviews.source });

  if (!row) back('error', 'not-found');

  published();
  const code = next ? 'published' : 'unpublished';
  if (cameFromEditPage(formData)) backToReview(id, 'ok', code);
  back('ok', code, row.source);
}

/** Swap with a neighbour inside the source, in one transaction. See moveFaqItem. */
export async function moveReview(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const id = String(formData.get('id') ?? '');
  const direction = formData.get('direction') === 'up' ? 'up' : 'down';

  const db = getDb();
  const [item] = await db
    .select({ id: reviews.id, source: reviews.source, sortOrder: reviews.sortOrder })
    .from(reviews)
    .where(eq(reviews.id, id))
    .limit(1);
  if (!item) back('error', 'not-found');

  const siblings = await db
    .select({ id: reviews.id, sortOrder: reviews.sortOrder })
    .from(reviews)
    .where(eq(reviews.source, item.source))
    .orderBy(asc(reviews.sortOrder));

  const at = siblings.findIndex((s) => s.id === item.id);
  const swapWith = direction === 'up' ? siblings[at - 1] : siblings[at + 1];
  /* Already at the end it was asked to move towards. Not an error — the button
     is disabled there, so this is a double-submit or a stale page. */
  if (!swapWith) {
    if (cameFromEditPage(formData)) backToReview(id, 'ok', 'moved');
    back('ok', 'moved', item.source);
  }

  await db.transaction(async (tx) => {
    await tx.update(reviews).set({ sortOrder: swapWith.sortOrder }).where(eq(reviews.id, item.id));
    await tx.update(reviews).set({ sortOrder: item.sortOrder }).where(eq(reviews.id, swapWith.id));
  });

  published();
  if (cameFromEditPage(formData)) backToReview(id, 'ok', 'moved');
  back('ok', 'moved', item.source);
}

/** The list tab holding the per-source figures. Mirrors the one in page.tsx. */
const SOURCES_TAB = 'sources';

/**
 * The per-source figures, edited on the list's Sources tab.
 *
 * Every exit names that tab, for the same reason the review actions name
 * theirs: a rejected save that also moves you to Trustpilot has told you two
 * things and only one of them is true.
 */
export async function saveReviewSource(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) back('error', 'no-database', SOURCES_TAB);

  const source = String(formData.get('source') ?? '');
  const url = String(formData.get('url') ?? '').trim();
  const ratingLabel = String(formData.get('ratingLabel') ?? '').trim();
  const footnote = String(formData.get('footnote') ?? '').trim();
  const stars = ratingOf(formData.get('stars'));

  if (!url || !ratingLabel) back('error', 'empty', SOURCES_TAB);
  if (stars === null) back('error', 'bad-rating', SOURCES_TAB);

  /**
   * The link is what lets a reader go and check the review for themselves, so
   * it is required to be a real one. A testimonial section that cites a source
   * nobody can follow is just a claim.
   */
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    back('error', 'bad-url', SOURCES_TAB);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    back('error', 'bad-url', SOURCES_TAB);
  }

  const db = getDb();
  const [row] = await db
    .update(reviewSources)
    .set({ url, ratingLabel, stars, footnote: footnote || null })
    .where(eq(reviewSources.source, source as 'trustpilot' | 'google'))
    .returning({ source: reviewSources.source });

  if (!row) back('error', 'source-not-found', SOURCES_TAB);

  published();
  back('ok', 'source-saved', SOURCES_TAB);
}
