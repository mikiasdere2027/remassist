import styles from '../admin.module.css';

/** Shown while an admin page's server data loads (streamed by Next). */
export default function AdminLoading() {
  return (
    <div className={styles.stateBox} aria-busy="true" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <p className={styles.stateNote}>Loading…</p>
    </div>
  );
}
