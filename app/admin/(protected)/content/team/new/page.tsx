import Link from 'next/link';
import { count } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { teamMembers } from '@/db/schema';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { addTeamMember } from '../actions';
import MemberForm from '../MemberForm';
import AdminTopbar from '../../../AdminTopbar';
import styles from '../../../../admin.module.css';

/**
 * Add a team member — redesigned to match the inspiration mockup.
 *
 * Created as a draft, so the initial check happens before anything reaches the
 * homepage — the same rule every other content table follows.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Add member',
  robots: { index: false, follow: false },
};

export default async function NewTeamMemberPage() {
  const user = await requireUser();
  const mayEdit = canEditContent(user.role);

  /* How many are already on the homepage, so the order field can offer the
     next number up. Without a database there is nothing to count and the field
     is simply the first slot. */
  const existing = isDatabaseConfigured()
    ? Number((await getDb().select({ n: count() }).from(teamMembers))[0]?.n ?? 0)
    : 0;
  const nextPosition = existing + 1;

  return (
    <>
      <AdminTopbar
        title="Add member"
        subtitle="The people behind the services"
      />

      <div className={styles.view}>
        {/* Back on the left, the order field on the right — the same row and
            the same control the edit screen has, so where a member sits is set
            in one place whether you are adding or changing one. */}
        <div className={styles.memberTopRow}>
          <Link className={styles.memberBackBtn} href="/admin/content/team">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to members
          </Link>

          {mayEdit && (
            <div className={styles.memberTopActions}>
              {/* Part of the form below, not a form of its own: there is no
                  member to reorder yet, so the position is applied by the add
                  itself. `form=` is what carries it across. */}
              <div className={styles.memberOrderForm}>
                <label className={styles.memberOrderLabel} htmlFor="position">Order</label>
                <input
                  className={styles.memberOrderInput}
                  form="member-form"
                  id="position"
                  name="position"
                  type="number"
                  min={1}
                  max={nextPosition}
                  step={1}
                  defaultValue={nextPosition}
                  aria-label={`Position on the homepage, 1 to ${nextPosition}`}
                />
                <span className={styles.memberOrderOf}>of {nextPosition}</span>
              </div>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <section className={styles.memberFormCard}>
          <div className={styles.memberFormHeader}>
            <h2 className={styles.memberFormTitle}>Profile</h2>
            <p className={styles.memberFormSub}>Create a draft member profile</p>
          </div>

          <MemberForm action={addTeamMember} canEdit={mayEdit} />
        </section>
      </div>
    </>
  );
}