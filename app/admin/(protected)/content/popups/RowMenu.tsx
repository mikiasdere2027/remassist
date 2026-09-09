import Link from 'next/link';
import MenuButton from '../../MenuButton';
import styles from '../../../admin.module.css';

/**
 * The three-dot row menu on a popup — the same control everywhere else in the
 * admin, so a menu means the same thing on every screen.
 *
 * Two items: Edit, then Publish or Suspend. Publish/Suspend is a submit because
 * it is one state flip that another click undoes. Nothing here ever deletes —
 * suspending keeps the record of what the site once showed, which is what the
 * whole popup module is about (see the list page notes).
 */
export default function PopupRowMenu({
  id,
  name,
  published,
  publish,
}: {
  id: string;
  name: string;
  published: boolean;
  publish: (formData: FormData) => Promise<void>;
}) {
  return (
    <MenuButton label={`Options for popup: ${name}`}>
      <Link className={styles.memberDropdownItem} href={`/admin/content/popups/${id}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
        Edit
      </Link>

      <form action={publish} style={{ margin: 0 }}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="published" value={published ? '0' : '1'} />
        <button type="submit" className={styles.memberDropdownItem}>
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
          {published ? 'Suspend' : 'Publish'}
        </button>
      </form>
    </MenuButton>
  );
}