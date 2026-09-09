'use client';

import { useActionState, useState } from 'react';
import { addReview } from '../actions';
import { REVIEW_ERR } from '../messages';
import { SOURCE_LABEL } from '../display';
import ReviewSourcePicker from './SourcePicker';
import styles from '../../../../admin.module.css';

/**
 * The Add review form.
 *
 * A client component and, more importantly, a `useActionState` form: the
 * action returns the error to this mounted form instead of redirecting back
 * to a freshly-rendered page. Redirecting on a failed save is how a typed
 * quote gets thrown away — the fix the popup editor learned first. The error
 * shows above the fields, everything the editor typed stays put, and fixing
 * the one bad field is the only thing left to do.
 *
 * The source is owned here (not just inside ReviewSourcePicker) so the
 * helper text beside each field follows whichever source is selected. The
 * headline field is shown for Trustpilot and explained away for Google, the
 * same rule the picker already applied.
 */

export default function NewReviewForm({
  sources,
  initialSource,
  canEdit,
}: {
  sources: Array<{ source: string }>;
  initialSource: string;
  canEdit: boolean;
}) {
  const [source, setSource] = useState(initialSource);
  const [author, setAuthor] = useState('');
  const [meta, setMeta] = useState('');
  const [dateText, setDateText] = useState('');
  const [rating, setRating] = useState('5');
  const [body, setBody] = useState('');

  const [actionState, formAction, isPending] = useActionState(addReview, { error: undefined });
  const submitError =
    actionState.error && actionState.error in REVIEW_ERR
      ? REVIEW_ERR[actionState.error as keyof typeof REVIEW_ERR]
      : null;

  const label = SOURCE_LABEL[source] ?? source;

  return (
    <form action={formAction}>
      {submitError && (
        <p className={`${styles.signinMsg} ${styles.msgErr}`} role="status">
          {submitError}
        </p>
      )}

      <ReviewSourcePicker
        sources={sources}
        value={source}
        onChange={(next) => setSource(next)}
      />

      <div className={styles.formGrid2}>
        <div className={styles.memberFieldGroup}>
          <label className={styles.memberFieldLabel} htmlFor="nau">Author</label>
          <input
            className={styles.memberFieldInput}
            id="nau"
            name="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={200}
            required
            readOnly={!canEdit}
          />
          <span className={styles.memberFieldHelper}>
            Exactly as {label} prints the name
          </span>
        </div>
        <div className={styles.memberFieldGroup}>
          <label className={styles.memberFieldLabel} htmlFor="nme">Meta (optional)</label>
          <input
            className={styles.memberFieldInput}
            id="nme"
            name="meta"
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            maxLength={200}
            readOnly={!canEdit}
          />
          <span className={styles.memberFieldHelper}>
            Whatever it prints under the name
          </span>
        </div>
      </div>

      <div className={styles.formGrid2}>
        <div className={styles.memberFieldGroup}>
          <label className={styles.memberFieldLabel} htmlFor="ndt">Date</label>
          <input
            className={styles.memberFieldInput}
            id="ndt"
            name="dateText"
            value={dateText}
            onChange={(e) => setDateText(e.target.value)}
            maxLength={200}
            required
            readOnly={!canEdit}
          />
          {/* Stored as the source's own text, not a date: "3 days ago"
              is what the reader would see if they went and looked. */}
          <span className={styles.memberFieldHelper}>
            Exactly as {label} prints it
          </span>
        </div>
        <div className={styles.memberFieldGroup}>
          <label className={styles.memberFieldLabel} htmlFor="nra">Rating</label>
          <input
            className={styles.memberFieldInput}
            id="nra"
            name="rating"
            type="number"
            min={1}
            max={5}
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            required
            readOnly={!canEdit}
          />
          <span className={styles.memberFieldHelper}>Stars out of five</span>
        </div>
      </div>

      <div className={styles.memberFieldGroup}>
        <label className={styles.memberFieldLabel} htmlFor="nbd">Review text</label>
        <textarea
          className={styles.memberTextarea}
          id="nbd"
          name="body"
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={4000}
          required
          readOnly={!canEdit}
        />
        <span className={styles.memberFieldHelper}>
          Copied verbatim from {label} — including the typos
        </span>
      </div>

      {canEdit ? (
        <div className={styles.memberSubmitRow}>
          <button className={styles.memberSubmitBtn} type="submit" disabled={isPending}>
            Add review
          </button>
          <span className={styles.memberSubmitNote}>
            Added hidden — publish from the list once you have checked it.
          </span>
        </div>
      ) : (
        <p className={styles.memberSubmitNote}>Only an editor may add a review.</p>
      )}
    </form>
  );
}