import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { faqGroups } from '@/db/schema';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import AdminTopbar from '../../../AdminTopbar';
import NewFaqForm from './NewFaqForm';
import styles from '../../../../admin.module.css';

/**
 * Add question — supports Section & Question in 2-column layout, full-width Answer,
 * and multi-question addition with an accordion showing added questions at the top
 * (maximum 10 FAQs per page).
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Add question',
  robots: { index: false, follow: false },
};

export default async function NewFaqQuestionPage() {
  const user = await requireUser();
  const mayWrite = canEditContent(user.role);

  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminTopbar
          title="Add question"
          subtitle="The questions that sell the process"
          action={
            <Link className={`${styles.btn} ${styles.btnGhost}`} href="/admin/content/faq">
              ← All questions
            </Link>
          }
        />
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

  const groups = await getDb().select().from(faqGroups).orderBy(asc(faqGroups.sortOrder));

  return (
    <>
      <AdminTopbar
        title="Add question"
        subtitle="The questions that sell the process"
        action={
          <Link className={`${styles.btn} ${styles.btnGhost}`} href="/admin/content/faq">
            ← All questions
          </Link>
        }
      />

      <div className={styles.view}>
        {groups.length === 0 ? (
          <section className={`${styles.panel} ${styles.section}`}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>New question</h2>
              </div>
            </div>
            <p className={styles.empty}>
              <strong>No sections yet</strong>
              Add a section on the FAQ list first — a question has to live in one.
            </p>
          </section>
        ) : (
          <NewFaqForm groups={groups} mayWrite={mayWrite} />
        )}
      </div>
    </>
  );
}