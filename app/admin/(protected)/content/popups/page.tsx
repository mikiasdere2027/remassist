import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import type { AdminPopup, PopupState } from '@/lib/api/popups';
import { apiServer } from '@/lib/api/server';
import PopupsTable from './PopupsTable';
import AdminTopbar from '../../AdminTopbar';
import styles from '../../../admin.module.css';

/**
 * The popups list — the hub of the popup ads feature.
 *
 * Every popup is a set of decisions that are made once and read many times —
 * what it says, where it may appear, when it runs, how long it lingers, and
 * how the run is tracked — so the screen is a list of those decisions with
 * editing behind a link, exactly like the posts list. Data comes from
 * GET /v1/admin/popups; the state (live / scheduled / ended / draft) is the
 * backend's, computed from published + schedule.
 *
 * The tabs slice one list by state, not several lists. Placements and schedules
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

const STATUSES = ['all', 'live', 'scheduled', 'ended', 'draft'] as const;
type Status = (typeof STATUSES)[number];

const TAB_LABEL: Record<Status, string> = {
  all: 'All',
  live: 'Live',
  scheduled: 'Scheduled',
  ended: 'Ended',
  draft: 'Draft',
};

function asStatus(v: string | undefined): Status {
  return STATUSES.includes(v as Status) ? (v as Status) : 'all';
}

export default async function PopupsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const mayEdit = canEditContent(user.role);
  const status = asStatus(sp.status);
  const q = (sp.q ?? '').trim();

  /* One fetch, narrowed by the search only: the tabs are counted from it and
     do not narrow each other. */
  const matching = await apiServer<AdminPopup[]>(
    `/admin/popups${q ? `?q=${encodeURIComponent(q)}` : ''}`,
  );
  const count = (st: PopupState) => matching.filter((p) => p.state === st).length;
  const counts: Record<Status, number> = {
    all: matching.length,
    live: count('live'),
    scheduled: count('scheduled'),
    ended: count('ended'),
    draft: count('draft'),
  };
  const rows = status === 'all' ? matching : matching.filter((p) => p.state === status);

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
        <div className={styles.filterbar}>
          <div className={styles.filterPills} role="group" aria-label="Filter popups by status">
            {STATUSES.map((st) => (
              <Tab
                key={st}
                href={href({ status: st })}
                on={status === st}
                label={TAB_LABEL[st]}
                count={counts[st]}
              />
            ))}
          </div>

          {/* A GET form, so a search is a URL you can keep, share or bookmark. */}
          <form className={styles.filterForm} role="search">
            {status !== 'all' && <input type="hidden" name="status" value={status} />}
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

        <PopupsTable rows={rows} mayEdit={mayEdit} nothingYet={!q && matching.length === 0} />
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