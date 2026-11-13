'use client';

import { useEffect } from 'react';
import styles from '../admin.module.css';

/**
 * Error boundary for admin pages. The sidebar stays (it's in the layout), so
 * the editor can retry or move to another section instead of facing a blank
 * screen when a page's data fails to load.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.stateBox} role="alert">
      <h1 className={styles.tbTitle}>This page couldn&apos;t load</h1>
      <p className={`${styles.signinMsg} ${styles.msgErr}`}>
        Something went wrong fetching its data. Nothing you saved was lost. Try again, or
        pick another section from the menu.
      </p>
      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={reset}>
        Try again
      </button>
      {error.digest && <p className={styles.stateNote}>Reference: {error.digest}</p>}
    </div>
  );
}
