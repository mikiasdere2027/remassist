'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api/client';
import styles from '../admin.module.css';

export default function ForgotForm() {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const identifier = String(new FormData(e.currentTarget).get('identifier') ?? '').trim();
    setPending(true);
    setError(null);
    try {
      const res = await api.post<{ message: string }>('/public/password-resets', { identifier });
      setSent(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <>
        <p className={`${styles.signinMsg} ${styles.msgOk}`} role="status">
          {sent} The link works once and expires in 24 hours. If nothing arrives,
          ask an admin to create a reset link for you.
        </p>
        <p className={styles.signinFoot}>
          <Link href="/admin/signin">Back to sign-in</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <p className={styles.signinLede}>
        Enter your username or email. We&apos;ll email you a link to choose a new password.
      </p>
      {error && (
        <p className={`${styles.signinMsg} ${styles.msgErr}`} role="alert">
          {error}
        </p>
      )}
      <form className={styles.signinForm} onSubmit={onSubmit}>
        <label className={styles.fieldLabel} htmlFor="forgot-identifier">
          Username or email
        </label>
        <input
          className={styles.signinInput}
          id="forgot-identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
        />
        <button className={styles.signinBtn} type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Email me a reset link'}
        </button>
      </form>
      <p className={styles.signinFoot}>
        <Link href="/admin/signin">Back to sign-in</Link>
      </p>
    </>
  );
}
