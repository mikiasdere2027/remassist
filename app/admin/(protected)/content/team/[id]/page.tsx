import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { teamMembers } from '@/db/schema';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { saveTeamMember, setTeamMemberPosition, setTeamMemberPublished } from '../actions';
import { teamMessage } from '../messages';
import MemberForm from '../MemberForm';
import AdminTopbar from '../../../AdminTopbar';
import styles from '../../../../admin.module.css';

/**
 * Edit one team member — redesigned to match the inspiration mockup.
 *
 * Everything on this screen writes to one row: the details form, the publish
 * toggle and the reorder controls, mirroring the FAQ edit page's shape. There
 * is no delete — a member the site no longer lists has been unpublished, and
 * their card (and who the company once introduced) is kept.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit member',
  robots: { index: false, follow: false },
};

export default async function EditTeamMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [user, { id }, sp] = await Promise.all([requireUser(), params, searchParams]);
  const message = teamMessage(sp.ok, sp.error);
  const mayEdit = canEditContent(user.role);

  if (!isDatabaseConfigured()) notFound();

  const db = getDb();
  const [row] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.id, id))
    .limit(1);

  if (!row) notFound();

  /* Needed to know whether this is the first or last card, so the move controls
     can be disabled at the ends rather than failing silently. */
  const siblings = await db
    .select({ id: teamMembers.id, sortOrder: teamMembers.sortOrder })
    .from(teamMembers)
    .orderBy(asc(teamMembers.sortOrder));
  const at = siblings.findIndex((s) => s.id === row.id);

  return (
    <>
      <AdminTopbar
        title="Edit member"
        subtitle={
          row.published
            ? 'Live on the homepage. Saving revalidates it immediately.'
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
            <div className={styles.memberTopActions}>
              <form action={setTeamMemberPublished}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="published" value={row.published ? '0' : '1'} />
                <button className={`${styles.btn} ${styles.btnGhost}`} type="submit">
                  {row.published ? 'Take off the homepage' : 'Put it live'}
                </button>
              </form>

              {/* Type a position or step it — a number input gives both, and
                  either way it is one submit rather than one per place moved.
                  The action clamps and renumbers the run between. */}
              <form className={styles.memberOrderForm} action={setTeamMemberPosition}>
                <input type="hidden" name="id" value={row.id} />
                <label className={styles.memberOrderLabel} htmlFor="position">Order</label>
                <input
                  className={styles.memberOrderInput}
                  id="position"
                  name="position"
                  type="number"
                  min={1}
                  max={siblings.length}
                  step={1}
                  defaultValue={at + 1}
                  aria-label={`Position on the homepage, 1 to ${siblings.length}`}
                />
                <span className={styles.memberOrderOf}>of {siblings.length}</span>
                <button className={`${styles.btn} ${styles.btnGhost}`} type="submit">
                  Set
                </button>
              </form>
            </div>
          )}
        </div>

        {message && (
          <p
            className={`${styles.signinMsg} ${message.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
            role="status"
          >
            {message.text}
          </p>
        )}

        {/* Member Details Card */}
        <section className={styles.memberFormCard}>
          <div className={styles.memberFormHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className={styles.memberFormTitle}>Profile</h2>
              <p className={styles.memberFormSub}>
                Position {at + 1} of {siblings.length} on the homepage
              </p>
            </div>
            <span className={`${styles.pill} ${row.published ? styles.pillLow : styles.pillMed}`}>
              {row.published ? 'Published' : 'Draft'}
            </span>
          </div>

          <MemberForm
            isEdit={true}
            action={saveTeamMember}
            initialData={row}
            canEdit={mayEdit}
          />
        </section>
      </div>
    </>
  );
}