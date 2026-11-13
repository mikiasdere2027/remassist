'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api/client';
import PasswordFields, { passwordPairProblem } from '../../PasswordFields';
import styles from '../../admin.module.css';

export default function ResetForm({ token, username }: { token: string; username: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const problem = passwordPairProblem(form);
    if (problem) return setError(problem);
    setPending(true);
    setError(null);
    try {
      // Sets the password, signs out every other session, and signs this one in.
      await api.post(`/public/password-resets/${encodeURIComponent(token)}`, {
        password: String(form.get('password')),
      });
      window.location.assign('/admin');
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <>
      <p className={styles.signinLede}>
        Choose a new password for <strong>@{username}</strong>. You&apos;ll be signed out
        everywhere else.
      </p>
      {error && (
        <p className={`${styles.signinMsg} ${styles.msgErr}`} role="alert">
          {error}
        </p>
      )}
      <form className={styles.signinForm} onSubmit={onSubmit}>
        {/* Lets password managers file the new password under the right account. */}
        <input type="hidden" name="username" autoComplete="username" value={username} readOnly />
        <PasswordFields />
        <button className={styles.signinBtn} type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Set password and sign in'}
        </button>
      </form>
    </>
  );
}
