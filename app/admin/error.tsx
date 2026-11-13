'use client';

import { useEffect } from 'react';
import styles from './admin.module.css';

/**
 * Error boundary for the admin shell itself — when the protected layout fails
 * (e.g. the backend is unreachable or rate-limits the "who am I?" call), so
 * the editor gets the admin's own retry screen instead of the site-wide
 * last-resort page. Page-level errors are caught by (protected)/error.tsx,
 * which keeps the sidebar.
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
        The admin couldn&apos;t reach the server just now. Nothing you saved was lost —
        try again in a moment.
      </p>
      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={reset}>
        Try again
      </button>
      {error.digest && <p className={styles.stateNote}>Reference: {error.digest}</p>}
    </div>
  );
}
