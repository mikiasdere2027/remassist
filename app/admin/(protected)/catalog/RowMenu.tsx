'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api/client';
import { CATALOG_PATH, type CatalogTable } from '@/lib/api/catalog';
import MenuButton from '../MenuButton';
import styles from '../../admin.module.css';

/**
 * The three-dot row menu on the price tables — the same control as the one on
 * each card in the team directory, and it shares that control's classes and
 * its popup so the two stay one thing rather than two that look alike.
 *
 * Edit and Deactivate are links to `?edit=` and `?off=`, which open the edit
 * form and the confirm step in the row's own place (RateForms.tsx). Putting a
 * row back is one click (POST …/:key/reactivate), because it is additive and
 * one click undoes it again. The backend re-checks the admin role on every
 * write.
 */
export default function RowMenu({
  table,
  rowKey,
  active,
  listHref,
  editHref,
  offHref,
  noun,
  label,
}: {
  table: CatalogTable;
  rowKey: string;
  /** Where to land after putting a row back (keeps the tab). */
  listHref: string;
  active: boolean;
  editHref: string;
  offHref: string;
  noun: string;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reactivate() {
    setBusy(true);
    try {
      await api.post(`${CATALOG_PATH[table]}/${encodeURIComponent(rowKey)}/reactivate`);
      router.push(`${listHref}${listHref.includes('?') ? '&' : '?'}ok=reactivated`);
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

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
        <button type="button" className={styles.memberDropdownItem} onClick={reactivate} disabled={busy}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 11a8 8 0 1 0-1.5 5.2" />
            <path d="M20 4v7h-7" />
          </svg>
          Put back in use
        </button>
      )}
    </MenuButton>
  );
}
