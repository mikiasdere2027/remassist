import Link from 'next/link';
import styles from '../admin.module.css';

/**
 * A record that doesn't exist (deleted, or a mistyped link) inside the admin.
 * Without this, Next showed the public site's 404 (marketing header, pricing
 * links) inside the CRM. The sidebar stays, since it lives in the layout.
 */
export default function AdminNotFound() {
  return (
    <div className={styles.stateBox}>
      <h1 className={styles.tbTitle}>Not found</h1>
      <p className={styles.signinMsg}>
        This record doesn&apos;t exist any more, or the link is wrong. Pick it from one of the lists.
      </p>
      <Link href="/admin" className={`${styles.btn} ${styles.btnPrimary}`}>
        Back to the dashboard
      </Link>
    </div>
  );
}
