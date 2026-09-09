import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { faqGroups, faqItems } from '@/db/schema';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { MAX_FEATURED } from '@/lib/faq/content';
import {
  moveFaqItem,
  moveFeaturedFaqItem,
  saveFaqItem,
  setFaqItemFeatured,
  setFaqItemPublished,
} from '../actions';
import { faqMessage } from '../messages';
import RichEditor from '../../posts/RichEditor';
import AdminTopbar from '../../../AdminTopbar';
import styles from '../../../../admin.module.css';

/**
 * Edit one FAQ answer.
 *
 * The list at /admin/content/faq used to carry a form per row, which meant 29
 * textareas on one page. The prototype's design is a scannable list with
 * editing behind an edit button, and at 29 questions that is plainly the right
 * shape: the list now shows every question in roughly the space three forms
 * took.
 *
 * The cost is a page load between seeing a question and changing it. Worth it
 * here, and it buys something back — one form on screen means one thing can be
 * unsaved, rather than 29.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit answer',
  robots: { index: false, follow: false },
};

export default async function EditFaqItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [user, { id }, sp] = await Promise.all([requireUser(), params, searchParams]);
  const message = faqMessage(sp.ok, sp.error);
  const mayEdit = canEditContent(user.role);

  if (!isDatabaseConfigured()) notFound();

  const db = getDb();
  const [row] = await db
    .select({
      id: faqItems.id,
      question: faqItems.question,
      answer: faqItems.answer,
      published: faqItems.published,
      featured: faqItems.featured,
      sortOrder: faqItems.sortOrder,
      groupId: faqItems.groupId,
      groupTitle: faqGroups.title,
      groupSlug: faqGroups.slug,
    })
    .from(faqItems)
    .innerJoin(faqGroups, eq(faqItems.groupId, faqGroups.id))
    .where(eq(faqItems.id, id))
    .limit(1);

  if (!row) notFound();

  /* Needed to know whether this is the first or last in its section, so the
     move controls can be disabled at the ends rather than failing silently.
     The starred set is fetched for the same reason one panel down, and because
     the Show-on-the-homepage button has to know whether there is a place left
     before it offers one. */
  const [siblings, starred] = await Promise.all([
    db
      .select({ id: faqItems.id })
      .from(faqItems)
      .where(eq(faqItems.groupId, row.groupId))
      .orderBy(asc(faqItems.sortOrder)),
    db
      .select({ id: faqItems.id })
      .from(faqItems)
      .where(eq(faqItems.featured, true))
      .orderBy(asc(faqItems.featuredOrder), asc(faqItems.id)),
  ]);
  const at = siblings.findIndex((s) => s.id === row.id);
  const featuredAt = starred.findIndex((s) => s.id === row.id);
  const homepageFull = starred.length >= MAX_FEATURED;

  return (
    <>
      <AdminTopbar
        title="Edit answer"
        subtitle={
          <>
            In <strong>{row.groupTitle}</strong> · shown on{' '}
            <code>/faq#{row.groupSlug}</code>
          </>
        }
        action={
          <Link className={`${styles.btn} ${styles.btnGhost}`} href="/admin/content/faq">
            ← All questions
          </Link>
        }
      />

      <div className={styles.view}>
        {message && (
          <p
            className={`${styles.signinMsg} ${message.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
            role="status"
          >
            {message.text}
          </p>
        )}

        <section className={`${styles.panel} ${styles.section}`}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Question and answer</h2>
              <p className={styles.panelSub}>
                {row.published
                  ? 'Live on the FAQ page. Saving revalidates it immediately.'
                  : 'Not on the FAQ page. Put it live when the answer is ready.'}
              </p>
            </div>
            <span className={`${styles.pill} ${row.published ? styles.pillLow : styles.pillMed}`}>
              {row.published ? 'Published' : 'Draft'}
            </span>
          </div>

          <form className={styles.stackWide} action={saveFaqItem}>
            <input type="hidden" name="id" value={row.id} />
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="q">Question</label>
              <input
                className={styles.control}
                id="q"
                name="question"
                defaultValue={row.question}
                maxLength={300}
                required
                readOnly={!mayEdit}
                autoFocus
              />
            </div>
            <div className={styles.field}>
              {/* A span, not a label: the rich editor's editable region is a div
                  TipTap owns, so htmlFor would point at nothing. It is named
                  with ariaLabel instead. The read-only textarea keeps a real
                  label, because it has a real id to point at. */}
              {mayEdit ? (
                <span className={styles.fieldLabel}>Answer</span>
              ) : (
                <label className={styles.fieldLabel} htmlFor="a">Answer</label>
              )}
              {/* Rich text for anyone who may edit; the read-only view stays a
                  textarea, because an editor nobody can type into is a
                  toolbar of dead buttons. It shows the stored markup, which is
                  the honest thing for a view that cannot render it. */}
              {mayEdit ? (
                <RichEditor
                  content={row.answer}
                  name="answer"
                  variant="answer"
                  ariaLabel="Answer"
                  placeholder="Answer the question the way you would on a call…"
                />
              ) : (
                <textarea
                  className={styles.textarea}
                  id="a"
                  name="answer"
                  defaultValue={row.answer}
                  rows={10}
                  readOnly
                />
              )}
            </div>
            {mayEdit && (
              <div className={styles.rowActions} style={{ padding: 0 }}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit">
                  Save answer
                </button>
                <span className={styles.panelNote}>
                  Saving returns you to the list
                </span>
              </div>
            )}
          </form>
        </section>

        {mayEdit && (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Placement</h2>
                <p className={styles.panelSub}>
                  Position {at + 1} of {siblings.length} in {row.groupTitle}
                </p>
              </div>
            </div>
            <div className={styles.rowActions}>
              <form action={setFaqItemPublished}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="published" value={row.published ? '0' : '1'} />
                <button className={`${styles.btn} ${styles.btnGhost}`} type="submit">
                  {row.published ? 'Take off the page' : 'Put it live'}
                </button>
              </form>
              <form action={moveFaqItem}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="direction" value="up" />
                <button
                  className={`${styles.btn} ${styles.btnGhost}`}
                  type="submit"
                  disabled={at === 0}
                >
                  Move up
                </button>
              </form>
              <form action={moveFaqItem}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="direction" value="down" />
                <button
                  className={`${styles.btn} ${styles.btnGhost}`}
                  type="submit"
                  disabled={at === siblings.length - 1}
                >
                  Move down
                </button>
              </form>
            </div>
            <p className={styles.panelFoot}>
              {/* Stated because the absence of a delete button is a decision,
                  not an omission. */}
              There is no delete. Unpublishing takes a question off the page and keeps its
              wording — the record of what the site once said is worth keeping.
            </p>
          </section>
        )}

        {mayEdit && (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Homepage</h2>
                <p className={styles.panelSub}>
                  {featuredAt === -1
                    ? `The homepage card holds ${MAX_FEATURED} questions — ${starred.length} chosen so far.`
                    : `Position ${featuredAt + 1} of ${starred.length} on the homepage card.`}
                </p>
              </div>
              {featuredAt !== -1 && (
                <span className={`${styles.pill} ${styles.pillHome}`}>On the homepage</span>
              )}
            </div>

            <div className={styles.rowActions}>
              <form action={setFaqItemFeatured}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="featured" value={featuredAt === -1 ? '1' : '0'} />
                <button
                  className={`${styles.btn} ${styles.btnGhost}`}
                  type="submit"
                  /* Disabled rather than left to fail: setFaqItemFeatured
                     refuses a seventh, and a button whose only outcome is an
                     error message is a button that should not be pressable. */
                  disabled={featuredAt === -1 && homepageFull}
                >
                  {featuredAt === -1 ? 'Show on the homepage' : 'Take off the homepage'}
                </button>
              </form>

              {featuredAt !== -1 && (
                <>
                  <form action={moveFeaturedFaqItem}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      className={`${styles.btn} ${styles.btnGhost}`}
                      type="submit"
                      disabled={featuredAt === 0}
                    >
                      Move up
                    </button>
                  </form>
                  <form action={moveFeaturedFaqItem}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      className={`${styles.btn} ${styles.btnGhost}`}
                      type="submit"
                      disabled={featuredAt === starred.length - 1}
                    >
                      Move down
                    </button>
                  </form>
                </>
              )}
            </div>

            <p className={styles.panelFoot}>
              {featuredAt === -1 && homepageFull ? (
                <>
                  All {MAX_FEATURED} places are taken. Take one of the others off the homepage
                  first — none of them is deleted by that, they stay on{' '}
                  <code>/faq</code> either way.
                </>
              ) : featuredAt !== -1 && !row.published ? (
                <>
                  Chosen, but not live: this question is a draft, so the homepage skips it.
                  Put it live above and it appears in this position.
                </>
              ) : (
                <>
                  The homepage shows the same wording as <code>/faq</code> — there is one copy
                  of this answer, not two. Its position here is separate from its position in
                  its section.
                </>
              )}
            </p>
          </section>
        )}
      </div>
    </>
  );
}
