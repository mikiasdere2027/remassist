import { isDatabaseConfigured } from '@/db';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { popupMessage } from '../messages';
import PopupForm from '../PopupForm';
import AdminTopbar from '../../../AdminTopbar';
import styles from '../../../../admin.module.css';

/**
 * New popup — the destination of the list's "New popup" button.
 *
 * The screen itself is PopupForm, the same component the edit page renders, so
 * writing a popup and revising one are one interface rather than two that
 * drift apart. PopupForm also carries the way back to the list, beside the
 * editor's tabs. This page's job is the things only the server can do: check
 * who is asking, and choose what an empty popup starts as.
 *
 * The defaults are the honest ones: no campaign yet, every page, maybe a couple
 * of seconds' delay before it appears, and no schedule — an empty start time
 * means "as soon as it is published", which is what a new draft wants. Everything
 * is created as a draft; publishing stays an explicit choice from the list.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'New popup',
  robots: { index: false, follow: false },
};

export default async function NewPopupPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const message = popupMessage(sp.ok, sp.error);
  const mayWrite = canEditContent(user.role);

  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminTopbar title="New popup" subtitle="Pop-up ads — content, placement and tracking" />
        <div className={styles.view}>
          <div className={styles.notice}>
            <strong>No database configured</strong>
            There is no <code>DATABASE_URL</code> in this environment, so there is nothing to
            create.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminTopbar title="New popup" subtitle="A draft — nothing is shown until you publish it" />

      <div className={styles.view}>
        {message && (
          <p
            className={`${styles.signinMsg} ${message.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
            role="status"
          >
            {message.text}
          </p>
        )}

        <PopupForm
          mode="new"
          canEdit={mayWrite}
          values={{
            id: '',
            name: '',
            title: '',
            message: '',
            image: '',
            ctaLabel: '',
            ctaHref: '',
            campaign: '',
            trackingKey: '',
            placement: 'everywhere',
            template: 'corner',
            startsAt: '',
            endsAt: '',
            delaySeconds: 1,
            displaySeconds: null,
            published: false,
          }}
        />
      </div>
    </>
  );
}