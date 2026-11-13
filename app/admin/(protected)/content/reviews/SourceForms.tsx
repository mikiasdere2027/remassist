'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  reviewErrorText,
  reviewsApi,
  type AdminReviewSource,
} from '@/lib/api/reviews';
import { ApiError } from '@/lib/api/errors';
import InfoTooltip from '../../InfoTooltip';
import { SOURCE_LABEL } from './display';
import styles from '../../../admin.module.css';

/**
 * The Sources tab: the figures the review cards are printed under.
 *
 * Read-only for a viewer rather than hidden from them. The star score and the
 * footnote explain what is on the public page, so somebody who cannot change
 * them still needs to be able to read them.
 */
export default function SourceForms({
  sources,
  mayEdit,
}: {
  sources: AdminReviewSource[];
  mayEdit: boolean;
}) {
  return (
    <div className={styles.sourcesGrid}>
      {sources.map((s) => (
        <SourceForm key={s.source} source={s} mayEdit={mayEdit} />
      ))}
    </div>
  );
}

function SourceForm({ source: s, mayEdit }: { source: AdminReviewSource; mayEdit: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const label = SOURCE_LABEL[s.source] ?? s.source;

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setMessage(null);
    setErrors({});
    try {
      await reviewsApi.updateSource(s.source, {
        url: String(form.get('url') ?? '').trim(),
        ratingLabel: String(form.get('ratingLabel') ?? '').trim(),
        stars: Number(form.get('stars')),
        footnote: String(form.get('footnote') ?? '').trim() || null,
      });
      setMessage({ tone: 'ok', text: 'Source details saved.' });
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors());
      setMessage({ tone: 'err', text: reviewErrorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${styles.panel} ${styles.section}`}>
      <div className={styles.panelHead}>
        <div>
          <h2 className={styles.panelTitle}>{label}</h2>
          <p className={styles.panelSub}>What the reviews page prints above the {label} cards</p>
        </div>
        {/* Grouped with the link so the head keeps two items: title on the
            left, what-and-where on the right. */}
        <span className={styles.panelHeadNote}>
          <a className={styles.rowLink} href={s.url} target="_blank" rel="noreferrer noopener">
            Open the profile ↗
          </a>
          <InfoTooltip
            text="These are the figures the source publishes, not our summary of the cards — the score worded as it words it, and the footnote every card is read against. The profile link has to resolve: a testimonial citing a source nobody can follow is just a claim."
            position="bottom-left"
            maxWidth={300}
          />
        </span>
      </div>

      <form className={styles.stackWide} onSubmit={save}>
        {message && (
          <p
            className={`${styles.signinMsg} ${message.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
            role={message.tone === 'ok' ? 'status' : 'alert'}
          >
            {message.text}
          </p>
        )}
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`u-${s.source}`}>
            {/* Required and validated as a real http(s) URL by the API: a
                testimonial section citing a source nobody can follow is just a
                claim. */}
            Link to the source profile
          </label>
          <input
            className={styles.control}
            id={`u-${s.source}`}
            name="url"
            type="url"
            defaultValue={s.url}
            required
            readOnly={!mayEdit}
          />
          {errors.url && <p className={styles.fieldErr}>{errors.url}</p>}
        </div>
        <div className={styles.inviteRow} style={{ padding: 0 }}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`rl-${s.source}`}>
              Rating label, as {label} words it
            </label>
            <input
              className={styles.control}
              id={`rl-${s.source}`}
              name="ratingLabel"
              defaultValue={s.ratingLabel}
              maxLength={200}
              required
              readOnly={!mayEdit}
            />
            {errors.ratingLabel && <p className={styles.fieldErr}>{errors.ratingLabel}</p>}
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`st-${s.source}`}>Stars</label>
            <input
              className={styles.control}
              id={`st-${s.source}`}
              name="stars"
              type="number"
              min={1}
              max={5}
              defaultValue={s.stars}
              required
              readOnly={!mayEdit}
            />
            {errors.stars && <p className={styles.fieldErr}>{errors.stars}</p>}
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`fn-${s.source}`}>
            Footnote — anything the reader needs in order to read the cards correctly
          </label>
          <textarea
            className={styles.textarea}
            id={`fn-${s.source}`}
            name="footnote"
            rows={3}
            maxLength={4000}
            defaultValue={s.footnote ?? ''}
            readOnly={!mayEdit}
          />
          {errors.footnote && <p className={styles.fieldErr}>{errors.footnote}</p>}
        </div>
        {mayEdit && (
          <div className={styles.rowActions} style={{ padding: 0 }}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={busy}>
              {busy ? 'Saving…' : `Save ${label} details`}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
