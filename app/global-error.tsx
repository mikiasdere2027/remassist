'use client';

import { useEffect } from 'react';

/**
 * Last-resort boundary: only shown when the root layout itself fails, so it
 * replaces <html> and can't rely on the site's CSS, fonts or header. Kept
 * self-contained with inline styles on purpose.
 */
export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          background: '#f7faff',
          color: '#0b1b3f',
        }}
      >
        <main style={{ maxWidth: 520, padding: '48px 24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, margin: '0 0 12px' }}>Rem Assist is having a moment.</h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: '#4a5568', margin: '0 0 28px' }}>
            Something went wrong loading the site. Please try again — or email{' '}
            <a href="mailto:support@remassistance.com" style={{ color: '#518de0' }}>
              support@remassistance.com
            </a>
            .
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              font: 'inherit',
              fontWeight: 600,
              fontSize: 16,
              padding: '12px 28px',
              borderRadius: 10,
              border: 0,
              background: '#518de0',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: 24, fontSize: 12, color: '#718096' }}>Reference: {error.digest}</p>
          )}
        </main>
      </body>
    </html>
  );
}
