import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { isApiError } from '@/lib/api/errors';
import type { AdminPopup } from '@/lib/api/popups';
import { apiServer } from '@/lib/api/server';
import PopupForm from '../PopupForm';
import AdminTopbar from '../../../AdminTopbar';
import styles from '../../../../admin.module.css';

/**
 * Edit one popup — the same screen as New popup, opened on an ad that exists.
 * Reads GET /v1/admin/popups/:id; PopupForm saves, publishes and suspends
 * through the API and refreshes this page.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit popup',
  robots: { index: false, follow: false },
};

export default async function EditPopupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [user, { id }, sp] = await Promise.all([requireUser(), params, searchParams]);

  let popup: AdminPopup;
  try {
    popup = await apiServer<AdminPopup>(`/admin/popups/${encodeURIComponent(id)}`);
  } catch (err) {
    // 400: not a UUID; 404: no such popup.
    if (isApiError(err, 404) || isApiError(err, 400)) notFound();
    throw err;
  }

  return (
    <>
      <AdminTopbar title="Edit popup" subtitle={popup.name} />

      <div className={styles.view}>
        {sp.created && (
          <p className={`${styles.signinMsg} ${styles.msgOk}`} role="status">
            Popup created as a draft. It is shown nowhere until you publish it.
          </p>
        )}

        <PopupForm popup={popup} canEdit={canEditContent(user.role)} />
      </div>
    </>
  );
}
