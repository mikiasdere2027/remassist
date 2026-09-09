import Link from 'next/link';
import { desc } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { popups } from '@/db/schema';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { POPUP_PLACEMENT_LABEL, isPopupPlacement } from '@/lib/popups/placement';
import { POPUP_TEMPLATE_LABEL, isPopupTemplate } from '@/lib/popups/templates';
import { formatDate, formatRelativeTime } from '@/lib/leads/display';
import { setPopupPublished } from './actions';
import { popupMessage } from './messages';
import PopupRowMenu from './RowMenu';
import AdminTopbar from '../../AdminTopbar';
import styles from '../../../admin.module.css';

/**
 * The popups list — the hub of the popup ads feature.
 *
 * Phase 1: manage the ads. Every popup is a set of decisions that are made
 * once and read many times — what it says, where it may appear, when it runs,
 * how long it lingers, and how the run is tracked — so the screen is a list of
 * those decisions with editing behind a link, exactly like the posts list.
 * Rendering the popup on the public pages is the next phase; until then the
 * list's job is to get the content right and to publish/suspend it.
 *
 * The tabs slice one list by status, not two lists. Placements and schedules
 * are columns you read; published/unpublished is the one decision a row's
 * menu can flip without opening the editor.
 *
 * Nothing here deletes. A popup that was once live is a record of a claim the
 * site made, and everything on this admin keeps that record — suspending a
 * popup is what "taking it down" means.
 */

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Popup ads',
  robots: { index: false, follow: false },
};

const STATUSES = ['all', 'live', 'draft'] as const;
type Status = (typeof STATUSES)[number];

function asStatus(v: string | undefined): Status {
  return STATUSES.includes(v as Status) ? (v as Status) : 'all';
}

/** How a schedule reads in one line. */
function scheduleText(startsAt: Date | null, endsAt: Date | null): string {
  const short = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  if (startsAt && endsAt) return `${short(startsAt)} → ${short(endsAt)}`;
  if (endsAt) return `Until ${short(endsAt)}`;
  if (startsAt) return `From ${short(startsAt)}`;
  return 'Anytime';
}

function placementLabel(value: string): string {
  return isPopupPlacement(value) ? POPUP_PLACEMENT_LABEL[value] : value;
}

/** Which shape the popup takes, read under its placement in the same column. */
function templateLabel(value: string): string {
  return isPopupTemplate(value) ? POPUP_TEMPLATE_LABEL[value] : value;
}

export default async function PopupsListPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; status?: string; q?: string }>;
}) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const message = popupMessage(sp.ok, sp.error);
  const mayEdit = canEditContent(user.role);
  const status = asStatus(sp.status);
  const q = (sp.q ?? '').trim();

  if (!isDatabaseConfigured()) {
    return (
      <>
        <Topbar mayEdit={mayEdit} />
        <div className={styles.view}>
          <div className={styles.notice}>
            <strong>No database configured</strong>
            There is no <code>DATABASE_URL</code> in this environment, so there is nothing to
            manage.
          </div>
        </div>
      </>
    );
  }

  const db = getDb();
  const all = await db.select().from(popups).orderBy(desc(popups.updatedAt));

  /* The search narrows what the tabs count, the tabs do not narrow each other. */
  const needle = q.toLowerCase();
  const matching = needle
    ? all.filter((p) =>
        [p.name, p.campaign, p.title, p.trackingKey]
          .some((f) => f.toLowerCase().includes(needle)),
      )
    : all;

  const total = matching.length;
  const liveCount = matching.filter((p) => p.published).length;
  const draftCount = total - liveCount;

  const rows = matching.filter((p) => {
    if (status === 'live') return p.published;
    if (status === 'draft') return !p.published;
    return true;
  });

  const href = (next: { status?: Status; q?: string }) => {
    const s = next.status ?? status;
    const term = next.q ?? q;
    const params = new URLSearchParams();
    if (s !== 'all') params.set('status', s);
    if (term) params.set('q', term);
    const qs = params.toString();
    return `/admin/content/popups${qs ? `?${qs}` : ''}`;
  };

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

        <div className={styles.filterbar}>
          <div className={styles.filterPills} role="group" aria-label="Filter popups by status">
            <Tab href={href({ status: 'all' })} on={status === 'all'} label="All" count={total} />
            <Tab href={href({ status: 'live' })} on={status === 'live'} label="Live" count={liveCount} />
            <Tab href={href({ status: 'draft' })} on={status === 'draft'} label="Draft" count={draftCount} />
          </div>

          {/* A GET form, so a search is a URL you can keep, share or bookmark. */}
          <form className={styles.filterForm} role="search">
            <input
              className={styles.filterSearch}
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search popups…"
              aria-label="Search popups by name, campaign, headline or tracking key"
            />
          </form>

          {q && (
            <Link className={`${styles.btn} ${styles.btnGhost}`} href={href({ q: '' })}>
              Clear search
            </Link>
          )}
        </div>

        <section className={styles.panel}>
          {rows.length === 0 ? (
            <p className={styles.empty}>
              <strong>{all.length === 0 ? 'No popups yet' : 'No popups match'}</strong>
              {all.length === 0
                ? 'Use “New popup” above to create the first one.'
                : 'Try another search, or a different tab.'}
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Popup</th>
                    <th scope="col">Placement</th>
                    <th scope="col">Schedule</th>
                    <th scope="col">Status</th>
                    <th scope="col">Updated</th>
                    <th scope="col" className={styles.nowrap} style={{ textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link className={styles.rowLink} href={`/admin/content/popups/${p.id}`}>
                          {p.name}
                        </Link>
                        <span className={styles.cellSecondary}>{p.campaign}</span>
                      </td>
                      <td>
                        <span className={styles.cellSecondary}>
                          {placementLabel(p.placement)}
                        </span>
                        <span className={styles.cellSecondary}>
                          {templateLabel(p.template)}
                        </span>
                      </td>
                      <td>
                        <span className={styles.cellSecondary}>
                          {scheduleText(p.startsAt, p.endsAt)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.pill} ${p.published ? styles.pillLow : styles.pillMed}`}
                        >
                          {p.published ? 'Live' : 'Draft'}
                        </span>
                      </td>
                      <td className={styles.nowrap}>
                        <span className={styles.relativeTime} title={formatDate(p.updatedAt)}>
                          {formatRelativeTime(p.updatedAt)}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          {mayEdit ? (
                            <PopupRowMenu
                              publish={setPopupPublished}
                              id={p.id}
                              name={p.name}
                              published={p.published}
                            />
                          ) : (
                            <Link className={styles.rowLink} href={`/admin/content/popups/${p.id}`}>
                              Open
                            </Link>
                          )}
                        </div>
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

/** One status tab. A link, not a button: what you are looking at belongs in the URL. */
function Tab({ href, on, label, count }: {
  href: string;
  on: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      className={`${styles.fbtn} ${on ? styles.fbtnOn : ''}`}
      href={href}
      aria-current={on ? 'true' : undefined}
    >
      {label}
      <span className={styles.fbtnCount}>{count}</span>
    </Link>
  );
}

function Topbar({ mayEdit }: { mayEdit: boolean }) {
  return (
    <AdminTopbar
      title="Popups"
      subtitle="Pop-up ads — content, placement, timing and tracking"
      action={
        mayEdit ? (
          <Link href="/admin/content/popups/new" className={styles.btnHeader}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New popup
          </Link>
        ) : undefined
      }
    />
  );
}