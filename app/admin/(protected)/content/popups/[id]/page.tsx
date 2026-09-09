import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { popups } from '@/db/schema';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { popupMessage } from '../messages';
import PopupForm from '../PopupForm';
import AdminTopbar from '../../../AdminTopbar';
import styles from '../../../../admin.module.css';

/**
 * Edit one popup — the same screen as New popup, opened on an ad that exists.
 *
 * The list used to be the whole feature; now the list is a list and both
 * writing and revising run through PopupForm (see that file for why it is a
 * client component and what the publish gate reads). Everything the form does
 * still lands on the same server actions, so the hard rules — the unique
 * tracking key, the http(s) CTA link, the end-after-start schedule, the image
 * upload — are enforced server-side rather than merely by the form.
 *
 * Stored schedule instants are rendered back into datetime-local values in
 * this server's own local time, which is the inverse of the action's parse —
 * see the note in actions.ts.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit popup',
  robots: { index: false, follow: false },
};

/** A stored instant → the "YYYY-MM-DDTHH:MM" a datetime-local input wants. */
function dateTimeLocal(value: Date | null | undefined): string {
  if (!value) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${p(value.getMonth() + 1)}-${p(value.getDate())}T${p(value.getHours())}:${p(value.getMinutes())}`;
}

export default async function EditPopupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [user, { id }, sp] = await Promise.all([requireUser(), params, searchParams]);
  const message = popupMessage(sp.ok, sp.error);
  const mayEdit = canEditContent(user.role);

  if (!isDatabaseConfigured()) notFound();

  const db = getDb();
  const [p] = await db.select().from(popups).where(eq(popups.id, id)).limit(1);
  if (!p) notFound();

  return (
    <>
      <AdminTopbar title="Edit popup" subtitle={p.name} />

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
          mode="edit"
          canEdit={mayEdit}
          values={{
            id: p.id,
            name: p.name,
            title: p.title,
            message: p.message,
            image: p.image ?? '',
            ctaLabel: p.ctaLabel,
            ctaHref: p.ctaHref,
            campaign: p.campaign,
            trackingKey: p.trackingKey,
            placement: p.placement,
            template: p.template,
            startsAt: dateTimeLocal(p.startsAt),
            endsAt: dateTimeLocal(p.endsAt),
            delaySeconds: p.delaySeconds,
            displaySeconds: p.displaySeconds,
            published: p.published,
          }}
        />
      </div>
    </>
  );
}