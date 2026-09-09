'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../admin.module.css';

/**
 * The sidebar links — MIGRATION-PLAN §10.
 *
 * A client component for one reason: which link is current. A server layout has
 * no access to the pathname, and the alternative — hardcoding `active` on Leads
 * — was already wrong the moment Settings existed, telling anyone on the
 * settings screen that they were looking at leads.
 *
 * It ships `usePathname` and nothing else. No data, no session, no fetching:
 * `canManageUsers` is resolved on the server and arrives as a boolean, so the
 * role never reaches the browser bundle, and hiding the Team link is cosmetic
 * anyway — the route and every action behind it re-check the role themselves.
 */
export default function AdminNav({ showTeam }: { showTeam: boolean }) {
  const pathname = usePathname() ?? '';

  /**
   * Prefix matching, so /admin/leads/<id> keeps Leads lit (and
   * /admin/settings/team keeps Account lit).
   *
   * Returns aria-current alongside the class because the active state is
   * carried visually by a colour and a left border, and neither reaches a
   * screen reader. Spread onto the Link so the two can never drift apart.
   */
  const link = (href: string, exact = false) => {
    const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
    return {
      className: `${styles.navLink} ${active ? styles.active : ''}`,
      'aria-current': active ? ('page' as const) : undefined,
    };
  };

  return (
    <nav className={styles.navScroll} aria-label="Admin sections">
      <div className={styles.navGroup}>
        <div className={styles.navGroupTitle}>Overview</div>
        {/* Exact: every other admin path starts with /admin, so a prefix match
            here would light the dashboard up on every screen. */}
        <Link {...link('/admin', true)} href="/admin">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="10" width="7" height="11" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
          <span>Dashboard</span>
        </Link>
      </div>

      <div className={styles.navGroup}>
        <div className={styles.navGroupTitle}>Pipeline</div>
        <Link {...link('/admin/leads')} href="/admin/leads">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 12h5l2 3h4l2-3h5" />
            <path d="M4 5h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
          </svg>
          <span>Leads</span>
        </Link>
        <Link {...link('/admin/quizzes')} href="/admin/quizzes">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 11l3 3 7-7" />
            <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
          </svg>
          <span>Fit finder</span>
        </Link>
        <Link {...link('/admin/catalog')} href="/admin/catalog">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
            <circle cx="8" cy="6" r="1.6" />
            <circle cx="14" cy="12" r="1.6" />
            <circle cx="10" cy="18" r="1.6" />
          </svg>
          <span>Rates</span>
        </Link>
      </div>

      <div className={styles.navGroup}>
        <div className={styles.navGroupTitle}>Content</div>
        <Link {...link('/admin/content/faq')} href="/admin/content/faq">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7" />
            <path d="M12 17h.01" />
          </svg>
          <span>FAQ</span>
        </Link>
        <Link {...link('/admin/content/reviews')} href="/admin/content/reviews">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
          </svg>
          <span>Reviews</span>
        </Link>
        <Link {...link('/admin/content/posts')} href="/admin/content/posts">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 4h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
            <path d="M14 4v5h5M8 13h8M8 17h5" />
          </svg>
          <span>Posts</span>
        </Link>
        <Link {...link('/admin/content/team')} href="/admin/content/team">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="9" cy="8" r="3.4" />
            <path d="M3 20v-1.4A4.6 4.6 0 0 1 7.6 14h2.8a4.6 4.6 0 0 1 4.6 4.6V20" />
            <path d="M16.5 4.6a3.4 3.4 0 0 1 0 6.6M21 20v-1.4a4.6 4.6 0 0 0-3.2-4.4" />
          </svg>
          <span>Team</span>
        </Link>
        <Link {...link('/admin/content/popups')} href="/admin/content/popups">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 4h16M4 9h16M4 14h16" />
            <rect x="17" y="4" width="4" height="4" rx="1" />
            <rect x="17" y="10" width="4" height="4" rx="1" />
          </svg>
          <span>Popups</span>
        </Link>
      </div>

      <div className={styles.navGroup}>
        <div className={styles.navGroupTitle}>Account</div>
        {/* Settings lives behind the identity chip in the topbar, so the only
            account item here is the one thing the chip cannot reach. */}
        {showTeam && (
          <Link {...link('/admin/settings/team')} href="/admin/settings/team">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="9" cy="8" r="3.4" />
              <path d="M3 20v-1.4A4.6 4.6 0 0 1 7.6 14h2.8a4.6 4.6 0 0 1 4.6 4.6V20" />
              <path d="M16.5 4.6a3.4 3.4 0 0 1 0 6.6M21 20v-1.4a4.6 4.6 0 0 0-3.2-4.4" />
            </svg>
            <span>Manage team</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
