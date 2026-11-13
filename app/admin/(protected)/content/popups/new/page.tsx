import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import PopupForm from '../PopupForm';
import AdminTopbar from '../../../AdminTopbar';
import styles from '../../../../admin.module.css';

/**
 * New popup — the destination of the list's "New popup" button.
 *
 * The screen itself is PopupForm, the same component the edit page renders, so
 * writing a popup and revising one are one interface rather than two that
 * drift apart. Its defaults are the honest ones: every page, a second's delay,
 * no schedule. Everything is created as a draft (the backend insists);
 * publishing stays an explicit choice.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'New popup',
  robots: { index: false, follow: false },
};

export default async function NewPopupPage() {
  const user = await requireUser();

  return (
    <>
      <AdminTopbar title="New popup" subtitle="A draft — nothing is shown until you publish it" />
      <div className={styles.view}>
        <PopupForm popup={null} canEdit={canEditContent(user.role)} />
      </div>
    </>
  );
}
