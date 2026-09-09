import Link from 'next/link';
import { getDb, isDatabaseConfigured } from '@/db';
import { requireUser } from '@/lib/auth/require';
import { canEditRates } from '@/lib/auth/roles';
import { addAgentTier, addCoverageOption } from '../actions';
import AdminTopbar from '../../AdminTopbar';
import RateKindSelect from './KindSelect';
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
 * The actions (addCoverageOption / addAgentTier) re-check the admin gate and
 * log the add, exactly as the inline forms on the list do.
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

  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminTopbar title={title} subtitle={SUBTITLE} />
        <div className={styles.view}>
          <BackRow />
          <div className={styles.notice}>
            <strong>No database configured</strong>
            There is no <code>DATABASE_URL</code> in this environment, so the price list
            cannot be read.
          </div>
        </div>
      </>
    );
  }

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

  // The DB is only touched to prove it is reachable; the page needs no rows.
  await getDb();

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

          {kind === 'coverage' ? (
            <form action={addCoverageOption}>
              <div className={styles.formGrid2}>
                <Field
                  id="k"
                  name="key"
                  label="Key"
                  placeholder="e.g. team-shift"
                  pattern="[a-z0-9][a-z0-9\-]*"
                  title="Lowercase letters, digits and hyphens — the quote calculator matches on it"
                  maxLength={32}
                  hint="Permanent — the quote calculator matches on it"
                  required
                  autoFocus
                />
                <Field
                  id="l"
                  name="label"
                  label="Label"
                  placeholder="Part-time"
                  maxLength={80}
                  required
                />
              </div>

              <Field
                id="ll"
                name="longLabel"
                label="Long label"
                placeholder="How this reads inside a quote sentence"
                maxLength={160}
                hint="Used mid-sentence in a quote, so it reads lowercase"
              />

              <div className={styles.formGrid2}>
                <Field
                  id="st"
                  name="seats"
                  label="Seats"
                  type="number"
                  min={1}
                  max={99}
                  defaultValue={1}
                  required
                />
                <Field
                  id="mh"
                  name="monthlyHours"
                  label="Monthly hours"
                  type="number"
                  min={1}
                  max={9999}
                  defaultValue={160}
                  required
                />
              </div>

              <div className={styles.memberSubmitRow}>
                <button className={styles.memberSubmitBtn} type="submit">
                  Add coverage option
                </button>
                <span className={styles.memberSubmitNote}>
                  Quoted immediately, and logged with your name.
                </span>
              </div>
            </form>
          ) : (
            <form action={addAgentTier}>
              <div className={styles.formGrid2}>
                <Field
                  id="tk"
                  name="key"
                  label="Key"
                  placeholder="e.g. senior"
                  pattern="[a-z0-9][a-z0-9\-]*"
                  title="Lowercase letters, digits and hyphens — the quote calculator matches on it"
                  maxLength={32}
                  hint="Permanent — the quote calculator matches on it"
                  required
                  autoFocus
                />
                <Field
                  id="tl"
                  name="label"
                  label="Tier"
                  placeholder="Senior"
                  maxLength={80}
                  required
                />
              </div>

              <div className={styles.formGrid2}>
                <Field
                  id="tr"
                  name="hourlyRateUsd"
                  label="Hourly rate (USD)"
                  type="number"
                  min={0.01}
                  max={9999}
                  step={0.01}
                  hint="What one hour at this tier costs"
                  required
                />
                <Field
                  id="tn"
                  name="note"
                  label="Note (optional)"
                  placeholder="What this tier buys, in a salesperson's words"
                  maxLength={160}
                />
              </div>

              <div className={styles.memberSubmitRow}>
                <button className={styles.memberSubmitBtn} type="submit">
                  Add agent tier
                </button>
                <span className={styles.memberSubmitNote}>
                  Live in the quote calculator immediately, and logged with your name.
                </span>
              </div>
            </form>
          )}
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

/** A labelled field in the card, with the hint it needs and nothing more. */
function Field({
  id,
  label,
  hint,
  ...rest
}: {
  id: string;
  label: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={styles.memberFieldGroup}>
      <label className={styles.memberFieldLabel} htmlFor={id}>{label}</label>
      <input className={styles.memberFieldInput} id={id} {...rest} />
      {hint && <span className={styles.memberFieldHelper}>{hint}</span>}
    </div>
  );
}
