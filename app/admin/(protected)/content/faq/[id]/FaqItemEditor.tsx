'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api/errors';
import { faqApi, swapped, type FaqItemDetail } from '@/lib/api/faq';
import RichEditor from '../../posts/RichEditor';
import { FaqNotice, useFaqAction } from '../useFaqAction';
import styles from '../../../../admin.module.css';

export default function FaqItemEditor({
  row,
  groups,
  mayEdit,
  mayDelete,
}: {
  row: FaqItemDetail;
  groups: Array<{ id: string; title: string }>;
  mayEdit: boolean;
  mayDelete: boolean;
}) {
  const router = useRouter();
  const { busy, message, run } = useFaqAction();
  const [question, setQuestion] = useState(row.question);
  const [answer, setAnswer] = useState(row.answer);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [moveTo, setMoveTo] = useState(row.groupId);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const at = row.siblingIds.indexOf(row.id);
  const featuredAt = row.featuredIds.indexOf(row.id);
  const homepageFull = row.featuredIds.length >= row.maxFeatured;

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    void run(async () => {
      try {
        const saved = await faqApi.updateItem(row.id, { question, answer });
        /* Show what was stored — the backend cleans the answer. */
        setQuestion(saved.question);
        return row.published ? 'Saved. The FAQ page follows shortly.' : 'Saved.';
      } catch (err) {
        if (err instanceof ApiError) setFieldErrors(err.fieldErrors());
        throw err;
      }
    });
  }

  const setPublished = (published: boolean) =>
    run(async () => {
      await faqApi.updateItem(row.id, { published });
      return published
        ? 'That question is live on the FAQ page.'
        : 'That question is off the FAQ page. Nothing was deleted — its wording is kept.';
    });

  const move = (direction: 'up' | 'down') => {
    const ids = swapped(row.siblingIds, row.id, direction);
    if (ids)
      void run(async () => {
        await faqApi.reorderItems(row.groupId, ids);
        return 'Order updated.';
      });
  };

  const moveToSection = () => {
    if (moveTo === row.groupId) return;
    const title = groups.find((g) => g.id === moveTo)?.title ?? 'that section';
    void run(async () => {
      await faqApi.updateItem(row.id, { groupId: moveTo });
      return `Moved to the end of “${title}”.`;
    });
  };

  const setFeatured = (featured: boolean) =>
    run(async () => {
      await faqApi.updateItem(row.id, { featured });
      return featured
        ? 'That question is on the homepage.'
        : 'That question is off the homepage. It is still on the FAQ page.';
    });

  const moveFeatured = (direction: 'up' | 'down') => {
    const ids = swapped(row.featuredIds, row.id, direction);
    if (ids)
      void run(async () => {
        await faqApi.reorderFeatured(ids);
        return 'Homepage order updated.';
      });
  };

  const remove = () =>
    run(async () => {
      await faqApi.deleteItem(row.id);
      router.push('/admin/content/faq');
    });

  return (
    <>
      <FaqNotice message={message} />

      <section className={`${styles.panel} ${styles.section}`}>
        <div className={styles.panelHead}>
          <div>
            <h2 className={styles.panelTitle}>Question and answer</h2>
            <p className={styles.panelSub}>
              {row.published
                ? 'Live on the FAQ page. Saving updates it.'
                : 'Not on the FAQ page. Put it live when the answer is ready.'}
            </p>
          </div>
          <span className={`${styles.pill} ${row.published ? styles.pillLow : styles.pillMed}`}>
            {row.published ? 'Published' : 'Draft'}
          </span>
        </div>

        <form className={styles.stackWide} onSubmit={save}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="q">Question</label>
            <input
              className={styles.control}
              id="q"
              name="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={300}
              required
              readOnly={!mayEdit}
              aria-invalid={fieldErrors.question ? true : undefined}
              autoFocus
            />
            {fieldErrors.question && (
              <span className={styles.faqFieldError}>{fieldErrors.question}</span>
            )}
          </div>
          <div className={styles.field}>
            {/* A span, not a label: the rich editor's editable region is a div
                TipTap owns, so htmlFor would point at nothing. It is named
                with ariaLabel instead. The read-only view stays a textarea —
                an editor nobody can type into is a toolbar of dead buttons. */}
            {mayEdit ? (
              <span className={styles.fieldLabel}>Answer</span>
            ) : (
              <label className={styles.fieldLabel} htmlFor="a">Answer</label>
            )}
            {mayEdit ? (
              <RichEditor
                content={row.answer}
                name="answer"
                variant="answer"
                ariaLabel="Answer"
                placeholder="Answer the question the way you would on a call…"
                onChange={setAnswer}
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
            {fieldErrors.answer && <span className={styles.faqFieldError}>{fieldErrors.answer}</span>}
          </div>
          {mayEdit && (
            <div className={styles.rowActions} style={{ padding: 0 }}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save answer'}
              </button>
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
                Position {at + 1} of {row.siblingIds.length} in {row.group.title}
              </p>
            </div>
          </div>
          <div className={styles.rowActions}>
            <button
              className={`${styles.btn} ${styles.btnGhost}`}
              type="button"
              disabled={busy}
              onClick={() => setPublished(!row.published)}
            >
              {row.published ? 'Take off the page' : 'Put it live'}
            </button>
            <button
              className={`${styles.btn} ${styles.btnGhost}`}
              type="button"
              disabled={busy || at <= 0}
              onClick={() => move('up')}
            >
              Move up
            </button>
            <button
              className={`${styles.btn} ${styles.btnGhost}`}
              type="button"
              disabled={busy || at === row.siblingIds.length - 1}
              onClick={() => move('down')}
            >
              Move down
            </button>
          </div>
          {groups.length > 1 && (
            <div className={`${styles.rowActions} ${styles.faqPlacementSelect}`}>
              <label className={styles.fieldLabel} htmlFor="move-to">Section</label>
              <select
                className={styles.control}
                id="move-to"
                value={moveTo}
                onChange={(e) => setMoveTo(e.target.value)}
                disabled={busy}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
              <button
                className={`${styles.btn} ${styles.btnGhost}`}
                type="button"
                disabled={busy || moveTo === row.groupId}
                onClick={moveToSection}
              >
                Move to this section
              </button>
            </div>
          )}
          <p className={styles.panelFoot}>
            {row.published ? (
              <>
                A published question cannot be removed. Unpublishing takes it off the page and
                keeps its wording — the record of what the site once said is worth keeping.
              </>
            ) : mayDelete ? (
              confirmRemove ? (
                <>
                  Remove this draft for good?{' '}
                  <button
                    className={`${styles.rowLink} ${styles.rowLinkDanger}`}
                    type="button"
                    disabled={busy}
                    onClick={() => void remove()}
                  >
                    {busy ? 'Removing…' : 'Confirm remove'}
                  </button>{' '}
                  <button
                    className={styles.rowLink}
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmRemove(false)}
                  >
                    Keep it
                  </button>
                </>
              ) : (
                <>
                  This is a draft, so it has never been on the site.{' '}
                  <button
                    className={`${styles.rowLink} ${styles.rowLinkDanger}`}
                    type="button"
                    onClick={() => setConfirmRemove(true)}
                  >
                    Remove this draft
                  </button>
                </>
              )
            ) : (
              <>This is a draft, so it has never been on the site.</>
            )}
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
                  ? `The homepage card holds ${row.maxFeatured} questions — ${row.featuredIds.length} chosen so far.`
                  : `Position ${featuredAt + 1} of ${row.featuredIds.length} on the homepage card.`}
              </p>
            </div>
            {featuredAt !== -1 && (
              <span className={`${styles.pill} ${styles.pillHome}`}>On the homepage</span>
            )}
          </div>

          <div className={styles.rowActions}>
            <button
              className={`${styles.btn} ${styles.btnGhost}`}
              type="button"
              /* Disabled rather than left to fail: the backend refuses a
                 seventh star. */
              disabled={busy || (featuredAt === -1 && homepageFull)}
              onClick={() => setFeatured(featuredAt === -1)}
            >
              {featuredAt === -1 ? 'Show on the homepage' : 'Take off the homepage'}
            </button>

            {featuredAt !== -1 && (
              <>
                <button
                  className={`${styles.btn} ${styles.btnGhost}`}
                  type="button"
                  disabled={busy || featuredAt === 0}
                  onClick={() => moveFeatured('up')}
                >
                  Move up
                </button>
                <button
                  className={`${styles.btn} ${styles.btnGhost}`}
                  type="button"
                  disabled={busy || featuredAt === row.featuredIds.length - 1}
                  onClick={() => moveFeatured('down')}
                >
                  Move down
                </button>
              </>
            )}
          </div>

          <p className={styles.panelFoot}>
            {featuredAt === -1 && homepageFull ? (
              <>
                All {row.maxFeatured} places are taken. Take one of the others off the homepage
                first — none of them is deleted by that, they stay on <code>/faq</code> either
                way.
              </>
            ) : featuredAt !== -1 && !row.published ? (
              <>
                Chosen, but not live: this question is a draft, so the homepage skips it. Put it
                live above and it appears in this position.
              </>
            ) : (
              <>
                The homepage shows the same wording as <code>/faq</code> — there is one copy of
                this answer, not two. Its position here is separate from its position in its
                section.
              </>
            )}
          </p>
        </section>
      )}
    </>
  );
}
