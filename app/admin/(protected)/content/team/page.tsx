import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { apiServer } from '@/lib/api/server';
import type { AdminTeamMember } from '@/lib/api/team';
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

export default async function TeamListPage() {
  const user = await requireUser();
  const mayEdit = canEditContent(user.role);
  const rows = await apiServer<AdminTeamMember[]>('/admin/team');

  return (
    <>
      <Topbar />

      <div className={styles.view}>
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