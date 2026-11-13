'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from '../../../admin.module.css';

export type FaqMessage = { tone: 'ok' | 'err'; text: string };

/**
 * Run one API call from the FAQ screens: report its outcome, then refresh the
 * server-rendered data. Errors are the backend's own wording (ApiError.message).
 */
export function useFaqAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<FaqMessage | null>(null);

  async function run(action: () => Promise<string | void>): Promise<boolean> {
    setBusy(true);
    setMessage(null);
    try {
      const ok = await action();
      if (ok) setMessage({ tone: 'ok', text: ok });
      router.refresh();
      return true;
    } catch (err) {
      setMessage({ tone: 'err', text: err instanceof Error ? err.message : 'Something went wrong.' });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, message, setMessage, run };
}

export function FaqNotice({ message }: { message: FaqMessage | null }) {
  if (!message) return null;
  return (
    <p
      className={`${styles.signinMsg} ${message.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
      role={message.tone === 'ok' ? 'status' : 'alert'}
    >
      {message.text}
    </p>
  );
}
