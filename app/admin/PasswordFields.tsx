'use client';

import { useState } from 'react';
import styles from './admin.module.css';

/** The backend's rule (12+ characters), shown before the round trip. */
export const MIN_PASSWORD = 12;

/**
 * New password + confirmation, with the length rule and mismatch shown as you
 * type. The backend validates again; this is only to save a round trip.
 * Reads as `password` in the form; the confirmation is client-side only.
 */
export default function PasswordFields({ label = 'New password' }: { label?: string }) {
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const tooShort = pw.length > 0 && pw.length < MIN_PASSWORD;
  const mismatch = again.length > 0 && again !== pw;

  return (
    <>
      <label className={styles.fieldLabel} htmlFor="pw-new">
        {label}
      </label>
      <input
        className={styles.signinInput}
        id="pw-new"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD}
        maxLength={200}
        required
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        aria-describedby="pw-hint"
      />
      <p id="pw-hint" className={tooShort ? styles.fieldErr : styles.fieldHint}>
        At least {MIN_PASSWORD} characters. A short phrase is easier to remember than a mangled word.
      </p>

      <label className={styles.fieldLabel} htmlFor="pw-again">
        Type it again
      </label>
      <input
        className={styles.signinInput}
        id="pw-again"
        name="password-again"
        type="password"
        autoComplete="new-password"
        required
        value={again}
        onChange={(e) => setAgain(e.target.value)}
        aria-invalid={mismatch}
      />
      {mismatch && <p className={styles.fieldErr}>The two passwords don&apos;t match.</p>}
    </>
  );
}

/** For submit handlers: the error to show, or null when the pair is fine. */
export function passwordPairProblem(form: FormData): string | null {
  const pw = String(form.get('password') ?? '');
  const again = String(form.get('password-again') ?? '');
  if (pw.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (again && again !== pw) return 'The two passwords don’t match.';
  return null;
}
