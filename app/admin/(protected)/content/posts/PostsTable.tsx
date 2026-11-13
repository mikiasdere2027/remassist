'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useState, type FormEvent, type ReactNode } from 'react';
import { api } from '@/lib/api/client';
import { publishMissing, type AdminPostRow } from '@/lib/api/posts';
import { listFields } from '@/lib/blog/completeness';
import { formatDate, formatRelativeTime } from '@/lib/leads/display';
import RowMenu from './RowMenu';
import styles from '../../../admin.module.css';

/**
 * The posts table and the two list-level decisions in each row's menu —
 * publishing and deleting a draft. Both go to the backend API, then the
 * server-rendered page is refreshed.
 *
 * Two notes on what the columns say:
 *
 *  - Updated is relative, in the same words the leads table and the dashboard
 *    use, with the exact timestamp on hover.
 *  - Publish is refused, not hidden, for an unfinished post: the menu item
 *    says on hover what is still needed (the API's `missing` list).
 */
export default function PostsTable({
  rows,
  mayEdit,
  mayDelete,
  empty,
  footer,
}: {
  rows: AdminPostRow[];
  mayEdit: boolean;
  mayDelete: boolean;
  /** Shown instead of the table when there are no rows. */
  empty: { title: string; text: string };
  /** The pager, rendered by the page. */
  footer?: ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  async function run(action: () => Promise<string>) {
    setBusy(true);
    setMessage(null);
    try {
      setMessage({ tone: 'ok', text: await action() });
      router.refresh();
    } catch (err) {
      const gaps = publishMissing(err);
      const text = err instanceof Error ? err.message : 'Something went wrong.';
      setMessage({
        tone: 'err',
        text: gaps?.length ? `${text} Still needed: ${listFields(gaps)}.` : text,
      });
    } finally {
      setBusy(false);
    }
  }

  const togglePublished = (p: AdminPostRow) =>
    run(async () => {
      await api.patch(`/admin/posts/${p.id}`, { published: !p.published });
      return p.published
        ? 'That post is off the blog. Nothing was deleted — the draft is kept.'
        : 'That post is live on the blog.';
    });

  const remove = (e: FormEvent<HTMLFormElement>, p: AdminPostRow) => {
    e.preventDefault();
    return run(async () => {
      await api.delete(`/admin/posts/${p.id}`);
      setConfirming(null);
      return 'That draft was deleted.';
    });
  };

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

      <section className={styles.panel}>
        {rows.length === 0 ? (
          <p className={styles.empty}>
            <strong>{empty.title}</strong>
            {empty.text}
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Status</th>
                  <th scope="col">Updated</th>
                  <th scope="col" className={styles.nowrap} style={{ textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <Fragment key={p.id}>
                    <tr>
                      <td>
                        <Link className={styles.rowLink} href={`/admin/content/posts/${p.id}`}>
                          {p.title}
                        </Link>
                        <span className={styles.cellSecondary}>{p.category}</span>
                      </td>
                      <td>
                        <span
                          className={`${styles.pill} ${p.published ? styles.pillLow : styles.pillMed}`}
                        >
                          {p.published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className={styles.nowrap}>
                        <span className={styles.relativeTime} title={formatDate(p.updatedAt)}>
                          {formatRelativeTime(p.updatedAt)}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          {mayEdit ? (
                            <RowMenu
                              onTogglePublished={() => togglePublished(p)}
                              onDelete={() => setConfirming(p.id)}
                              title={p.title}
                              published={p.published}
                              /* An older backend sends no `missing`; it still
                                 refuses an unfinished post and says why. */
                              missing={p.missing ?? []}
                              editHref={`/admin/content/posts/${p.id}`}
                              mayDelete={mayDelete}
                              busy={busy}
                            />
                          ) : (
                            <Link className={styles.rowLink} href={`/admin/content/posts/${p.id}`}>
                              Open
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                    {confirming === p.id && !p.published && (
                      <tr>
                        <td className={styles.editCell} colSpan={4}>
                          <form className={styles.editForm} onSubmit={(e) => remove(e, p)}>
                            <p style={{ margin: 0, flex: '1 1 22rem' }}>
                              <strong>Delete “{p.title}”?</strong>
                              <span className={styles.cellSecondary}>
                                The draft and everything written in it go for good. Nothing else on
                                this screen destroys anything — unpublishing keeps the article and
                                only takes it off the blog.
                              </span>
                            </p>
                            <label className={styles.confirmCheck} htmlFor={`del-${p.id}`}>
                              <input type="checkbox" id={`del-${p.id}`} required />
                              <span>
                                I understand this cannot be undone, and that{' '}
                                <code>/blog/{p.slug}</code> is given up along with it.
                              </span>
                            </label>
                            <div className={styles.rowActions} style={{ padding: 0 }}>
                              <button
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                type="submit"
                                disabled={busy}
                                autoFocus
                              >
                                Delete this draft
                              </button>
                              <button
                                type="button"
                                className={`${styles.rowLink} ${styles.postsLinkButton}`}
                                onClick={() => setConfirming(null)}
                              >
                                Keep it
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {footer}
      </section>
    </>
  );
}
