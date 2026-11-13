import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { apiServer } from '@/lib/api/server';
import { isApiError } from '@/lib/api/errors';
import type { AdminReviewDetail } from '@/lib/api/reviews';
import { SOURCE_LABEL } from '../display';
import ReviewEditor from './ReviewEditor';
import AdminTopbar from '../../../AdminTopbar';
import styles from '../../../../admin.module.css';

/**
 * Edit one review.
 *
 * The list at /admin/content/reviews used to carry a form per row, which put a
 * text box under every quote as the resting state of the screen. Editing now
 * lives here, behind the edit button, and this page is built around the one
 * task that brings anybody to it: comparing a row against the original.
 *
 * Every field's label says what the source prints, not what the field means to
 * us — "Date, exactly as the source prints it" rather than "Date". These are
 * transcription boxes. A label that reads like a content field invites somebody
 * to improve the wording, and improving somebody else's testimonial is
 * fabricating one.
 *
 * The API returns the review with its source's ids in order (siblingIds), which
 * is what the move controls reorder and send back as PUT /admin/reviews/order.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit review',
  robots: { index: false, follow: false },
};

export default async function EditReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  const mayEdit = canEditContent(user.role);

  let row: AdminReviewDetail;
  try {
    row = await apiServer<AdminReviewDetail>(`/admin/reviews/${encodeURIComponent(id)}`);
  } catch (err) {
    // 400: not a uuid; 404: no such review.
    if (isApiError(err, 404) || isApiError(err, 400)) notFound();
    throw err;
  }

  const label = SOURCE_LABEL[row.source] ?? row.source;

  return (
    <>
      <AdminTopbar
        title="Edit review"
        subtitle={
          <>
            By <strong>{row.author}</strong> on {label}
          </>
        }
        action={
          <Link
            className={`${styles.btn} ${styles.btnGhost}`}
            href={`/admin/content/reviews?tab=${row.source}`}
          >
            ← All {label} reviews
          </Link>
        }
      />
      <ReviewEditor review={row} mayEdit={mayEdit} />
    </>
  );
}
