'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { faqGroups, faqItems } from '@/db/schema';
import { assertUser } from '@/lib/auth/require';
import { canDeleteFaqItem, canEditContent } from '@/lib/auth/roles';
import { cleanAnswerHtml, isMeaningfulAnswer } from '@/lib/content/sanitize';
import { MAX_FEATURED } from '@/lib/faq/content';

/**
 * FAQ editing.
 *
 * Every action starts with assertUser + canEditContent, and that is the
 * permission. A server action is a POST endpoint with a generated name that
 * renders outside the layout tree, so a page-level gate protects the page and
 * nothing else — the same reasoning already written into the leads and team
 * actions.
 *
 * Nothing here deletes a *published* question. Unpublishing takes it off the
 * site and keeps what it said, which is the same rule accounts follow one level
 * up: the record of what the site once claimed is worth keeping the first time
 * somebody asks why an answer changed. deleteFaqItem is the narrow exception
 * and refuses a published row outright — see canUnpublishContent and
 * canDeleteFaqItem in lib/auth/roles.ts.
 *
 * Every write revalidates /faq *and* /. Without that the public page keeps
 * serving the previously rendered HTML and an editor's correction appears to
 * have done nothing — the most common way a CMS gets reported as broken when it
 * is not. The homepage is on that list because its FAQ card is these same rows,
 * filtered to the featured ones.
 */

const MAX_QUESTION = 300;
/**
 * Counted against the *cleaned* HTML, not the typed text.
 *
 * Answers are rich text now, so the number has to leave room for the markup
 * around the words. Cleaning first is what makes the limit meaningful: a paste
 * out of Word arrives as kilobytes of junk attributes, and rejecting it for
 * length when the allowlist was about to throw all of it away would be a
 * baffling error to read.
 */
const MAX_ANSWER = 8000;

function back(param: 'ok' | 'error', code: string): never {
  redirect(`/admin/content/faq?${param}=${code}`);
}

/**
 * Back to the edit page for one question rather than to the list.
 *
 * Used where staying put is the useful outcome: a validation failure has to
 * return to the form holding the text, and publishing or reordering from the
 * edit page should not eject you from it.
 */
function backToItem(id: string, param: 'ok' | 'error', code: string): never {
  redirect(`/admin/content/faq/${id}?${param}=${code}`);
}

/** The editing gate, in one place so no action can forget half of it. */
async function assertEditor() {
  const user = await assertUser();
  if (!canEditContent(user.role)) throw new Error('forbidden');
  return user;
}

/**
 * Revalidate the public page as well as this screen.
 *
 * /faq is prerendered, so this is what makes an edit visible. Called after the
 * write rather than before, because revalidating a path then failing to change
 * anything just costs a rebuild.
 */
function published() {
  revalidatePath('/faq');
  revalidatePath('/');
  revalidatePath('/admin/content/faq');
}

/**
 * The three checks every answer goes through, in the order that produces the
 * useful error.
 *
 * Cleaned first, then tested for content, then for length — so an answer made
 * entirely of tags the allowlist drops is reported as empty rather than saved
 * as a blank row, and an over-long one is measured as what would be stored.
 */
function readAnswer(raw: unknown): { html: string; error: 'empty' | 'too-long' | null } {
  const html = cleanAnswerHtml(String(raw ?? ''));
  if (!isMeaningfulAnswer(html)) return { html, error: 'empty' };
  if (html.length > MAX_ANSWER) return { html, error: 'too-long' };
  return { html, error: null };
}

export async function saveFaqItem(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const id = String(formData.get('id') ?? '');
  const question = String(formData.get('question') ?? '').trim();
  const { html: answer, error } = readAnswer(formData.get('answer'));

  if (!question) backToItem(id, 'error', 'empty');
  if (error) backToItem(id, 'error', error);
  if (question.length > MAX_QUESTION) backToItem(id, 'error', 'too-long');

  const db = getDb();
  const [row] = await db
    .update(faqItems)
    .set({ question, answer })
    .where(eq(faqItems.id, id))
    .returning({ id: faqItems.id });

  if (!row) back('error', 'not-found');

  published();
  back('ok', 'saved');
}

/**
 * Returns the *cleaned* answer alongside the id.
 *
 * The Add question screen shows what it just saved in a list above the form,
 * and that list renders the answer as HTML. Echoing the server's copy back is
 * what makes that render safe: the string the browser still holds is whatever
 * the editor emitted, and rendering it would be trusting markup that never
 * passed the allowlist. It is also simply more honest — the preview shows what
 * was stored, including anything the allowlist dropped on the way in.
 */
export async function createFaqItemAction(data: {
  groupId: string;
  question: string;
  answer: string;
}): Promise<{ ok: boolean; id?: string; answer?: string; error?: string }> {
  try {
    await assertEditor();
    if (!isDatabaseConfigured()) return { ok: false, error: 'Database not configured' };

    const groupId = (data.groupId ?? '').trim();
    const question = (data.question ?? '').trim();
    const { html: answer, error } = readAnswer(data.answer);

    if (!question) return { ok: false, error: 'Question and answer are required' };
    if (error === 'empty') return { ok: false, error: 'Question and answer are required' };
    if (question.length > MAX_QUESTION) return { ok: false, error: `Question exceeds ${MAX_QUESTION} characters` };
    if (error === 'too-long') return { ok: false, error: `Answer exceeds ${MAX_ANSWER} characters` };

    const db = getDb();
    const [group] = await db
      .select({ id: faqGroups.id })
      .from(faqGroups)
      .where(eq(faqGroups.id, groupId))
      .limit(1);
    if (!group) return { ok: false, error: 'Section not found' };

    const [{ n }] = await db
      .select({ n: count() })
      .from(faqItems)
      .where(eq(faqItems.groupId, groupId));

    const [inserted] = await db.insert(faqItems).values({
      groupId,
      question,
      answer,
      sortOrder: Number(n),
      published: false,
    }).returning({ id: faqItems.id });

    published();
    return { ok: true, id: inserted?.id, answer };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add question';
    return { ok: false, error: message };
  }
}

/**
 * The Add question screen's counterpart to createFaqItemAction.
 *
 * Same gates and the same refusal as deleteFaqItem — a published question is
 * never removed — but it returns a result instead of redirecting, because the
 * caller is a client component holding the list of what it has just added and
 * has to drop the row from its own state. The confirm step is the two-click
 * button there rather than a field, and the published check is what actually
 * protects anything: a question that screen created is a draft by definition,
 * so this only ever removes something added minutes ago by mistake.
 */
export async function removeFaqItemAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await assertEditor();
    if (!canDeleteFaqItem(user.role)) return { ok: false, error: 'Not allowed' };
    if (!isDatabaseConfigured()) return { ok: false, error: 'Database not configured' };

    const db = getDb();
    const [row] = await db
      .select({ id: faqItems.id, published: faqItems.published })
      .from(faqItems)
      .where(eq(faqItems.id, id))
      .limit(1);
    if (!row) return { ok: false, error: 'That question no longer exists' };
    if (row.published) {
      return { ok: false, error: 'A published question cannot be removed' };
    }

    await db.delete(faqItems).where(eq(faqItems.id, id));

    published();
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to remove question';
    return { ok: false, error: message };
  }
}

export async function setFaqItemPublished(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const id = String(formData.get('id') ?? '');
  const next = formData.get('published') === '1';

  const db = getDb();
  const [row] = await db
    .update(faqItems)
    .set({ published: next })
    .where(eq(faqItems.id, id))
    .returning({ id: faqItems.id });

  if (!row) back('error', 'not-found');

  published();
  back('ok', next ? 'published' : 'unpublished');
}

/**
 * Put a question on the homepage card, or take it off.
 *
 * The homepage FAQ used to be four questions hard-coded in
 * components/home/FaqSection.tsx. This flag is what replaced them, and the
 * whole point of a flag rather than a seventh section is that a question exists
 * once: the wording a visitor reads on the homepage is the wording on /faq,
 * and correcting one corrects both.
 *
 * Two rules worth stating because neither is obvious from the button:
 *
 *  - The cap counts every starred question, published or not. Counting only
 *    the live ones would let an editor star a dozen drafts and then watch
 *    publishing them silently drop the overflow, which is the failure mode a
 *    cap exists to prevent.
 *  - Starring does not publish. A featured draft is next month's homepage
 *    question lined up behind this month's; getFeaturedFaq filters on both.
 */
export async function setFaqItemFeatured(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const id = String(formData.get('id') ?? '');
  const next = formData.get('featured') === '1';

  const db = getDb();

  if (next) {
    const starred = await db
      .select({ id: faqItems.id, featuredOrder: faqItems.featuredOrder })
      .from(faqItems)
      .where(eq(faqItems.featured, true));

    /* Already starred. Not an error — a double submit, or a stale page whose
       menu still offered the item. */
    if (starred.some((r) => r.id === id)) back('ok', 'featured');
    if (starred.length >= MAX_FEATURED) back('error', 'featured-full');

    /* Appended, like a new question in its section: the homepage order is
       editorial, and a question arriving above a carefully placed one is a
       change nobody asked for. */
    const last = starred.reduce((n, r) => Math.max(n, r.featuredOrder), -1);

    const [row] = await db
      .update(faqItems)
      .set({ featured: true, featuredOrder: last + 1 })
      .where(eq(faqItems.id, id))
      .returning({ id: faqItems.id });
    if (!row) back('error', 'not-found');

    published();
    back('ok', 'featured');
  }

  /* featuredOrder is left as it was rather than cleared. It means nothing
     while featured is false, and starring the question again assigns a fresh
     position at the end regardless — so clearing it would be a write that
     changes nothing anybody can observe. Gaps in the sequence are harmless:
     only the relative order is read, and the next move renumbers the set. */
  const [row] = await db
    .update(faqItems)
    .set({ featured: false })
    .where(eq(faqItems.id, id))
    .returning({ id: faqItems.id });
  if (!row) back('error', 'not-found');

  published();
  back('ok', 'unfeatured');
}

/**
 * Move a question up or down the homepage card.
 *
 * Renumbers the whole starred set rather than swapping a pair, which is the
 * opposite of what moveFaqItem does one section below — and the difference is
 * the size of the thing being ordered. A section holds as many questions as
 * anyone cares to write, so a swap is the only write that two editors
 * reordering different pairs can both survive. The homepage holds six. Writing
 * all six leaves the sequence 0..n-1 every time, which means the duplicate
 * positions that a swap has to reason about simply cannot arise: they would
 * otherwise appear the moment two questions were starred and neither moved,
 * because both would sit at the column default.
 *
 * Ordered by featuredOrder then id, so the sequence this walks is the one the
 * page showed even before the first renumber.
 */
export async function moveFeaturedFaqItem(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const id = String(formData.get('id') ?? '');
  const direction = formData.get('direction') === 'up' ? 'up' : 'down';

  const db = getDb();
  const starred = await db
    .select({ id: faqItems.id })
    .from(faqItems)
    .where(eq(faqItems.featured, true))
    .orderBy(asc(faqItems.featuredOrder), asc(faqItems.id));

  const at = starred.findIndex((r) => r.id === id);
  if (at === -1) backToItem(id, 'error', 'not-featured');

  const to = direction === 'up' ? at - 1 : at + 1;
  /* Already at the end it was asked to move towards. The button is disabled
     there, so this is a double submit or a stale page. */
  if (to < 0 || to >= starred.length) backToItem(id, 'ok', 'featured-moved');

  const order = starred.map((r) => r.id);
  [order[at], order[to]] = [order[to], order[at]];

  await db.transaction(async (tx) => {
    await Promise.all(
      order.map((rowId, i) =>
        tx.update(faqItems).set({ featuredOrder: i }).where(eq(faqItems.id, rowId)),
      ),
    );
  });

  published();
  backToItem(id, 'ok', 'featured-moved');
}

/**
 * Move a question up or down within its section.
 *
 * Swaps sortOrder with its neighbour rather than renumbering the section, so
 * two editors reordering different pairs at the same time do not overwrite each
 * other's work. Both writes are one transaction: a half-applied swap leaves two
 * questions sharing a position, which reads as a random order.
 */
export async function moveFaqItem(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const id = String(formData.get('id') ?? '');
  const direction = formData.get('direction') === 'up' ? 'up' : 'down';

  const db = getDb();
  const [item] = await db
    .select({ id: faqItems.id, groupId: faqItems.groupId, sortOrder: faqItems.sortOrder })
    .from(faqItems)
    .where(eq(faqItems.id, id))
    .limit(1);
  if (!item) back('error', 'not-found');

  const siblings = await db
    .select({ id: faqItems.id, sortOrder: faqItems.sortOrder })
    .from(faqItems)
    .where(eq(faqItems.groupId, item.groupId))
    .orderBy(asc(faqItems.sortOrder));

  const at = siblings.findIndex((s) => s.id === item.id);
  const swapWith = direction === 'up' ? siblings[at - 1] : siblings[at + 1];
  /* Already at the end it was asked to move towards. Not an error — the button
     is disabled there, so this is a double-submit or a stale page. */
  if (!swapWith) back('ok', 'moved');

  await db.transaction(async (tx) => {
    await tx.update(faqItems).set({ sortOrder: swapWith.sortOrder }).where(eq(faqItems.id, item.id));
    await tx.update(faqItems).set({ sortOrder: item.sortOrder }).where(eq(faqItems.id, swapWith.id));
  });

  published();
  back('ok', 'moved');
}

/**
 * Remove a draft question, permanently.
 *
 * The only destructive action in the FAQ admin, fenced the same three ways as
 * deletePost. canDeleteFaqItem gates it — see the note on that function for
 * why a draft is the one thing here that may go. A published question is
 * refused, so taking a live answer off the site is always the two deliberate
 * steps "take off the FAQ page", then "remove", and no single click ever
 * destroys something a visitor was once told. The confirmation rides along as
 * a field, so a hand-rolled POST that skipped the confirm step is refused here
 * too rather than only in the markup.
 */
export async function deleteFaqItem(formData: FormData): Promise<void> {
  const user = await assertEditor();
  if (!canDeleteFaqItem(user.role)) throw new Error('forbidden');
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const id = String(formData.get('id') ?? '');
  if (formData.get('confirm') !== '1') back('error', 'not-confirmed');

  const db = getDb();
  const [row] = await db
    .select({ id: faqItems.id, published: faqItems.published })
    .from(faqItems)
    .where(eq(faqItems.id, id))
    .limit(1);
  if (!row) back('error', 'not-found');
  if (row.published) back('error', 'delete-published');

  await db.delete(faqItems).where(eq(faqItems.id, id));

  published();
  back('ok', 'removed');
}

export async function saveFaqGroup(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const id = String(formData.get('id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();

  if (!title || !slug) back('error', 'empty');
  /* The slug is the anchor the jump nav links to, so it is part of a URL. A
     space or a capital here produces a link that silently goes nowhere. */
  if (!/^[a-z][a-z-]*[a-z]$/.test(slug)) back('error', 'bad-slug');

  const db = getDb();
  const [clash] = await db
    .select({ id: faqGroups.id })
    .from(faqGroups)
    .where(and(eq(faqGroups.slug, slug), sql`${faqGroups.id} <> ${id}`))
    .limit(1);
  if (clash) back('error', 'slug-taken');

  const [row] = await db
    .update(faqGroups)
    .set({ title, slug })
    .where(eq(faqGroups.id, id))
    .returning({ id: faqGroups.id });
  if (!row) back('error', 'group-not-found');

  published();
  back('ok', 'group-saved');
}
