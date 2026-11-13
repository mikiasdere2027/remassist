'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import ArticleView, { type ArticleViewPost } from '@/app/(site)/blog/[slug]/ArticleView';
import { parseArticleLayout } from '@/lib/blog/article-layout';
import styles from '../../../admin.module.css';

/**
 * Preview: the post as the blog will render it, from the form as it stands.
 *
 * It renders the same ArticleView the public route does, so what is on screen
 * here is the article template rather than an admin impression of it. Values
 * come from the form's live state, which is the reason this is a modal over
 * the editor instead of a link to a page: a preview of the *saved* row would
 * show yesterday's draft to somebody who has been typing for ten minutes, and
 * previewing by saving first would push edits onto a published article just
 * because its author wanted to look at them.
 *
 * The body is the one value that cannot be trusted straight from the client.
 * It goes to the backend (POST /v1/admin/posts/preview) and comes back through
 * the same allowlist a save applies, so this render is as clean as the
 * published one. Nothing is written. Until it comes back the panel
 * says so; if the request fails, the preview says the body could not be
 * checked and shows the rest, rather than quietly dropping the article.
 */
export default function PreviewModal({
  post,
  bodyHtml,
  articleLayout,
  onClose,
}: {
  post: ArticleViewPost;
  bodyHtml: string;
  articleLayout: string;
  onClose: () => void;
}) {
  const [clean, setClean] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  /* Escape closes, and the page behind must not scroll while it is open. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  useEffect(() => {
    let live = true;
    api
      .post<{ html: string }>('/admin/posts/preview', { html: bodyHtml })
      .then(({ html }) => {
        if (live) setClean(html);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [bodyHtml]);

  return (
    <div
      className={styles.previewOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="Post preview"
    >
      <div className={styles.previewBar}>
        <span className={styles.previewBarNote}>
          <strong>Preview</strong> — how this post will look on the blog. Nothing here is saved.
        </span>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>
          Close preview
        </button>
      </div>

      <div className={styles.previewScroll}>
        {failed && (
          <p className={styles.previewProblem} role="status">
            The article body could not be checked, so it is not shown. Everything else below is
            your current draft.
          </p>
        )}
        <div className={styles.previewPage}>
          <ArticleView post={post} bodyHtml={clean ?? ''} layout={parseArticleLayout(articleLayout)} preview />
        </div>
        {clean === null && !failed && (
          <p className={styles.previewProblem} role="status">
            Checking the article body…
          </p>
        )}
      </div>
    </div>
  );
}
