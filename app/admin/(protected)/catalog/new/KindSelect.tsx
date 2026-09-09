'use client';

import { useRouter } from 'next/navigation';
import styles from '../../../admin.module.css';

/**
 * The coverage-option / agent-tier dropdown on the Add-option page.
 *
 * The two tables have different fields, so switching the kind navigates to the
 * matching server-rendered form — the same pattern as the FAQ's category
 * filter. The value is part of the URL, so a refresh keeps you on the kind you
 * were filling in.
 */
export default function RateKindSelect({ value }: { value: 'coverage' | 'tier' }) {
  const router = useRouter();

  return (
    <label className={styles.selectField}>
      <span className={styles.srOnly}>What are you adding?</span>
      <select
        value={value}
        onChange={(e) => {
          if (e.target.value === 'tier') router.push('/admin/catalog/new?kind=tier');
          else router.push('/admin/catalog/new');
        }}
      >
        <option value="coverage">Coverage option</option>
        <option value="tier">Agent tier</option>
      </select>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </label>
  );
}