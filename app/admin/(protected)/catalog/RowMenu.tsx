'use client';

import Link from 'next/link';
import MenuButton from '../MenuButton';
import styles from '../../admin.module.css';

/**
 * The three-dot row menu on the price tables — the same control as the one on
 * each card in the team directory, and it shares that control's classes and
 * its popup so the two stay one thing rather than two that look alike.
 *
 * It changes the trigger, not the flow. Edit and Deactivate are still links to
 * `?edit=` and `?off=`, so the server keeps rendering the edit form and the
 * confirm step in the row's own place; putting a row back is still the same
 * one-click form, because it is additive and one click undoes it again. What
 * used to be two naked icons in an Actions column is now one button, which is
 * what a table of four rows needs.
 *
 * Everything behind it is the server's, and every action re-checks the admin
 * gate — see the note at the top of actions.ts.
 */
export default function RowMenu({
  action,
  rowKey,
  active,
  editHref,
  offHref,
  noun,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  rowKey: string;
  active: boolean;
  editHref: string;
  offHref: string;
  noun: string;
  label: string;
}) {
  return (
    <MenuButton label={`Options for ${noun}: ${label}`}>
      <Link href={editHref} className={styles.memberDropdownItem}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
        Edit {noun}
      </Link>

      {active ? (
        /* A link, not a submit: it opens the confirm step in the row rather
           than making the change. Nothing on this screen changes a price one
           click away from the menu that offered it. */
        <Link
          href={offHref}
          className={`${styles.memberDropdownItem} ${styles.memberDropdownItemDanger}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          Deactivate {noun}
        </Link>
      ) : (
        <form action={action} style={{ margin: 0 }}>
          <input type="hidden" name="key" value={rowKey} />
          <input type="hidden" name="active" value="1" />
          <button type="submit" className={styles.memberDropdownItem}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 11a8 8 0 1 0-1.5 5.2" />
              <path d="M20 4v7h-7" />
            </svg>
            Put back in use
          </button>
        </form>
      )}
    </MenuButton>
  );
}
