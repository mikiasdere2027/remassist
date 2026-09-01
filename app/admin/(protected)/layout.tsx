import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { isAllowedEmail } from '@/lib/auth/allowlist';
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
 * Sidebar and topbar follow the "Test Admin" prototype. Only Leads is built;
 * the other sections in that prototype are later phases and are deliberately
 * absent rather than present-and-dead.
 */

/* Session-dependent: prerendering would bake one person's view into HTML. */
export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = session?.user?.email;
  if (!isAllowedEmail(email)) redirect('/admin/signin');

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/rem-logo.svg" alt="Rem Assist" />
          <span className={styles.brandLabel}>Admin</span>
        </div>

        <nav className={styles.navScroll} aria-label="Admin sections">
          <div className={styles.navGroup}>
            <div className={styles.navGroupTitle}>Pipeline</div>
            <Link className={`${styles.navLink} ${styles.active}`} href="/admin/leads">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 12h5l2 3h4l2-3h5" />
                <path d="M4 5h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
              </svg>
              <span>Leads</span>
            </Link>
          </div>
        </nav>

        <div className={styles.sidebarFoot}>
          <span className={styles.who}>{email}</span>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/admin/signin' });
            }}
          >
            <button className={styles.signout} type="submit">Sign out</button>
          </form>
        </div>
      </aside>

      <div className={styles.main}>{children}</div>
    </>
  );
}
