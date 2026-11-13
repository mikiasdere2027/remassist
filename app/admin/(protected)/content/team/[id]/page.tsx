import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { apiServer } from '@/lib/api/server';
import type { AdminTeamMember } from '@/lib/api/team';
import MemberForm from '../MemberForm';
import MemberPlacement from './MemberPlacement';
import AdminTopbar from '../../../AdminTopbar';
import styles from '../../../../admin.module.css';

/**
 * Edit one team member.
 *
 * Everything on this screen writes to one row: the details form, the publish
 * toggle and the reorder control. There is no delete — a member the site no
 * longer lists has been unpublished, and their card (and who the company once
 * introduced) is kept.
 *
 * Reads the whole list rather than GET /admin/team/:id: the order control
 * sends back every id (PUT /admin/team/order), so it needs them all anyway.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit member',
  robots: { index: false, follow: false },
};

export default async function EditTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  const mayEdit = canEditContent(user.role);

  const members = await apiServer<AdminTeamMember[]>('/admin/team');
  const at = members.findIndex((m) => m.id === id);
  if (at === -1) notFound();
  const row = members[at];

  return (
    <>
      <AdminTopbar
        title="Edit member"
        subtitle={
          row.published
            ? 'Live on the homepage. Saving updates it immediately.'
            : 'Not on the homepage. Put it live when the card is ready.'
        }
      />

      <div className={styles.view}>
        {/* Back on the left, the two placement controls on the right — they
            act on the member as a whole (where they sit on the homepage, and
            whether they are on it), not on any field in the form below. */}
        <div className={styles.memberTopRow}>
          <Link className={styles.memberBackBtn} href="/admin/content/team">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to members
          </Link>

          {mayEdit && (
            <MemberPlacement
              id={row.id}
              published={row.published}
              orderIds={members.map((m) => m.id)}
            />
          )}
        </div>

        {/* Member Details Card */}
        <section className={styles.memberFormCard}>
          <div className={styles.memberFormHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className={styles.memberFormTitle}>Profile</h2>
              <p className={styles.memberFormSub}>
                Position {at + 1} of {members.length} on the homepage
              </p>
            </div>
            <span className={`${styles.pill} ${row.published ? styles.pillLow : styles.pillMed}`}>
              {row.published ? 'Published' : 'Draft'}
            </span>
          </div>

          <MemberForm isEdit={true} initialData={row} canEdit={mayEdit} />
        </section>
      </div>
    </>
  );
}
