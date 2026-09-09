import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { reviewSources, reviews } from '@/db/schema';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { SOURCE_LABEL } from '../display';
import { moveReview, saveReview, setReviewPublished } from '../actions';
import { reviewMessage } from '../messages';
import AdminTopbar from '../../../AdminTopbar';
import styles from '../../../../admin.module.css';

/**
 * Edit one review.
 *
 * The list at /admin/content/reviews used to carry a form per row, which put a
 * text box under every quote as the resting state of the screen. Editing now
 * lives here, behind the edit button, and this page is built around the one
 * task that brings anybody to it: comparing a row against the original.
 *
 * Hence the two things this page has that the old inline form did not. The
 * quote is shown as the public page renders it, above the fields, so the
 * comparison is against what visitors see rather than against a textarea. And
 * the source profile opens in one click, because a correction that is not
 * checked against the source is a guess.
 *
 * Every field's label says what the source prints, not what the field means to
 * us — "Date, exactly as the source prints it" rather than "Date". These are
 * transcription boxes. A label that reads like a content field invites somebody
 * to improve the wording, and improving somebody else's testimonial is
 * fabricating one.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit review',
  robots: { index: false, follow: false },
};

export default async function EditReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [user, { id }, sp] = await Promise.all([requireUser(), params, searchParams]);
  const message = reviewMessage(sp.ok, sp.error);
  const mayEdit = canEditContent(user.role);

  if (!isDatabaseConfigured()) notFound();

  const db = getDb();
  const [row] = await db
    .select({
      id: reviews.id,
      source: reviews.source,
      author: reviews.author,
      meta: reviews.meta,
      dateText: reviews.dateText,
      headline: reviews.headline,
      body: reviews.body,
      rating: reviews.rating,
      published: reviews.published,
      sortOrder: reviews.sortOrder,
    })
    .from(reviews)
    .innerJoin(reviewSources, eq(reviews.source, reviewSources.source))
    .where(eq(reviews.id, id))
    .limit(1);

  if (!row) notFound();

  const label = SOURCE_LABEL[row.source] ?? row.source;

  /* Needed to know whether this is the first or last in its source, so the
     move controls can be disabled at the ends rather than failing silently. */
  const siblings = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.source, row.source))
    .orderBy(asc(reviews.sortOrder));
  const at = siblings.findIndex((s) => s.id === row.id);

  return (
    <>
      <AdminTopbar
        title="Edit review"
        subtitle={
          <>
            By <strong>{row.author}</strong> on {label}
          </>
        }
        action={
          <Link
            className={`${styles.btn} ${styles.btnGhost}`}
            href={`/admin/content/reviews?tab=${row.source}`}
          >
            ← All {label} reviews
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

        {/* The fields, with Placement in a narrow column on the right. The
            "On the page now" preview was dropped — the list card and the
            source profile are both one click away, and the eye should land on
            the boxes being corrected. */}
        <div className={styles.reviewEditGrid}>
        <section className={`${styles.panel} ${styles.section}`}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>What {label} printed</h2>
              <p className={styles.panelSub}>
                For correcting a transcription error. Not for improving the wording.
              </p>
            </div>
          </div>

          <form className={styles.stackWide} action={saveReview}>
            <input type="hidden" name="id" value={row.id} />

            <div className={styles.inviteRow} style={{ padding: 0 }}>
              <div className={`${styles.field} ${styles.grow}`}>
                <label className={styles.fieldLabel} htmlFor="au">
                  Author, as {label} prints it
                </label>
                <input
                  className={styles.control}
                  id="au"
                  name="author"
                  defaultValue={row.author}
                  maxLength={200}
                  required
                  readOnly={!mayEdit}
                  autoFocus
                />
              </div>
              <div className={`${styles.field} ${styles.grow}`}>
                <label className={styles.fieldLabel} htmlFor="me">
                  Meta — what {label} prints under the name
                </label>
                <input
                  className={styles.control}
                  id="me"
                  name="meta"
                  defaultValue={row.meta}
                  maxLength={200}
                  readOnly={!mayEdit}
                />
              </div>
            </div>

            <div className={styles.inviteRow} style={{ padding: 0 }}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="dt">
                  {/* Google publishes "7 months ago" rather than a date, and
                      turning that into one would be us asserting something the
                      source did not. See db/schema/content.ts. */}
                  Date, exactly as {label} prints it
                </label>
                <input
                  className={styles.control}
                  id="dt"
                  name="dateText"
                  defaultValue={row.dateText}
                  maxLength={200}
                  required
                  readOnly={!mayEdit}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="ra">Rating</label>
                <input
                  className={styles.control}
                  id="ra"
                  name="rating"
                  type="number"
                  min={1}
                  max={5}
                  defaultValue={row.rating}
                  required
                  readOnly={!mayEdit}
                />
              </div>
              <div className={`${styles.field} ${styles.grow}`}>
                <label className={styles.fieldLabel} htmlFor="hd">
                  Headline — Trustpilot only
                  {row.source !== 'trustpilot' && (
                    <span className={styles.tag}>Google prints none</span>
                  )}
                </label>
                <input
                  className={styles.control}
                  id="hd"
                  name="headline"
                  defaultValue={row.headline ?? ''}
                  maxLength={200}
                  readOnly={!mayEdit}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="bd">Review text, verbatim</label>
              <textarea
                className={styles.textarea}
                id="bd"
                name="body"
                defaultValue={row.body}
                rows={8}
                maxLength={4000}
                required
                readOnly={!mayEdit}
              />
            </div>

            {mayEdit && (
              <div className={styles.rowActions} style={{ padding: 0 }}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit">
                  Save review
                </button>
                <span className={styles.panelNote}>Saving returns you to the list</span>
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
                  Position {at + 1} of {siblings.length} among the {label} reviews
                </p>
              </div>
            </div>
            {/* from=item keeps you here after a hide or a move, so a second
                move does not need a round trip through the list. */}
            <div className={styles.rowActions}>
              <form action={setReviewPublished}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="from" value="item" />
                <input type="hidden" name="published" value={row.published ? '0' : '1'} />
                <button className={`${styles.btn} ${styles.btnGhost}`} type="submit">
                  {row.published ? 'Hide from the page' : 'Show on the page'}
                </button>
              </form>
              <form action={moveReview}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="from" value="item" />
                <input type="hidden" name="direction" value="up" />
                <button
                  className={`${styles.btn} ${styles.btnGhost}`}
                  type="submit"
                  disabled={at === 0}
                >
                  Move up
                </button>
              </form>
              <form action={moveReview}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="from" value="item" />
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
              There is no delete. Hiding takes a review off the page and keeps its wording — with
              somebody else&rsquo;s words, the record of what the site once quoted them as saying
              is the thing most worth keeping.
            </p>
          </section>
        )}
        </div>
      </div>
    </>
  );
}
