'use client';

import { useState, useTransition } from 'react';
import { setLeadStatus } from './actions';
import { LEAD_STATUSES } from '@/lib/leads/display';
import styles from '../../../admin.module.css';

/**
 * The status control.
 *
 * A client component only because it needs pending and error state — the write
 * itself is the server action, which does its own authorisation.
 */
export default function StatusForm({ id, current }: { id: string; current: string }) {
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <div className={styles.statusForm}>
      <label className={styles.fieldLabel} htmlFor="lead-status">Status</label>
      <select
        className={styles.control}
        id="lead-status"
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
              /* Put the control back where it was. Leaving it showing the value
                 we failed to save would misreport the database. */
              setValue(previous);
              setFailed(true);
            }
          });
        }}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      {pending && <span className={styles.panelNote}>Saving…</span>}
      {failed && (
        <span className={styles.panelNote} role="alert">
          That did not save — the status is unchanged.
        </span>
      )}
    </div>
  );
}
