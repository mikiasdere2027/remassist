'use client';

import { useState } from 'react';
import { scheduleIso } from '@/lib/blog/schedule';
import { LocalTime } from '../../leads/[id]/LeadClient';
import styles from '../../../admin.module.css';

/**
 * Schedule a finished draft to go live by itself, or see and cancel the
 * schedule it has. Sits beside Publish (which, on a scheduled post, publishes
 * it right now and clears the schedule). The time is the editor's own local
 * time; the API stores it exactly.
 */
export default function SchedulePost({
  publishAt,
  ready,
  missingText,
  busy,
  onSchedule,
  onCancel,
}: {
  publishAt: string | null;
  ready: boolean;
  /** What is still missing, for the disabled button's explanation. */
  missingText: string;
  busy: boolean;
  onSchedule: (iso: string) => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState('');
  const iso = scheduleIso(local);

  if (publishAt) {
    return (
      <span className={styles.schedule}>
        <span role="status">Goes live <LocalTime iso={publishAt} /></span>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancel} disabled={busy}>
          Cancel schedule
        </button>
      </span>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        className={`${styles.btn} ${styles.btnGhost}`}
        onClick={() => setOpen(true)}
        disabled={busy || !ready}
        title={!ready ? `Still missing: ${missingText}` : undefined}
      >
        Schedule…
      </button>
    );
  }
  return (
    <span className={styles.schedule}>
      <input
        type="datetime-local"
        aria-label="Publish at"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className={styles.signinInput}
      />
      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy || !iso} onClick={() => iso && onSchedule(iso)}>
        Schedule
      </button>
      <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setOpen(false)}>
        Never mind
      </button>
    </span>
  );
}
