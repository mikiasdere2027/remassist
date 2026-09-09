import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { reviewSources } from '@/db/schema';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import AdminTopbar from '../../../AdminTopbar';
import NewReviewForm from './NewReviewForm';
import styles from '../../../../admin.module.css';

/**
 * Add a review — the destination of the header's blue "Add review" button.
 *
 * A clean page rather than an inline form on the list, so transcribing a quote
 * against its source gets the same room the edit page gives it. The source
 * dropdown chooses Trustpilot or Google; the headline the different sources
 * print is handled by the picker's headline field.
 *
 * The form itself is a client component (NewReviewForm). It is a
 * `useActionState` form so a refused save returns the error to the fields as
 * typed rather than reloading the page and losing the quote.
 *
 * Laid out as the team member editor and the rates add page are: back button
 * on its own row above the card, one white form card under a heading. Three
 * "add a thing" screens in the same admin that look like different products is
 * a cost paid by whoever uses more than one.
 *
 * Whatever the source, the review is saved hidden — publishing from the list
 * happens only after the transcription has been checked against the original,
 * and addReview enforces that (published: false).
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Add review',
  robots: { index: false, follow: false },
};

const SUBTITLE = 'One quote, transcribed exactly as the source prints it';

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const mayWrite = canEditContent(user.role);

  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminTopbar title="Add review" subtitle={SUBTITLE} />
        <div className={styles.view}>
          <BackRow />
          <div className={styles.notice}>
            <strong>No database configured</strong>
            There is no <code>DATABASE_URL</code> in this environment, so there is nothing to
            edit.
          </div>
        </div>
      </>
    );
  }

  const db = getDb();
  const sources = await db.select().from(reviewSources).orderBy(asc(reviewSources.sortOrder));

  /* A source from the query string is only honoured if it names one that
     exists; the dropdown itself switches selection, so this is just the
     opening position (defaults to the first source). */
  const known = new Set<string>(sources.map((s) => s.source));
  const tab = sp.source && known.has(sp.source) ? sp.source : (sources[0]?.source ?? 'trustpilot');

  return (
    <>
      <AdminTopbar title="Add review" subtitle={SUBTITLE} />

      <div className={styles.view}>
        <BackRow />

        <section className={styles.memberFormCard}>
          <div className={styles.memberFormHeader}>
            <h2 className={styles.memberFormTitle}>New review</h2>
            <p className={styles.memberFormSub}>
              Added hidden, so you can check it against the original first
            </p>
          </div>

          <NewReviewForm sources={sources} initialSource={tab} canEdit={mayWrite} />
        </section>
      </div>
    </>
  );
}

/**
 * The back row above the card, matching the team editor's and the rates add
 * page's.
 *
 * Not an AdminTopbar action: a back link in the topbar sits level with the
 * page title and reads as part of the chrome, where this one reads as the way
 * out of the page under it.
 */
function BackRow() {
  return (
    <div className={styles.memberTopRow}>
      <Link className={styles.memberBackBtn} href="/admin/content/reviews">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to reviews
      </Link>
    </div>
  );
}
