import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { canDeleteFaqItem, canEditContent } from '@/lib/auth/roles';
import { apiServer } from '@/lib/api/server';
import { MAX_FEATURED, type FaqAdminGroup, type FaqAdminItem } from '@/lib/api/faq';
import CategoryFilter from './CategoryFilter';
import FaqAccordion, { type FaqAccordionSection } from './FaqAccordion';
import SectionsEditor from './SectionsEditor';
import AdminTopbar from '../../AdminTopbar';
import styles from '../../../admin.module.css';

/**
 * The FAQ list — the Test Admin prototype's shape.
 *
 * One flat, scannable line per question: grip, question, status pill, icon
 * actions, under a heading per section. Above it a filter bar — status tabs
 * with counts, a category dropdown, and a Sections toggle — and that filter
 * bar is what replaced the previous panel per section. Six panels meant
 * the answer to "which questions are still drafts" was to scroll all six and
 * read every pill; now it is one tab.
 *
 * The section headings are why there is no category tag on a row any more. A
 * tag under a heading of the same name repeats that word once per row, and the
 * row already has three things competing for the right-hand side. Filter to one
 * category and both disappear: every row is that section, so naming it on each
 * one says nothing.
 *
 * Two deliberate departures from the mockup, both because a working page cannot
 * promise what it does not do:
 *
 *  - The grip does not drag. This admin ships no client-side drag, so the grip
 *    is decorative and hidden from screen readers; reordering is Move up /
 *    Move down on the edit page, where the item's position in its section is
 *    also shown. The mockup's footer said "drag the grip to reorder", which
 *    would be a lie a static artboard can afford.
 *  - The second row action publishes and unpublishes rather than deleting.
 *    Content here is taken off the page, never destroyed — see
 *    canUnpublishContent in lib/auth/roles.ts. A trash icon over an action
 *    that unpublishes would be worse than either choice made honestly.
 *
 * Data comes from the backend (GET /v1/admin/faq/groups and /items); the
 * row menu and the sections editor call the API from the browser and refresh.
 * Both roles may edit content; the backend enforces the same rule.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'FAQ',
  robots: { index: false, follow: false },
};

/**
 * `homepage` is a filter, not a status.
 *
 * It rides in the same param and the same row of pills because it answers the
 * same question the other three do — "which of these am I looking at" — and a
 * separate control for one more subset of the same list would be a second thing
 * to learn for no second idea. Being featured is orthogonal to being published,
 * which is why the rows under it still carry their own Published/Draft pill.
 */
const STATUSES = ['all', 'published', 'draft', 'homepage'] as const;
type Status = (typeof STATUSES)[number];

/**
 * Questions, or the section editor.
 *
 * Section titles and anchors used to be a details element at the foot of the
 * page, which put six collapsed forms below however many questions you were
 * reading. As a view it is one click from the filter bar and it gets the whole
 * panel. One pill rather than a Questions/Sections pair, because All,
 * Published and Draft already are the questions view.
 */
const VIEWS = ['questions', 'sections'] as const;
type View = (typeof VIEWS)[number];

function asStatus(v: string | undefined): Status {
  return STATUSES.includes(v as Status) ? (v as Status) : 'all';
}

function asView(v: string | undefined): View {
  return VIEWS.includes(v as View) ? (v as View) : 'questions';
}

export default async function FaqListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cat?: string; view?: string }>;
}) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const mayEdit = canEditContent(user.role);
  const mayDelete = canDeleteFaqItem(user.role);
  const status = asStatus(sp.status);
  /* Only an editor has a sections view to switch to, so a manager arriving on
     ?view=sections gets the questions rather than a panel of controls every
     action behind would refuse. */
  const view = mayEdit ? asView(sp.view) : 'questions';

  /* Already in public page order (section, then position) — the backend
     sorts it, so the rows under one heading really are contiguous. */
  const [groups, ordered] = await Promise.all([
    apiServer<FaqAdminGroup[]>('/admin/faq/groups'),
    apiServer<FaqAdminItem[]>('/admin/faq/items'),
  ]);
  const groupById = new Map(groups.map((g) => [g.id, g]));

  /* Counted before filtering: a tab whose count changes when you select it
     tells you nothing about what is on the other tabs. */
  const total = ordered.length;
  const publishedCount = ordered.filter((i) => i.published).length;
  const draftCount = total - publishedCount;
  const featuredCount = ordered.filter((i) => i.featured).length;

  /* A category from the query string is only honoured if it names a group that
     exists, so a hand-typed ?cat= falls back to showing everything rather than
     to an empty list that looks like lost content. */
  const cat = sp.cat && groupById.has(sp.cat) ? sp.cat : 'all';

  const rows = ordered.filter((i) => {
    if (status === 'published' && !i.published) return false;
    if (status === 'draft' && i.published) return false;
    if (status === 'homepage' && !i.featured) return false;
    if (cat !== 'all' && i.groupId !== cat) return false;
    return true;
  });

  /* Every link keeps the other filters. Losing the category you had selected
     because you clicked Draft is the sort of thing that makes a filter bar feel
     broken when each control works perfectly on its own. Params equal to their
     default are omitted, so the canonical URL of the default view is bare. */
  const href = (next: { status?: Status; cat?: string; view?: View }) => {
    const s = next.status ?? status;
    const c = next.cat ?? cat;
    const v = next.view ?? view;
    const params = new URLSearchParams();
    if (s !== 'all') params.set('status', s);
    if (c !== 'all') params.set('cat', c);
    if (v !== 'questions') params.set('view', v);
    const qs = params.toString();
    return `/admin/content/faq${qs ? `?${qs}` : ''}`;
  };

  /* One accordion section per group, in the public page's order. Only groups
     that still have rows after filtering appear; the accordion opens the first
     one and closes it when another is opened. */
  const sections: FaqAccordionSection[] = groups
    .map((g) => {
      const groupRows = rows.filter((r) => r.groupId === g.id);
      return {
        id: g.id,
        title: g.title ?? 'No section',
        count: groupRows.length,
        rows: groupRows.map((r) => ({
          id: r.id,
          question: r.question,
          published: r.published,
          featured: r.featured,
        })),
      };
    })
    .filter((s) => s.rows.length > 0);

  return (
    <>
      <Topbar />

      <div className={styles.view}>
        <div className={styles.filterbar}>
          {/* The status tabs stay put in the sections view with none of them
              lit, and clicking any of them is the way back. That beats hiding
              them — the bar keeps its shape — and it beats leaving one lit,
              which would claim two things are selected at once. */}
          <div className={styles.filterPills} role="group" aria-label="Filter FAQ by status">
            <Tab
              href={href({ status: 'all', view: 'questions' })}
              on={view === 'questions' && status === 'all'}
              label="All"
              count={total}
            />
            <Tab
              href={href({ status: 'published', view: 'questions' })}
              on={view === 'questions' && status === 'published'}
              label="Published"
              count={publishedCount}
            />
            <Tab
              href={href({ status: 'draft', view: 'questions' })}
              on={view === 'questions' && status === 'draft'}
              label="Draft"
              count={draftCount}
            />
            <Tab
              href={href({ status: 'homepage', view: 'questions' })}
              on={view === 'questions' && status === 'homepage'}
              label="Homepage"
              count={featuredCount}
            />
          </div>

          {/* Selecting a category navigates without a view param, so it lands
              on the questions too. */}
          <CategoryFilter
            groups={groups.map((g) => ({ id: g.id, title: g.title }))}
            value={cat}
            status={status}
          />

          {mayEdit && (
            <div className={styles.filterPills} role="group" aria-label="Edit the sections">
              {/* One pill, not a Questions/Sections pair: All, Published and
                  Draft already are the questions view, so a Questions tab
                  would be a fourth control saying the same thing. It toggles,
                  so it is also the way out of the view it opens. */}
              <Tab
                href={href({ view: view === 'sections' ? 'questions' : 'sections' })}
                on={view === 'sections'}
                label="Sections"
              />
            </div>
          )}
        </div>

        {/* Shown on every tab, not just Homepage, because the thing it explains
            is what a visitor sees right now and an editor who never opens that
            tab is exactly the one who does not know. It disappears the moment
            anything is starred. */}
        {view === 'questions' && featuredCount === 0 && (
          <div className={styles.notice}>
            <strong>Nothing is chosen for the homepage</strong>
            The homepage FAQ card is falling back to the first {MAX_FEATURED} published
            questions in page order. Pick the ones that should sell the process with
            &ldquo;Show on the homepage&rdquo; in a question&rsquo;s menu.
          </div>
        )}

        {view === 'sections' ? (
          <SectionsEditor groups={groups} backHref={href({ view: 'questions' })} />
        ) : (
          /* The empty state is still one panel — there is nothing to separate.
             The list is not: each section is its own card on the page, so the
             gaps between them fall on #f5f7fa and actually read as gaps. */
          rows.length === 0 ? (
            <div className={styles.panel}>
              <p className={styles.empty}>
                <strong>
                  {total === 0 ? 'No questions yet' : 'Nothing matches those filters'}
                </strong>
                {total === 0
                  ? 'Use “Add question” above to write the first one.'
                  : `There are ${total} questions in total — clear the filters to see them.`}
              </p>
            </div>
          ) : (
            <>
              <FaqAccordion
                sections={sections}
                mayEdit={mayEdit}
                mayDelete={mayDelete}
                featuredCount={featuredCount}
              />
              <p className={styles.faqListFoot}>
                {status === 'homepage' ? (
                  <span>
                    {featuredCount} of {MAX_FEATURED} places used. The order these appear in
                    on the homepage is set on a question&rsquo;s edit page, and it is
                    separate from the order on /faq.
                  </span>
                ) : (
                  <span>
                    Reorder from a question&rsquo;s edit page &mdash; the public FAQ follows
                    shortly after each change.
                  </span>
                )}
                <Link className={styles.rowLink} href={status === 'homepage' ? '/' : '/faq'}>
                  {status === 'homepage' ? 'View the homepage' : 'View the public page'}
                </Link>
              </p>
            </>
          )
        )}
      </div>
    </>
  );
}

/**
 * One tab. A link, not a button: the filter belongs in the URL.
 *
 * `count` is optional because the Questions/Sections pair has nothing to count
 * — a number there would have to be invented.
 */
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

function Topbar() {
  return (
    <AdminTopbar
      title="FAQ"
      subtitle="The questions that sell the process"
      action={
        <Link href="/admin/content/faq/new" className={styles.btnHeader}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add question
        </Link>
      }
    />
  );
}
