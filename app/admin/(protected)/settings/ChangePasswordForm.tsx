'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api/client';
import PasswordFields, { passwordPairProblem } from '../../PasswordFields';
import styles from '../../admin.module.css';

/** Change your own password. The backend signs out your other sessions. */
export default function ChangePasswordForm({ username }: { username: string }) {
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const problem = passwordPairProblem(form);
    if (problem) return setMsg({ tone: 'err', text: problem });
    setPending(true);
    setMsg(null);
    try {
      await api.post('/admin/auth/password', {
        currentPassword: String(form.get('current') ?? ''),
        newPassword: String(form.get('password') ?? ''),
      });
      formEl.reset();
      setMsg({ tone: 'ok', text: 'Password changed. Your other devices have been signed out.' });
    } catch (err) {
      setMsg({ tone: 'err', text: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.signinForm} onSubmit={onSubmit}>
      {msg && (
        <p
          className={`${styles.signinMsg} ${msg.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
          role={msg.tone === 'ok' ? 'status' : 'alert'}
        >
          {msg.text}
        </p>
      )}
      <input type="hidden" name="username" autoComplete="username" value={username} readOnly />
      <label className={styles.fieldLabel} htmlFor="pw-current">
        Current password
      </label>
      <input
        className={styles.signinInput}
        id="pw-current"
        name="current"
        type="password"
        autoComplete="current-password"
        required
      />
      <PasswordFields />
      <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Change password'}
      </button>
    </form>
  );
}
