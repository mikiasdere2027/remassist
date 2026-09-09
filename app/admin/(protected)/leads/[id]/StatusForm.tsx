'use client';

import { useState, useTransition } from 'react';
import { setLeadStatus } from './actions';
import { LEAD_STATUSES } from '@/lib/leads/display';
import styles from '../../../admin.module.css';

/**
 * The status control — placed directly in the topbar header slot.
 */
export default function StatusForm({ id, current }: { id: string; current: string }) {
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <div className={styles.statusForm}>
      <select
        className={`${styles.control} ${styles.statusSelect} ${styles[`s_${value}`]}`}
        id="lead-status"
        aria-label="Lead status"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          const previous = value;
          setValue(next);
          setFailed(false);
          start(async () => {
            try {
              await setLeadStatus(id, next);
            } catch {
              setValue(previous);
              setFailed(true);
            }
          });
        }}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            Status: {s}
          </option>
        ))}
      </select>
      {pending && <span className={styles.statusNote}>Saving…</span>}
      {failed && (
        <span className={styles.statusErr} role="alert">
          Save failed
        </span>
      )}
    </div>
  );
}

