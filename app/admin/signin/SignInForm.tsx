'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import { safeAdminPath } from '@/lib/auth/safe-next';
import styles from '../admin.module.css';

export default function SignInForm({ next }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api.post('/admin/auth/login', {
        username: String(form.get('username') ?? '').trim(),
        password: String(form.get('password') ?? ''),
        remember: form.get('remember') === 'yes',
      });
      // A full navigation, so every server component sees the new cookie.
      window.location.assign(safeAdminPath(next));
    } catch (err) {
      setPending(false);
      // 401 is deliberately one message for every credential failure; 429 is
      // the lockout, whose message says when to try again.
      setError(
        isApiError(err, 401)
          ? 'That username and password don’t match. Check them and try again.'
          : err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.',
      );
    }
  }

  return (
    <>
      {error && (
        <p className={`${styles.signinMsg} ${styles.msgErr}`} role="alert">
          {error}
        </p>
      )}
      <form className={styles.signinForm} onSubmit={onSubmit}>
        <label className={styles.fieldLabel} htmlFor="admin-username">
          Username
        </label>
        <input
          className={styles.signinInput}
          id="admin-username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
        />

        <label className={styles.fieldLabel} htmlFor="admin-password">
          Password
        </label>
        <input
          className={styles.signinInput}
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />

        <label className={styles.checkRow} htmlFor="admin-remember">
          <input id="admin-remember" name="remember" type="checkbox" value="yes" />
          <span>Keep me signed in for 30 days</span>
        </label>

        <button className={styles.signinBtn} type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className={styles.signinFoot}>
        <Link href="/admin/forgot-password">Forgot your password?</Link>
      </p>
    </>
  );
}
