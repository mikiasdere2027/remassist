'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LEAD_STATUSES, setLeadStatus, type LeadStatus } from '@/lib/api/leads';
import styles from '../../../admin.module.css';

/**
 * The status control — placed directly in the topbar header slot.
 * PATCH /v1/admin/leads/:id, then a refresh so the page re-reads the lead.
 */
export default function StatusForm({ id, current }: { id: string; current: LeadStatus }) {
  const router = useRouter();
  const [value, setValue] = useState<LeadStatus>(current);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: LeadStatus) {
    const previous = value;
    setValue(next);
    setError(null);
    setPending(true);
    try {
      await setLeadStatus(id, next);
      router.refresh();
    } catch (err) {
      setValue(previous);
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.statusForm}>
      <select
        className={`${styles.control} ${styles.statusSelect} ${styles[`s_${value}`]}`}
        id="lead-status"
        aria-label="Lead status"
        value={value}
        disabled={pending}
        onChange={(e) => void change(e.target.value as LeadStatus)}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            Status: {s}
          </option>
        ))}
      </select>
      {pending && <span className={styles.statusNote}>Saving…</span>}
      {error && (
        <span className={styles.statusErr} role="alert" title={error}>
          Save failed: {error}
        </span>
      )}
    </div>
  );
}
