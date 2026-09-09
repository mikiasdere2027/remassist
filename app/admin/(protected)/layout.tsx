import { cookies } from 'next/headers';
import { signOut } from '@/auth';
import { requireUser } from '@/lib/auth/require';
import { canManageUsers } from '@/lib/auth/roles';
import { REMEMBER_COOKIE } from '@/lib/auth/remember';
import AdminNav from './AdminNav';
import VerifyBanner from './VerifyBanner';
import styles from '../admin.module.css';

/**
 * The admin gate and chrome — MIGRATION-PLAN §10.
 *
 * A server-component check rather than middleware, per the plan.
 *
 * Note what this does NOT cover: route handlers render outside the layout tree,
 * so every handler under /admin re-checks the session itself. See
 * leads/export/route.ts — a CSV of every lead is exactly the thing that must
 * not be reachable because someone assumed a parent layout was protecting it.
 *
 * Sidebar and topbar follow the "Test Admin" prototype. Leads and Team are
 * built; the remaining sections in that prototype are later phases and are
 * deliberately absent rather than present-and-dead. The identity moved up to
 * the per-page topbar chip (TopbarUser) — clickable through to Settings — so
 * this layout only decides what the rail itself carries.
 */

/* Session-dependent: prerendering would bake one person's view into HTML. */
export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  /* Loads the user row, so a disabled account loses access on its next
     request rather than at its next sign-in. */
  const user = await requireUser();

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/rem-logo.svg" alt="Rem Assist" />
          <span className={styles.brandLabel}>Admin</span>
        </div>

        <AdminNav showTeam={canManageUsers(user.role)} />

        {/* The way back to the site the admin edits — lives above the
            sign-out divider so it reads as a navigation action, not a
            destructive footer action. */}
        <a className={`${styles.viewSite} ${styles.viewSiteAboveFoot}`} href="/" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 4h6v6" />
            <path d="M20 4 10 14" />
            <path d="M20 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
          </svg>
          <span>View site</span>
        </a>

        <div className={styles.sidebarFoot}>
          <form
            action={async () => {
              'use server';
              /* Clear the remember flag too. Left behind, it would silently
                 give the next person to sign in on this browser a 30-day
                 session they never asked for. */
              (await cookies()).delete(REMEMBER_COOKIE);
              await signOut({ redirectTo: '/admin/signin' });
            }}
          >
            <button className={styles.signoutRow} type="submit">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5M21 12H9" />
              </svg>
              <span>Sign out</span>
            </button>
          </form>
        </div>

      </aside>

      <div className={styles.main}>
        {/* Above the page's own sticky topbar, so it scrolls away rather than
            permanently eating a strip of a screen it never blocks. */}
        <VerifyBanner user={user} />
        {children}
      </div>
    </>
  );
}
