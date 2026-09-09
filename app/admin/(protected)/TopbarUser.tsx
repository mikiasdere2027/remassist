import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import styles from '../admin.module.css';

/** First-name initials for the identity chip: "Johnathan Z." -> JZ. Falls back
    to the email prefix when no name is set, so an account that never filled
    its name still gets a mark of its own rather than a blank circle. */
function initials(name?: string | null, email?: string | null): string {
  const src = (name || email || 'A').trim();
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

/**
 * The identity chip in the top-right of every admin page: initials avatar,
 * name and "role · email", clickable straight through to Settings. So the
 * account screen needs no sidebar link of its own.
 *
 * A server component because the identity is session data. It re-checks the
 * session itself rather than trusting a prop from a parent, matching how the
 * sidebar's gate works.
 */
export default async function TopbarUser() {
  const user = await requireUser();

  return (
    <Link className={styles.topbarUser} href="/admin/settings">
      <span className={styles.avatar} aria-hidden="true">
        {initials(user.name, user.email)}
      </span>
      <span className={styles.topbarUserText}>
        <span className={styles.topbarUserName}>{user.name ?? 'Admin user'}</span>
        <span className={styles.topbarUserRole}>{user.role} · {user.email}</span>
      </span>
      {/* The gear says the chip is the way into account settings before anyone
          clicks it. */}
      <svg className={styles.topbarUserGear} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </Link>
  );
}