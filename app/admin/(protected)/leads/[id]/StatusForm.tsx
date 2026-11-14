'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { setLeadStatus } from './crm-actions';
import { SELECTABLE_STATUSES } from '@/lib/leads/display';
import { STATUS_LABELS } from '@/lib/crm/display';
import styles from '../../../admin.module.css';

/**
 * The status control — placed directly in the topbar header slot.
 */
export default function StatusForm({ id, current }: { id: string; current: string }) {
  const router = useRouter();
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
            const r = await setLeadStatus(id, next);
            if (r.ok) {
              // The timeline and response clock change with the status.
              router.refresh();
            } else {
              setValue(previous);
              setFailed(true);
            }
          });
        }}
      >
        {/* A legacy or system status (won, lost, converted) stays visible as the
            current value but cannot be chosen again. */}
        {!(SELECTABLE_STATUSES as readonly string[]).includes(current) && (
          <option value={current} disabled>
            Status: {STATUS_LABELS[current] ?? current}
          </option>
        )}
        {SELECTABLE_STATUSES.map((s) => (
          <option key={s} value={s}>
            Status: {STATUS_LABELS[s]}
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

