import Link from 'next/link';
import { asc, desc } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { agentTiers, coverageOptions, rateChanges, serviceCategories } from '@/db/schema';
import { requireUser } from '@/lib/auth/require';
import { canEditRates } from '@/lib/auth/roles';
import { formatDate } from '@/lib/leads/display';
import {
  saveAgentTier, saveCoverageOption, setCoverageActive, setTierActive,
} from './actions';
import { rateMessage } from './messages';
import RowMenu from './RowMenu';
import AdminTopbar from '../AdminTopbar';
import InfoTooltip from '../InfoTooltip';
import styles from '../../admin.module.css';

/**
 * Rates — the published price list of record.
 *
 * These tables are the single source of truth for the prices shown on the
 * public site. `components/services/SeatTiers.tsx`, `app/services/page.tsx`,
 * and `app/pricing/page.tsx` all read from `agent_tiers` via
 * `lib/rates/getPublishedTiers()` at render time — an edit here is live on
 * the next page load.
 *
 * `lib/quiz/quiz.ts` still carries its own inline rates, guarded by a 432-case
 * parity test. Point it at these tables only with that test green on both sides.
 *
 * Editing is admin-only, and the reasoning is in canEditRates: canEditContent
 * is deliberately generous because a wrong word is visible and reversible, and
 * a wrong price is neither. A manager sees this screen with no controls on it,
 * which is the useful half — knowing what a row currently says.
 *
 * Nothing is deleted. The trash icon deactivates, keeping the figure and taking
 * it out of new quotes, because a rate that has been quoted is part of the
 * record of what this business charged. Every write is logged to rate_changes
 * with the editor's name, and the last panel on this page shows that log — a
 * promise of an audit trail that cannot be read is not one.
 *
 * The forms live in the row's own place in the table rather than on a page of
 * their own. Four coverage options and three tiers is not a list worth losing
 * your place in, and the fields are few enough to fit the row's width.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Rates',
  robots: { index: false, follow: false },
};

/** How many audit rows the log panel shows before it stops being scannable. */
const LOG_ROWS = 12;

/** Fallback for the "monthly · full-time" column when there is no ft row. */
const FULL_TIME_HOURS = 160;

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

type Search = {
  ok?: string;
  error?: string;
  /** `coverage:<key>` or `tier:<key>` — the row whose edit form is open. */
  edit?: string;
  /** `coverage:<key>` or `tier:<key>` — the row asking to be deactivated. */
  off?: string;
  /** `coverage` (default) or `tiers` — which table the tabs are showing. */
  tab?: string;
};

/**
 * Splits `coverage:pt` into a table and a key.
 *
 * One parameter rather than four, so opening any form closes every other one:
 * two edit forms open at once in a price list is an invitation to save the
 * wrong row.
 */
function target(value: string | undefined, table: 'coverage' | 'tier'): string | null {
  if (!value) return null;
  const [t, ...rest] = value.split(':');
  const key = rest.join(':');
  return t === table && key ? key : null;
}

export default async function RatesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const message = rateMessage(sp.ok, sp.error);
  const mayEdit = canEditRates(user.role);

  if (!isDatabaseConfigured()) {
    return (
      <>
        <Topbar mayEdit={mayEdit} />
        <div className={styles.view}>
          <div className={styles.notice}>
            <strong>No database configured</strong>
            There is no <code>DATABASE_URL</code> in this environment, so the price list
            cannot be read.
          </div>
        </div>
      </>
    );
  }

  const db = getDb();
  const [coverage, tiers, categories, changes] = await Promise.all([
    db.select().from(coverageOptions).orderBy(asc(coverageOptions.sortOrder)),
    db.select().from(agentTiers).orderBy(asc(agentTiers.sortOrder)),
    db.select().from(serviceCategories).orderBy(asc(serviceCategories.sortOrder)),
    db.select().from(rateChanges).orderBy(desc(rateChanges.changedAt)).limit(LOG_ROWS),
  ]);

  /* A form only opens for somebody who may submit it — otherwise the query
     string alone would render a manager a set of controls that every action
     behind them refuses. */
  const editCoverage = mayEdit ? target(sp.edit, 'coverage') : null;
  const editTier = mayEdit ? target(sp.edit, 'tier') : null;
  const offCoverage = mayEdit ? target(sp.off, 'coverage') : null;
  const offTier = mayEdit ? target(sp.off, 'tier') : null;
  /* Which of the two price tables is on screen. Coverage is the default
     because it is what a quote is sized by before it is priced. */
  const tab: 'coverage' | 'tiers' = sp.tab === 'tiers' ? 'tiers' : 'coverage';
  /* Every link out of a row has to come back to the tab it was on — a Cancel
     that lands you on the other table is a Cancel that lost your place. */
  const listHref = tab === 'tiers' ? '/admin/catalog?tab=tiers' : '/admin/catalog';
  const rowHref = (q: string) => `${listHref}${listHref.includes('?') ? '&' : '?'}${q}`;

  /* The divisor behind the monthly column, read from the price list rather
     than hardcoded beside it: if somebody changes what a full-time month is,
     the arithmetic and the sentence explaining it both follow. */
  const fullTimeHours =
    coverage.find((c) => c.key === 'ft')?.monthlyHours ?? FULL_TIME_HOURS;

  const empty = coverage.length === 0 && tiers.length === 0;

  return (
    <>
      <Topbar mayEdit={mayEdit} />

      <div className={styles.view}>
        {message && (
          <p
            className={`${styles.signinMsg} ${message.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
            role="status"
          >
            {message.text}
          </p>
        )}

        {empty && (
          <div className={`${styles.notice} ${styles.section}`}>
            <strong>The price list is empty</strong>
            Both rate tables have no rows, so the quiz is working from the figures that live
            inline in <code>lib/quiz/quiz.ts</code> rather than reading these. Run{' '}
            <code>npm run db:seed</code> to populate them.
          </div>
        )}

        {/* Said on the screen rather than only in the tooltip beside the panel
            title: the risk this warns about is somebody editing a rate,
            believing the site now quotes it, and repeating the new figure to a
            prospect. That is not a thing to leave to a hover. */}
        {!empty && (
          <div className={`${styles.notice} ${styles.section}`}>
            <strong>Not connected to the public site yet</strong>
            These are the figures of record. The site quotes from its own copy of them — the
            fit finder from <code>lib/quiz/quiz.ts</code>, the published $8 and $11 from the
            page components — so a change here does not change what a visitor is quoted.
            Wiring them up is MIGRATION-PLAN §6.3.
          </div>
        )}

        {/* One table on screen at a time. They are read for different
            questions — how big is a subscription, and what does an hour cost —
            and stacking both made the page a scroll rather than a screen. */}
        <div className={styles.filterbar}>
          <div className={styles.filterPills} role="group" aria-label="Which rate table to show">
            <Tab
              href="/admin/catalog"
              on={tab === 'coverage'}
              label="Coverage options"
              count={coverage.length}
            />
            <Tab
              href="/admin/catalog?tab=tiers"
              on={tab === 'tiers'}
              label="Agent tiers"
              count={tiers.length}
            />
          </div>
        </div>

        {/* ---------- coverage options ---------- */}
        {tab === 'coverage' && (
        <section className={`${styles.panel} ${styles.section}`}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Coverage options</h2>
              <p className={styles.panelSub}>
                How a subscription can be shaped — seats × monthly hours
              </p>
            </div>
            <InfoTooltip
              text={
                mayEdit
                  ? 'The price list of record. The public site still carries its own copy of these figures, so an edit here does not change what the site quotes yet. Every change is confirmed once and logged with your name.'
                  : 'The price list of record. The public site still carries its own copy of these figures, so an edit here does not change what the site quotes yet. Only the admin may change them.'
              }
              position="bottom-left"
              maxWidth={280}
            />
          </div>

          {coverage.length === 0 ? (
            <p className={styles.empty}>
              <strong>No coverage options</strong>
              Nothing to size a quote against.
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Long label</th>
                    <th>Seats</th>
                    <th>Monthly hours</th>
                    {mayEdit && <th className={styles.thActions}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {coverage.map((c) => {
                    if (editCoverage === c.key) {
                      return (
                        <tr key={c.key}>
                          <td className={styles.editCell} colSpan={5}>
                            <form className={styles.editForm} action={saveCoverageOption}>
                              <input type="hidden" name="key" value={c.key} />
                              <Field label="Label" name="label" formId={`c-${c.key}`} defaultValue={c.label} autoFocus />
                              <Field
                                formId={`c-${c.key}`}
                                label="Long label"
                                name="longLabel"
                                defaultValue={c.longLabel}
                                className={styles.editWide}
                                hint="How this reads inside a quote sentence"
                              />
                              <Field
                                formId={`c-${c.key}`}
                                label="Seats"
                                name="seats"
                                defaultValue={String(c.seats)}
                                type="number"
                                min={1}
                                max={99}
                                className={styles.editNarrow}
                              />
                              <Field
                                formId={`c-${c.key}`}
                                label="Monthly hours"
                                name="monthlyHours"
                                defaultValue={String(c.monthlyHours)}
                                type="number"
                                min={1}
                                max={9999}
                                className={styles.editNarrow}
                              />
                              <Confirm id={`c-${c.key}`} />
                              <div className={styles.rowActions} style={{ padding: 0 }}>
                                <button
                                  className={`${styles.btn} ${styles.btnPrimary}`}
                                  type="submit"
                                >
                                  Save option
                                </button>
                                <Link className={styles.rowLink} href={listHref}>
                                  Cancel
                                </Link>
                              </div>
                            </form>
                          </td>
                        </tr>
                      );
                    }

                    if (offCoverage === c.key) {
                      return (
                        <ConfirmOff
                          key={c.key}
                          action={setCoverageActive}
                          rowKey={c.key}
                          columns={5}
                          backHref={listHref}
                          what={`Stop quoting “${c.label}”?`}
                          detail="It stays on record with its figures; new quotes will not offer it."
                          verb="Deactivate option"
                        />
                      );
                    }

                    return (
                      <tr className={c.active ? undefined : styles.rowOff} key={c.key}>
                        <td className={styles.nowrap}>
                          <span className={styles.rateName}>
                            <span className={styles.rateLabel}>{c.label}</span>
                            <span className={styles.rateTag}>{c.key.toUpperCase()}</span>
                            {!c.active && <span className={styles.tag}>Off</span>}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.cellSecondary} ${styles.cellSentence}`}>{c.longLabel}</span>
                        </td>
                        <td>{c.seats}</td>
                        <td>{c.monthlyHours}</td>
                        {mayEdit && (
                          <td>
                            <RowMenu
                              action={setCoverageActive}
                              rowKey={c.key}
                              active={c.active}
                              editHref={rowHref(`edit=coverage:${c.key}`)}
                              offHref={rowHref(`off=coverage:${c.key}`)}
                              noun="option"
                              label={c.label}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}

                </tbody>
              </table>
            </div>
          )}
        </section>
        )}

        {/* ---------- agent tiers ---------- */}
        {tab === 'tiers' && (
        <section className={`${styles.panel} ${styles.section}`}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Agent tiers</h2>
              <p className={styles.panelSub}>
                Hourly rates feed the quote a prospect sees — this is commercial
              </p>
            </div>
            <InfoTooltip
              text={
                mayEdit
                  ? 'The price list of record. The public site still carries its own copy of these figures, so an edit here does not change what the site quotes yet. Every change is confirmed once and logged with your name.'
                  : 'The price list of record. The public site still carries its own copy of these figures, so an edit here does not change what the site quotes yet. Only the admin may change them.'
              }
              position="bottom-left"
              maxWidth={280}
            />
          </div>

          {tiers.length === 0 ? (
            <p className={styles.empty}>
              <strong>No tiers</strong>
              Nothing to price a quote against.
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tier</th>
                    <th>Hourly rate (USD)</th>
                    <th>Monthly · full-time</th>
                    <th>Note</th>
                    {mayEdit && <th className={styles.thActions}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((t) => {
                    if (editTier === t.key) {
                      return (
                        <tr key={t.key}>
                          <td className={styles.editCell} colSpan={5}>
                            <form className={styles.editForm} action={saveAgentTier}>
                              <input type="hidden" name="key" value={t.key} />
                              <Field
                                formId={`t-${t.key}`}
                                label="Tier"
                                name="label"
                                defaultValue={t.label}
                                className={styles.editWide}
                                autoFocus
                              />
                              <Field
                                formId={`t-${t.key}`}
                                label="Hourly rate (USD)"
                                name="hourlyRateUsd"
                                defaultValue={Number(t.hourlyRateUsd).toFixed(2)}
                                type="number"
                                min={0.01}
                                max={9999}
                                step={0.01}
                                className={styles.editNarrow}
                              />
                              <Field
                                formId={`t-${t.key}`}
                                label="Note"
                                name="note"
                                defaultValue={t.note ?? ''}
                                className={styles.editWide}
                                hint="What this tier buys, in a salesperson's words"
                              />
                              <Confirm id={`t-${t.key}`} />
                              <div className={styles.rowActions} style={{ padding: 0 }}>
                                <button
                                  className={`${styles.btn} ${styles.btnPrimary}`}
                                  type="submit"
                                >
                                  Save tier
                                </button>
                                <Link className={styles.rowLink} href={listHref}>
                                  Cancel
                                </Link>
                              </div>
                            </form>
                          </td>
                        </tr>
                      );
                    }

                    if (offTier === t.key) {
                      return (
                        <ConfirmOff
                          key={t.key}
                          action={setTierActive}
                          rowKey={t.key}
                          columns={5}
                          backHref={listHref}
                          what={`Stop quoting the “${t.label}” tier?`}
                          detail="Its rate stays on record; no new quote will be priced at it."
                          verb="Deactivate tier"
                        />
                      );
                    }

                    return (
                      <tr className={t.active ? undefined : styles.rowOff} key={t.key}>
                        <td className={styles.nowrap}>
                          <span className={styles.rateName}>
                            <span className={styles.rateLabel}>{t.label}</span>
                            <span className={styles.rateTag}>{t.key.toUpperCase()}</span>
                            {!t.active && <span className={styles.tag}>Off</span>}
                          </span>
                        </td>
                        <td>
                          <b>${Number(t.hourlyRateUsd).toFixed(2)}</b>
                        </td>
                        {/* Derived, never stored: one figure that can disagree
                            with the rate beside it is one too many. */}
                        <td>
                          <span className={styles.cellSecondary}>
                            {money.format(Number(t.hourlyRateUsd) * fullTimeHours)}
                          </span>
                        </td>
                        <td>
                          <span className={styles.cellSecondary}>
                            {t.note ?? <span className={styles.none}>—</span>}
                          </span>
                        </td>
                        {mayEdit && (
                          <td>
                            <RowMenu
                              action={setTierActive}
                              rowKey={t.key}
                              active={t.active}
                              editHref={rowHref(`edit=tier:${t.key}`)}
                              offHref={rowHref(`off=tier:${t.key}`)}
                              noun="tier"
                              label={t.label}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}

                </tbody>
              </table>
            </div>
          )}

          <div className={styles.panelFoot}>
            Monthly figures assume one full-time seat at {fullTimeHours} hrs/mo. Deactivating a
            tier stops it appearing in future quotes; nothing here is ever deleted.
          </div>
        </section>
        )}

        {/* ---------- the log ---------- */}
        {/* The other half of "logged with your name". A change log nobody can
            read is a claim, not a record. */}
        <section className={`${styles.panel} ${styles.section}`}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Recent rate changes</h2>
              <p className={styles.panelSub}>
                {changes.length === 0
                  ? 'Nothing has been changed since the log was added'
                  : `The last ${changes.length} edits to the price list, newest first`}
              </p>
            </div>
          </div>
          {changes.length === 0 ? (
            <p className={styles.empty}>
              <strong>No changes logged</strong>
              Every edit made from this screen is recorded here with the name of whoever made
              it.
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Who</th>
                    <th>What</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((ch) => (
                    <tr key={ch.id}>
                      <td className={styles.mono}>{formatDate(ch.changedAt)}</td>
                      <td>
                        <span className={styles.cellPrimary}>{ch.actorName}</span>
                      </td>
                      <td>
                        {ch.entity === 'agent_tier' ? 'Agent tier' : 'Coverage option'}
                        <span className={`${styles.cellSecondary} ${styles.mono}`}>
                          {ch.rowKey}
                        </span>
                      </td>
                      <td>
                        <span className={styles.cellSecondary}>
                          {describe(ch.action, ch.before, ch.after)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------- service categories ---------- */}
        {/* Not part of the price list and not editable here: these route a lead
            to a service page, they do not price one. Kept on this screen
            because it is the only place the three catalog tables can be read
            together, which is what makes a quote traceable. */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Service categories</h2>
              <p className={styles.panelSub}>
                {categories.length} rows — what a lead is routed into. Read-only; these carry no
                price.
              </p>
            </div>
          </div>
          {categories.length === 0 ? (
            <p className={styles.empty}>
              <strong>No categories</strong>
              Nothing to route a lead into.
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Nav blurb</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.key}>
                      <td>
                        <span className={styles.cellPrimary}>{c.name}</span>
                        <span className={`${styles.cellSecondary} ${styles.mono}`}>{c.key}</span>
                      </td>
                      <td className={styles.mono}>/{c.slug}</td>
                      <td>
                        <span className={styles.cellSecondary}>
                          {c.navBlurb ?? <span className={styles.none}>—</span>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/**
 * One line of the change log.
 *
 * Reads the two snapshots rather than a stored sentence: the wording of a log
 * entry should be able to improve without rewriting history, and a stored
 * sentence is the version that cannot.
 */
function describe(action: string, before: unknown, after: unknown): string {
  const b = before as Record<string, unknown> | null;
  const a = after as Record<string, unknown> | null;

  if (action === 'added') return `Added at ${rateOf(a) ?? 'no rate'}`;
  if (action === 'deactivated') return 'Deactivated — out of new quotes';
  if (action === 'reactivated') return 'Back in use';

  const from = rateOf(b);
  const to = rateOf(a);
  if (from && to && from !== to) return `Rate ${from} → ${to}`;

  const hoursFrom = hoursOf(b);
  const hoursTo = hoursOf(a);
  if (hoursFrom && hoursTo && hoursFrom !== hoursTo) return `Hours ${hoursFrom} → ${hoursTo}`;

  /* Everything else is a label or a note: worth logging, not worth a bespoke
     sentence each. The whole-row snapshots are in the table for anyone who
     needs the detail. */
  return 'Wording updated';
}

function rateOf(row: Record<string, unknown> | null): string | null {
  const v = row?.hourlyRateUsd;
  return typeof v === 'string' || typeof v === 'number'
    ? `$${Number(v).toFixed(2)}`
    : null;
}

function hoursOf(row: Record<string, unknown> | null): string | null {
  const v = row?.monthlyHours;
  return typeof v === 'number' ? `${v}` : null;
}

/** A labelled control, with the hint the field needs and nothing more. */
function Field({
  label,
  name,
  formId,
  defaultValue,
  className = '',
  hint,
  ...rest
}: {
  label: string;
  name: string;
  /** Which form this field belongs to — only ever one row's, and it makes the
      id unique without putting a value's own text into an attribute that may
      not contain spaces. Not the HTML `form` attribute, which associates a
      control with a form elsewhere in the document. */
  formId: string;
  defaultValue?: string;
  className?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `f-${formId}-${name}`;
  return (
    <div className={`${styles.field} ${className}`}>
      <label className={styles.fieldLabel} htmlFor={id}>{label}</label>
      <input
        className={styles.control}
        id={id}
        name={name}
        defaultValue={defaultValue}
        {...rest}
      />
      {hint && <span className={styles.panelNote}>{hint}</span>}
    </div>
  );
}

/**
 * The confirmation the caution banner promises.
 *
 * `required` in the browser and re-checked in the action, because a required
 * attribute is a courtesy and not a control.
 */
function Confirm({ id }: { id: string }) {
  return (
    <label className={styles.confirmCheck} htmlFor={`ok-${id}`}>
      <input type="checkbox" id={`ok-${id}`} name="confirm" value="1" required />
      <span>
        I know this changes the price list of record, and that this edit is logged
        with my name.
      </span>
    </label>
  );
}

/**
 * Deactivation asks first, in the row's own place.
 *
 * A server-rendered confirm step rather than a browser dialog: this admin ships
 * no client-side JS for its tables, and an unconfirmed price change is the one
 * thing on this screen that should not be one click away.
 */
function ConfirmOff({
  action,
  rowKey,
  columns,
  backHref,
  what,
  detail,
  verb,
}: {
  action: (formData: FormData) => Promise<void>;
  rowKey: string;
  columns: number;
  backHref: string;
  what: string;
  detail: string;
  verb: string;
}) {
  return (
    <tr>
      <td className={styles.editCell} colSpan={columns}>
        <form className={styles.editForm} action={action}>
          <input type="hidden" name="key" value={rowKey} />
          <input type="hidden" name="active" value="0" />
          <p style={{ margin: 0, flex: '1 1 20rem' }}>
            <strong>{what}</strong>
            <span className={styles.cellSecondary}>{detail}</span>
          </p>
          <div className={styles.rowActions} style={{ padding: 0 }}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" autoFocus>
              {verb}
            </button>
            <Link className={styles.rowLink} href={backHref}>
              Keep it
            </Link>
          </div>
        </form>
      </td>
    </tr>
  );
}

/** One of the two table tabs — the same pill the FAQ, reviews and quizzes
    lists use, so a tab means the same thing on every screen. */
function Tab({
  href,
  on,
  label,
  count,
}: {
  href: string;
  on: boolean;
  label: string;
  count?: number;
}) {
  return (
    <Link
      className={`${styles.fbtn} ${on ? styles.fbtnOn : ''}`}
      href={href}
      aria-current={on ? 'true' : undefined}
    >
      {label}
      {count !== undefined && <span className={styles.fbtnCount}>{count}</span>}
    </Link>
  );
}

function Topbar({ mayEdit }: { mayEdit: boolean }) {
  return (
    <AdminTopbar
      title="Rates"
      subtitle="Coverage options and agent tiers — the price list"
      action={
        mayEdit ? (
          <Link className={styles.btnHeader} href="/admin/catalog/new">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add option
          </Link>
        ) : undefined
      }
    />
  );
}
