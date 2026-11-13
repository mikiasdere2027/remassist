import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/require';
import { canDeleteFaqItem, canEditContent } from '@/lib/auth/roles';
import { apiServer } from '@/lib/api/server';
import { isApiError } from '@/lib/api/errors';
import type { FaqAdminGroup, FaqItemDetail } from '@/lib/api/faq';
import AdminTopbar from '../../../AdminTopbar';
import FaqItemEditor from './FaqItemEditor';
import styles from '../../../../admin.module.css';

/**
 * Edit one FAQ question: its wording, its place in its section (or another
 * section), whether it is live, and its place on the homepage card.
 *
 * Read from GET /v1/admin/faq/items/:id, which also returns the ids of its
 * section and of the homepage card in order — what the move controls need.
 * Every change is an API call from FaqItemEditor followed by a refresh.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit answer',
  robots: { index: false, follow: false },
};

export default async function EditFaqItemPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  const mayEdit = canEditContent(user.role);

  /* A malformed id is a 400 from ParseUUIDPipe; either way there is no such question. */
  const row = await apiServer<FaqItemDetail>(`/admin/faq/items/${encodeURIComponent(id)}`).catch(
    (err: unknown) => {
      if (isApiError(err, 404) || isApiError(err, 400)) notFound();
      throw err;
    },
  );
  const groups = mayEdit ? await apiServer<FaqAdminGroup[]>('/admin/faq/groups') : [];

  return (
    <>
      <AdminTopbar
        title="Edit answer"
        subtitle={
          <>
            In <strong>{row.group.title}</strong> · shown on{' '}
            <code>/faq#{row.group.slug}</code>
          </>
        }
        action={
          <Link className={`${styles.btn} ${styles.btnGhost}`} href="/admin/content/faq">
            ← All questions
          </Link>
        }
      />

      <div className={styles.view}>
        <FaqItemEditor
          key={row.id}
          row={row}
          groups={groups.map((g) => ({ id: g.id, title: g.title }))}
          mayEdit={mayEdit}
          mayDelete={canDeleteFaqItem(user.role)}
        />
      </div>
    </>
  );
}
