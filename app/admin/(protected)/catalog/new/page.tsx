import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { canEditRates } from '@/lib/auth/roles';
import AdminTopbar from '../../AdminTopbar';
import RateKindSelect from './KindSelect';
import NewRateForm from './NewRateForm';
import styles from '../../../admin.module.css';

/**
 * Add to the price list — the destination of the header's "Add option"
 * button. One clean page for both tables: a dropdown switches between a
 * coverage option and an agent tier, so adding a row never means losing your
 * place in the list to get to an inline form.
 *
 * Laid out as the team member editor is, and deliberately: back button on its
 * own row above the card, the kind picker opposite it where that screen puts
 * the order field, and one white form card under a heading. Two "add a thing"
 * screens in the same admin that look like different products is a cost paid
 * by whoever uses both.
 *
 * NewRateForm posts to the backend (POST /v1/admin/catalog/coverage-options
 * or /tiers), which re-checks the admin role and logs the add.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Add option',
  robots: { index: false, follow: false },
};

export default async function NewRatePage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const mayEdit = canEditRates(user.role);
  const kind: 'coverage' | 'tier' = sp.kind === 'tier' ? 'tier' : 'coverage';
  const title = kind === 'tier' ? 'Add agent tier' : 'Add coverage option';

  if (!mayEdit) {
    return (
      <>
        <AdminTopbar title={title} subtitle="Rates are the price list — editing is admin only" />
        <div className={styles.view}>
          <BackRow />
          <div className={styles.notice}>
            <strong>Only the admin changes rates.</strong>
            Editing here changes what the site quotes, so the controls are hidden below the
            admin role.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminTopbar title={title} subtitle={SUBTITLE} />

      <div className={styles.view}>
        {/* Back on the left, the kind picker on the right — the row the team
            editor puts its order field in. Switching kind navigates, so it
            belongs above the card rather than inside the form it replaces. */}
        <BackRow>
          <div className={styles.memberOrderForm}>
            <span className={styles.memberOrderLabel}>Adding</span>
            <RateKindSelect value={kind} />
          </div>
        </BackRow>

        <section className={styles.memberFormCard}>
          <div className={styles.memberFormHeader}>
            <h2 className={styles.memberFormTitle}>
              {kind === 'tier' ? 'New agent tier' : 'New coverage option'}
            </h2>
            <p className={styles.memberFormSub}>
              {kind === 'tier'
                ? 'The hourly rate new quotes are priced at'
                : 'Seats × monthly hours — what a quote is sized against'}
            </p>
          </div>

          <NewRateForm key={kind} kind={kind} />
        </section>
      </div>
    </>
  );
}

const SUBTITLE = 'Coverage options and agent tiers — the price list';

/**
 * The back row above the card, matching the team editor's.
 *
 * Not an AdminTopbar action: a back link in the topbar sits level with the
 * page title and reads as part of the chrome, where this one reads as the way
 * out of the page under it. `children` is whatever the screen puts opposite.
 */
function BackRow({ children }: { children?: React.ReactNode }) {
  return (
    <div className={styles.memberTopRow}>
      <Link className={styles.memberBackBtn} href="/admin/catalog">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to rates
      </Link>
      {children && <div className={styles.memberTopActions}>{children}</div>}
    </div>
  );
}
