'use client';

import Link from 'next/link';
import MenuButton from '../../MenuButton';
import styles from '../../../admin.module.css';

/**
 * The three-dot menu on a post row — the same control as the rate tables and
 * the team directory, so a menu means the same thing on every screen.
 *
 * Three items, and the middle one changes with the row: Edit, then Publish or
 * Unpublish, then Delete.
 *
 * Publish is a submit because it is one state flip that another click undoes.
 * Delete is a link to `?del=`, which opens a confirm step in the row's own
 * place rather than destroying a draft one click away from the menu that
 * offered it — the same shape as Deactivate on the rate tables, for a stronger
 * reason. Nothing here deletes without the server seeing a ticked box.
 *
 * Both of the last two are offered and refused rather than omitted when they
 * do not apply: Publish on a post with nothing to read, Delete on a post that
 * is live. A menu that grows and shrinks by row is a menu you have to read
 * every time, and a missing item explains nothing — the greyed item's tooltip
 * says which post and why, and in Delete's case it names the step that unlocks
 * it. Both refusals are enforced in the action too; this is the explanation,
 * not the control.
 */
export default function RowMenu({
  publish,
  id,
  title,
  published,
  publishable,
  editHref,
  deleteHref,
  mayDelete,
}: {
  publish: (formData: FormData) => Promise<void>;
  id: string;
  title: string;
  published: boolean;
  publishable: boolean;
  editHref: string;
  deleteHref: string;
  mayDelete: boolean;
}) {
  return (
    <MenuButton label={`Options for post: ${title}`}>
      <Link href={editHref} className={styles.memberDropdownItem}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
        Edit
      </Link>

      <form action={publish} style={{ margin: 0 }}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="published" value={published ? '0' : '1'} />
        <button
          type="submit"
          className={styles.memberDropdownItem}
          disabled={!published && !publishable}
          title={
            !published && !publishable
              ? 'This post has no article body yet, so it cannot go on the blog'
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
      </form>

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
          /* A link, not a submit. The confirm step is server-rendered in the
             row below, so this menu never destroys anything on its own. */
          <Link
            href={deleteHref}
            className={`${styles.memberDropdownItem} ${styles.memberDropdownItemDanger}`}
          >
            <TrashIcon />
            Delete
          </Link>
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
