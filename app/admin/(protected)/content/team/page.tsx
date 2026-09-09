import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { teamMembers } from '@/db/schema';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { teamMessage } from './messages';
import AdminTopbar from '../../AdminTopbar';
import TeamMemberDirectory from './TeamMemberDirectory';
import styles from '../../../admin.module.css';

/**
 * The Team CMS list — "The people behind the services".
 *
 * Designed with a 3-column responsive card grid inspired by the admin mockup:
 * large rounded-corner photo avatars, bold name, role, department tag badges
 * with department-specific colors, status indicators, and three-dots action menu.
 *
 * Includes integrated status filtering, interactive search & tag filter drawer,
 * sort controls, and grid/list view toggles.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Team',
  robots: { index: false, follow: false },
};

export default async function TeamListPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const message = teamMessage(sp.ok, sp.error);
  const mayEdit = canEditContent(user.role);

  if (!isDatabaseConfigured()) {
    return (
      <>
        <Topbar />
        <div className={styles.view}>
          <div className={styles.notice}>
            <strong>No database configured</strong>
            There is no <code>DATABASE_URL</code> in this environment, so there is nothing to
            edit.
          </div>
        </div>
      </>
    );
  }

  const db = getDb();
  const rows = await db.select().from(teamMembers).orderBy(asc(teamMembers.sortOrder));

  return (
    <>
      <Topbar />

      <div className={styles.view}>
        {message && (
          <p
            className={`${styles.signinMsg} ${message.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
            role="status"
          >
            {message.text}
          </p>
        )}

        <TeamMemberDirectory members={rows} mayEdit={mayEdit} />
      </div>
    </>
  );
}

function Topbar() {
  return (
    <AdminTopbar
      title="Team"
      subtitle="The people behind the services"
      hideSearch={true}
      action={
        <Link href="/admin/content/team/new" className={styles.btnHeader}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add member
        </Link>
      }
    />
  );
}