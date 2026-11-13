'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import PasswordFields, { passwordPairProblem } from '../../PasswordFields';
import styles from '../../admin.module.css';

export default function AcceptForm({ token, name }: { token: string; name: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const problem = passwordPairProblem(form);
    if (problem) return setError(problem);
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      // Creates the account and signs it in.
      await api.post(`/public/invitations/${encodeURIComponent(token)}/accept`, {
        username: String(form.get('username') ?? '').trim(),
        name: String(form.get('name') ?? '').trim(),
        password: String(form.get('password') ?? ''),
      });
      window.location.assign('/admin');
    } catch (err) {
      setPending(false);
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors());
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
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
        <label className={styles.fieldLabel} htmlFor="inv-name">
          Your name
        </label>
        <input
          className={styles.signinInput}
          id="inv-name"
          name="name"
          type="text"
          autoComplete="name"
          defaultValue={name ?? ''}
          maxLength={100}
          required
        />
        {fieldErrors.name && <p className={styles.fieldErr}>{fieldErrors.name}</p>}

        <label className={styles.fieldLabel} htmlFor="inv-username">
          Username
        </label>
        <input
          className={styles.signinInput}
          id="inv-username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          pattern="[A-Za-z0-9][A-Za-z0-9._\-]{2,31}"
          title="3–32 characters: letters, numbers, dots, dashes or underscores"
          required
        />
        <p className={fieldErrors.username ? styles.fieldErr : styles.fieldHint}>
          {fieldErrors.username ??
            'You’ll sign in with this. 3–32 characters: letters, numbers, dots, dashes or underscores.'}
        </p>

        <PasswordFields label="Password" />

        <button className={styles.signinBtn} type="submit" disabled={pending}>
          {pending ? 'Creating your account…' : 'Create account and sign in'}
        </button>
      </form>
    </>
  );
}
