'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { reviewErrorText, reviewsApi, type AdminReview } from '@/lib/api/reviews';
import { Stars, initials } from './display';
import ReviewRowMenu from './RowMenu';
import styles from '../../../admin.module.css';

/**
 * The review cards of one source, with the Show/Hide row action. Client-side
 * so a flip goes straight to the API and the server data is refreshed after.
 */
export default function ReviewList({
  items,
  mayEdit,
}: {
  items: AdminReview[];
  mayEdit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  async function toggle(r: AdminReview) {
    setBusy(true);
    setMessage(null);
    try {
      await reviewsApi.setPublished(r.id, !r.published);
      setMessage({
        tone: 'ok',
        text: r.published
          ? 'That review is hidden. Nothing was deleted — the wording is kept.'
          : 'That review is on the reviews page.',
      });
      router.refresh();
    } catch (err) {
      setMessage({ tone: 'err', text: reviewErrorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {message && (
        <p
          className={`${styles.signinMsg} ${message.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
          role={message.tone === 'ok' ? 'status' : 'alert'}
        >
          {message.text}
        </p>
      )}

      {items.map((r) => (
        <div className={styles.review} key={r.id}>
          <span
            className={`${styles.avatar} ${r.source === 'google' ? styles.avatarAlt : ''}`}
            aria-hidden="true"
          >
            {initials(r.author)}
          </span>

          <div className={styles.reviewMain}>
            <Stars rating={r.rating} />
            {r.headline && <p className={styles.reviewHead}>{r.headline}</p>}
            <p className={styles.reviewText}>&ldquo;{r.body}&rdquo;</p>
            <div className={styles.reviewMeta}>
              <b>{r.author}</b>
              {r.meta && <span>{r.meta}</span>}
              <span aria-hidden="true">·</span>
              <span>{r.dateText}</span>
              <span className={`${styles.pill} ${r.published ? styles.pillLow : styles.pillMed}`}>
                {r.published ? 'Published' : 'Hidden'}
              </span>
            </div>
          </div>

          {mayEdit && (
            <ReviewRowMenu
              id={r.id}
              author={r.author}
              published={r.published}
              busy={busy}
              onToggle={() => toggle(r)}
            />
          )}
        </div>
      ))}
    </>
  );
}
