'use client';

import Link from 'next/link';
import { listFields } from '@/lib/blog/completeness';
import MenuButton from '../../MenuButton';
import styles from '../../../admin.module.css';

/**
 * The three-dot menu on a post row — the same control as the rate tables and
 * the team directory, so a menu means the same thing on every screen.
 *
 * Three items, and the middle one changes with the row: Edit, then Publish or
 * Unpublish, then Delete.
 *
 * Publish acts at once because it is one state flip that another click undoes.
 * Delete opens a confirm step in the row's own place rather than destroying a
 * draft one click away from the menu that offered it.
 *
 * Both of the last two are offered and refused rather than omitted when they
 * do not apply: Publish on a post with nothing to read, Delete on a post that
 * is live. A menu that grows and shrinks by row is a menu you have to read
 * every time, and a missing item explains nothing — the greyed item's tooltip
 * says which post and why, and in Delete's case it names the step that unlocks
 * it. Both refusals are enforced by the API too; this is the explanation, not
 * the control.
 */
export default function RowMenu({
  onTogglePublished,
  onDelete,
  title,
  published,
  missing,
  editHref,
  mayDelete,
  busy,
}: {
  onTogglePublished: () => void;
  onDelete: () => void;
  title: string;
  published: boolean;
  /** What still blocks publishing; empty means ready. */
  missing: string[];
  editHref: string;
  mayDelete: boolean;
  busy: boolean;
}) {
  const publishable = missing.length === 0;
  return (
    <MenuButton label={`Options for post: ${title}`}>
      <Link href={editHref} className={styles.memberDropdownItem}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
        Edit
      </Link>

        <button
          type="button"
          className={styles.memberDropdownItem}
          onClick={onTogglePublished}
          disabled={busy || (!published && !publishable)}
          title={
            !published && !publishable
              ? `Not finished, so it cannot go on the blog. Still needed: ${listFields(missing)}`
              : undefined
          }
        >
          {published ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 3l18 18" />
              <path d="M10.6 5.1A9.9 9.9 0 0 1 12 5c5 0 9 4.5 9 7 0 .8-.5 1.9-1.4 3" />
              <path d="M6.3 6.9C3.9 8.4 3 10.4 3 12c0 2.5 4 7 9 7 1.6 0 3-.4 4.2-1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
          {published ? 'Unpublish' : 'Publish'}
        </button>

      {mayDelete &&
        (published ? (
          /* A live article is never one click from gone. Unpublishing first is
             a real step, not a speed bump: it is the point at which the URL
             stops resolving, and it is reversible right up until this button
             becomes usable. */
          <button
            type="button"
            className={styles.memberDropdownItem}
            disabled
            title="Unpublish it first — a post that is on the blog cannot be deleted"
          >
            <TrashIcon />
            Delete
          </button>
        ) : (
          /* Opens the confirm step in the row below; this menu never destroys
             anything on its own. */
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className={`${styles.memberDropdownItem} ${styles.memberDropdownItemDanger}`}
          >
            <TrashIcon />
            Delete
          </button>
        ))}
    </MenuButton>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
