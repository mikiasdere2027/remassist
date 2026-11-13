'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { BOOK_URL } from '@/lib/nav';
import styles from '../not-found.module.css';

/**
 * Error boundary for every public page. Rendered inside the root layout, so
 * the header, footer and chat stay usable when one page's data fails to load
 * (e.g. the API is down). The visitor gets a retry and a way to still reach
 * us — a broken page should never be a dead end for a prospect.
 */
export default function PageError({
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
    <main className={styles.page}>
      <div className={styles.wrap}>
        <span className={styles.code}>Something went wrong</span>
        <h1 className={styles.h1}>This page didn&apos;t load.</h1>
        <p className={styles.lede}>
          It&apos;s on our side, not yours. Try again in a moment — or go back to the{' '}
          <Link href="/">home page</Link>.
        </p>
        <ul className={styles.links}>
          <li>
            <button type="button" className={styles.card} onClick={reset}>
              <span className={styles.cardLabel}>Try again</span>
              <span className={styles.cardNote}>Reload just this page</span>
              <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
              </svg>
            </button>
          </li>
          <li>
            <a className={styles.card} href={BOOK_URL} target="_blank" rel="noopener">
              <span className={styles.cardLabel}>Book a call instead</span>
              <span className={styles.cardNote}>Talk to us directly</span>
              <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </a>
          </li>
        </ul>
        {error.digest && <p className={styles.digest}>Reference: {error.digest}</p>}
      </div>
    </main>
  );
}
