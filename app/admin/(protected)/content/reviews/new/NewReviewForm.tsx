'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api/errors';
import { reviewErrorText, reviewsApi, type ReviewSourceKey } from '@/lib/api/reviews';
import { SOURCE_LABEL } from '../display';
import ReviewSourcePicker from './SourcePicker';
import styles from '../../../../admin.module.css';

/**
 * The Add review form.
 *
 * A client component that posts to the API: a refused save shows its error
 * above the fields (and beside the one at fault), everything the editor typed
 * stays put, and fixing the one bad field is the only thing left to do. A
 * successful add goes back to the list, on the tab of the new review's source.
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
  const [headline, setHeadline] = useState('');

  const router = useRouter();
  const [isPending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setSubmitError(null);
    setErrors({});
    try {
      await reviewsApi.create({
        source: source as ReviewSourceKey,
        author: author.trim(),
        meta: meta.trim(),
        dateText: dateText.trim(),
        // Trustpilot only: Google prints none, so nothing is sent for it.
        headline: source === 'trustpilot' ? headline.trim() || null : null,
        body: body.trim(),
        rating: Number(rating),
      });
      router.push(`/admin/content/reviews?tab=${source}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors());
      setSubmitError(reviewErrorText(err));
      setPending(false);
    }
  }

  const err = (k: string) =>
    errors[k] && <span className={styles.fieldErr}>{errors[k]}</span>;

  const label = SOURCE_LABEL[source] ?? source;

  return (
    <form onSubmit={submit}>
      {submitError && (
        <p className={`${styles.signinMsg} ${styles.msgErr}`} role="alert">
          {submitError}
        </p>
      )}

      <ReviewSourcePicker
        sources={sources}
        value={source}
        onChange={(next) => setSource(next)}
        headline={headline}
        onHeadlineChange={setHeadline}
        headlineError={errors.headline}
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
          {err('author')}
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
          {err('meta')}
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
          {err('dateText')}
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
          {err('rating')}
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
          {err('body')}
      </div>

      {canEdit ? (
        <div className={styles.memberSubmitRow}>
          <button className={styles.memberSubmitBtn} type="submit" disabled={isPending}>
            {isPending ? 'Adding…' : 'Add review'}
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