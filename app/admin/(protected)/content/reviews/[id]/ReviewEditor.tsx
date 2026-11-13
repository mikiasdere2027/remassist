'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api/errors';
import {
  moveId,
  reviewErrorText,
  reviewsApi,
  type AdminReviewDetail,
} from '@/lib/api/reviews';
import { SOURCE_LABEL } from '../display';
import styles from '../../../../admin.module.css';

type Message = { tone: 'ok' | 'err'; text: string } | null;

/**
 * The fields and the Placement panel of one review. Every action calls the API
 * and refreshes the server data; a refused save keeps what was typed.
 */
export default function ReviewEditor({
  review: row,
  mayEdit,
}: {
  review: AdminReviewDetail;
  mayEdit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const label = SOURCE_LABEL[row.source] ?? row.source;

  const siblings = row.siblingIds;
  const at = siblings.indexOf(row.id);

  async function run(action: () => Promise<string>) {
    setBusy(true);
    setMessage(null);
    setErrors({});
    try {
      setMessage({ tone: 'ok', text: await action() });
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors());
      setMessage({ tone: 'err', text: reviewErrorText(err) });
    } finally {
      setBusy(false);
    }
  }

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (k: string) => String(form.get(k) ?? '').trim();
    return run(async () => {
      await reviewsApi.update(row.id, {
        author: text('author'),
        meta: text('meta'),
        dateText: text('dateText'),
        headline: text('headline') || null,
        body: text('body'),
        rating: Number(form.get('rating')),
      });
      return 'Saved.';
    });
  }

  const togglePublished = () =>
    run(async () => {
      await reviewsApi.setPublished(row.id, !row.published);
      return row.published
        ? 'That review is hidden. Nothing was deleted — the wording is kept.'
        : 'That review is on the reviews page.';
    });

  const move = (by: -1 | 1) =>
    run(async () => {
      await reviewsApi.reorder(moveId(siblings, at, at + by));
      return 'Order updated.';
    });

  const err = (k: string) => errors[k] && <p className={styles.fieldErr}>{errors[k]}</p>;

  return (
    <div className={styles.view}>
      {message && (
        <p
          className={`${styles.signinMsg} ${message.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
          role={message.tone === 'ok' ? 'status' : 'alert'}
        >
          {message.text}
        </p>
      )}

      {/* The fields, with Placement in a narrow column on the right. */}
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

          <form className={styles.stackWide} onSubmit={save}>
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
                {err('author')}
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
                {err('meta')}
              </div>
            </div>

            <div className={styles.inviteRow} style={{ padding: 0 }}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="dt">
                  {/* Google publishes "7 months ago" rather than a date, and
                      turning that into one would be us asserting something the
                      source did not. */}
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
                {err('dateText')}
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
                {err('rating')}
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
                {err('headline')}
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
              {err('body')}
            </div>

            {mayEdit && (
              <div className={styles.rowActions} style={{ padding: 0 }}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Save review'}
                </button>
                <span className={styles.panelNote}>The public page updates as soon as you save</span>
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
            <div className={styles.rowActions}>
              <button
                className={`${styles.btn} ${styles.btnGhost}`}
                type="button"
                disabled={busy}
                onClick={togglePublished}
              >
                {row.published ? 'Hide from the page' : 'Show on the page'}
              </button>
              <button
                className={`${styles.btn} ${styles.btnGhost}`}
                type="button"
                disabled={busy || at <= 0}
                onClick={() => move(-1)}
              >
                Move up
              </button>
              <button
                className={`${styles.btn} ${styles.btnGhost}`}
                type="button"
                disabled={busy || at === -1 || at === siblings.length - 1}
                onClick={() => move(1)}
              >
                Move down
              </button>
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
  );
}
