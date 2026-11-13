'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import styles from '../admin.module.css';

/** Ends this session on the backend (which clears the cookie), then leaves. */
export default function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await api.post('/admin/auth/logout');
    } catch {
      // Already signed out or the server is unreachable — leave either way.
    }
    window.location.assign('/admin/signin');
  }

  return (
    <button className={styles.signoutRow} type="button" onClick={signOut} disabled={pending}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5M21 12H9" />
      </svg>
      <span>{pending ? 'Signing out…' : 'Sign out'}</span>
    </button>
  );
}
