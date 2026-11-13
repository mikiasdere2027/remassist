import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { canDeleteFaqItem, canEditContent } from '@/lib/auth/roles';
import { apiServer } from '@/lib/api/server';
import type { FaqAdminGroup } from '@/lib/api/faq';
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

  const groups = await apiServer<FaqAdminGroup[]>('/admin/faq/groups');

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
              Add a section from the Sections view of the FAQ list first — a question has to live in one.
            </p>
          </section>
        ) : (
          <NewFaqForm
            groups={groups.map((g) => ({ id: g.id, title: g.title }))}
            mayWrite={mayWrite}
            mayDelete={canDeleteFaqItem(user.role)}
          />
        )}
      </div>
    </>
  );
}
