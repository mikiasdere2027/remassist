import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { apiServer } from '@/lib/api/server';
import type { AdminReview, AdminReviewSource } from '@/lib/api/reviews';
import { SOURCE_LABEL } from './display';
import ReviewList from './ReviewList';
import SourceForms from './SourceForms';
import InfoTooltip from '../../InfoTooltip';
import AdminTopbar from '../../AdminTopbar';
import styles from '../../../admin.module.css';

/**
 * The reviews list — the Test Admin prototype's review cards, one source at a
 * time.
 *
 * This screen used to be a panel per source with a full form inline on every
 * row: five fields and a textarea, four times over. The prototype's shape is a
 * list you read, with editing behind an edit button, and that is the right
 * shape here for a reason specific to reviews. The job on this screen is
 * almost never "change a word" — it is "find the one that needs checking, or
 * take one down". A list of quotes serves both; a stack of forms serves
 * neither, and it puts a text box under other people's words as the default
 * state of the page.
 *
 * The tabs are the sources. Unlike the FAQ's status tabs, which slice one list
 * two ways, these separate two lists that were never really one: sortOrder is
 * per source, the public page renders them as two blocks, and a Trustpilot
 * review and a Google review are never compared with each other. A combined
 * view would have to invent an order across sources that means nothing.
 *
 * The last tab is not a filter. Sources holds the per-source figures — profile
 * link, the score the source publishes, the footnote the cards are read
 * against — which are about the two sources rather than about any one review,
 * and are touched roughly never. A tab is how they stay reachable without
 * sitting above the list competing for attention.
 *
 * Three deliberate departures from the mockup:
 *
 *  - No "Sync from source" button, and the rows do not say "Synced". There is
 *    no sync. Every review here was transcribed by hand from Trustpilot or
 *    Google, and a button promising to re-pull a feed that does not exist is
 *    the one thing on this screen worse than no button at all. The primary
 *    action is Add review, and the pill says Published or Hidden, which is the
 *    state the row actually has.
 *  - The mockup called the screen read-only. It is not, and that is a decision
 *    taken against MIGRATION-PLAN §6.5, which specified no create or edit path
 *    at all. What §6.5 was protecting against — a general-purpose CMS box that
 *    makes fabricating a testimonial easy — is answered instead by saying, in
 *    the list head’s ⓘ, what these fields are for, by keeping every source
 *    link required and resolvable, and by never deleting. Somebody has to be
 *    able to fix a transcription error, and doing it by hand in SQL is not
 *    safer.
 *  - The second row action hides rather than deletes. Content on this site is
 *    taken off the page and kept — see canUnpublishContent in
 *    lib/auth/roles.ts. It matters more here than anywhere else: a review that
 *    has been taken down is still the record of what the site once quoted
 *    somebody as saying.
 *
 * Both roles may edit content; the backend enforces the same rule on every
 * call. Reads come from the API fresh (no-store); the Show/Hide and source
 * forms are client components that call the API and refresh this page.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reviews',
  robots: { index: false, follow: false },
};

/** The tab that is not a source. */
const SOURCES_TAB = 'sources';

export default async function ReviewsListPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const mayEdit = canEditContent(user.role);

  const [sources, rows] = await Promise.all([
    apiServer<AdminReviewSource[]>('/admin/reviews/sources'),
    /* Grouped by source and in sortOrder within each; sortOrder is per source,
       so this order only means something once narrowed to one, which the tab
       does. */
    apiServer<AdminReview[]>('/admin/reviews'),
  ]);

  /* A tab from the query string is only honoured if it names a source that
     exists, so a hand-typed ?tab= lands on the first source rather than on an
     empty list that looks like lost content. */
  const known = new Set<string>([...sources.map((s) => s.source), SOURCES_TAB]);
  const fallback = sources[0]?.source ?? SOURCES_TAB;
  const tab = sp.tab && known.has(sp.tab) ? sp.tab : fallback;
  const onSources = tab === SOURCES_TAB;

  const source = sources.find((s) => s.source === tab);
  const items = rows.filter((r) => r.source === tab);
  const live = items.filter((r) => r.published).length;

  const href = (next: string) => `/admin/content/reviews?tab=${next}`;

  return (
    <>
      <Topbar
        sub={`${rows.length} reviews, ${rows.filter((r) => r.published).length} live`}
        mayEdit={mayEdit}
      />

      <div className={styles.view}>
        <div className={styles.filterbar}>
          <div className={styles.filterPills} role="group" aria-label="Choose a review source">
            {sources.map((s) => (
              <Tab
                key={s.source}
                href={href(s.source)}
                on={tab === s.source}
                label={SOURCE_LABEL[s.source] ?? s.source}
                count={rows.filter((r) => r.source === s.source).length}
              />
            ))}
            {/* No count: it would be the number of sources, which is the number
                of tabs to its left. */}
            <Tab href={href(SOURCES_TAB)} on={onSources} label="Sources" />
          </div>
        </div>

        {onSources ? (
          <SourceForms sources={sources} mayEdit={mayEdit} />
        ) : (
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>
                  {SOURCE_LABEL[tab] ?? tab} reviews
                </h2>
                <p className={styles.panelSub}>
                  Rated {source?.ratingLabel} · {items.length} transcribed, {live} live
                </p>
              </div>
              {/* What used to be a standing notice above the filter bar. What it
                  warns about is the fields behind Edit, and as a block on the
                  page it was read once and then scrolled past on every visit
                  after that, while pushing the list it applies to off the first
                  screen. Behind the head’s ⓘ it is one click from that list. */}
              <InfoTooltip
                text="These are other people’s words, transcribed by hand from Trustpilot or Google. The fields behind Edit are for correcting a transcription error, not for improving the wording — a review that does not match its source is a fabricated testimonial. Hide one to take it off the page; nothing here deletes."
                position="bottom-left"
                maxWidth={300}
              />
            </div>

            {/* The footnote is the caveat the public cards are read against —
                which review was removed by its author, whose dates are
                relative. Shown with the list it applies to, because an editor
                deciding whether a row looks wrong needs it here, not behind the
                Sources tab where it is edited. */}
            {source?.footnote && <p className={styles.panelIntro}>{source.footnote}</p>}

            {items.length === 0 ? (
              <p className={styles.empty}>
                <strong>No {SOURCE_LABEL[tab] ?? tab} reviews yet</strong>
                Use the &ldquo;Add review&rdquo; button above to transcribe the first one.
              </p>
            ) : (
              <ReviewList key={tab} items={items} mayEdit={mayEdit} />
            )}

            <div className={styles.panelFoot}>
              <span>
                Reorder from a review&rsquo;s edit page &mdash; the public page follows
                immediately after save. Hiding keeps the wording; nothing here deletes.
              </span>
              <Link className={styles.rowLink} href="/reviews">View the public page</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** One tab. A link, not a button: which source you are looking at belongs in the URL. */
function Tab({ href, on, label, count }: {
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

function Topbar({ sub, mayEdit }: { sub: string; mayEdit: boolean }) {
  return (
    <AdminTopbar
      title="Reviews"
      subtitle={sub}
      action={
        mayEdit ? (
          <Link href="/admin/content/reviews/new" className={styles.btnHeader}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add review
          </Link>
        ) : undefined
      }
    />
  );
}
