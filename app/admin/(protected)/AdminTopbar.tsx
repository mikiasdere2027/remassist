import type { ReactNode } from 'react';
import styles from '../admin.module.css';
import TopbarUser from './TopbarUser';

/**
 * Shared admin topbar — used consistently across every admin page.
 *
 * Left  : page title + subtitle
 * Right : action button · user chip
 *
 * (The search box and notification bell were removed 2026-11-13: neither was
 * wired to anything. Add them back when real search/notifications exist.)
 */
export default function AdminTopbar({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className={styles.topbar}>
      <div className={styles.tbInner}>
        {/* Left: page title + subtitle */}
        <div>
          <h1 className={styles.tbTitle}>{title}</h1>
          <p className={styles.tbSub}>{subtitle}</p>
        </div>

        {/* Right: action · user */}
        <div className={styles.tbRight}>
          {/* Page action button (e.g. Export CSV, New post, Add question) */}
          {action}

          {/* User identity & settings chip */}
          <TopbarUser />
        </div>
      </div>
    </header>
  );
}

