import type { ReactNode } from 'react';
import styles from '../admin.module.css';
import TopbarUser from './TopbarUser';

/**
 * Shared admin topbar — used consistently across every admin page.
 *
 * Left  : page title + subtitle
 * Right : search box · notification bell · action button · setting/user chip
 */
export default function AdminTopbar({
  title,
  subtitle,
  action,
  hideSearch = false,
}: {
  title: ReactNode;
  subtitle: ReactNode;
  action?: ReactNode;
  hideSearch?: boolean;
}) {
  return (
    <header className={styles.topbar}>
      <div className={styles.tbInner}>
        {/* Left: page title + subtitle */}
        <div>
          <h1 className={styles.tbTitle}>{title}</h1>
          <p className={styles.tbSub}>{subtitle}</p>
        </div> 
      
        {/* Right: search · action · bell · user */}
        <div className={styles.tbRight}>
          {/* Search box */}
          {!hideSearch && (
            <label className={styles.tbSearch}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input type="search" placeholder="Search leads, posts, FAQ…" />
            </label>
          )}

          {/* Page action button (e.g. Export CSV, New post, Add question) */}
          {action}

          {/* Bell / notifications — sits immediately left of the user chip */}
          <button className={styles.tbBell} type="button" aria-label="Notifications">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className={styles.tbBellDot} aria-hidden="true" />
          </button>

          {/* User identity & settings chip */}
          <TopbarUser />
        </div>
      </div>
    </header>
  );
}

