import Link from 'next/link';
import { ACTIVITY_ENTITIES, activityHref, type ActivityEntry, type ActivityPage } from '@/lib/api/activity';
import { apiServer } from '@/lib/api/server';
import type { TeamUser } from '@/lib/api/types';
import { requireUser } from '@/lib/auth/require';
import { formatDate, formatRelativeTime } from '@/lib/leads/display';
import AdminTopbar from '../AdminTopbar';
import styles from '../../admin.module.css';

/**
 * The activity log — GET /v1/admin/activity. Every admin write records one
 * entry (who, what, when, a summary, and small before/after snapshots).
 * Managers don't see account and sign-in events; the backend filters those.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Activity',
  robots: { index: false, follow: false },
};

type Search = { entity?: string; actorId?: string; before?: string };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [me, raw] = await Promise.all([requireUser(), searchParams]);
  const isAdmin = me.role === 'admin';
  const sp: Search = {
    entity: raw.entity?.trim() || undefined,
    /* The backend 400s on a malformed actor id; just drop it. */
    actorId: raw.actorId && UUID.test(raw.actorId) ? raw.actorId : undefined,
    before: raw.before || undefined,
  };
  const qs = (extra: Partial<Search>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...extra })) if (v) p.set(k, v);
    return p.toString();
  };

  const [page, users] = await Promise.all([
    apiServer<ActivityPage>(`/admin/activity?${qs({})}`),
    /* The user list is admin-only; managers pick from the actors on this page. */
    isAdmin ? apiServer<TeamUser[]>('/admin/users') : Promise.resolve(null),
  ]);

  const actors = new Map<string, string>();
  for (const u of users ?? []) actors.set(u.id, u.name || u.username);
  for (const e of page.items) if (e.actorId && !actors.has(e.actorId)) actors.set(e.actorId, e.actorName);
  if (sp.actorId && !actors.has(sp.actorId)) actors.set(sp.actorId, 'Selected person');

  const entities = ACTIVITY_ENTITIES.filter((e) => isAdmin || !e.adminOnly);
  const filtered = Boolean(sp.entity || sp.actorId);

  return (
    <>
      <AdminTopbar title="Activity" subtitle="Who changed what, and when" />

      <div className={styles.view}>
        <section className={styles.panel}>
          <form className={styles.filters} method="get">
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="a-entity">What</label>
              <span className={`${styles.selectField} ${styles.selectFieldWide}`}>
                <select id="a-entity" name="entity" defaultValue={sp.entity ?? ''}>
                  <option value="">Everything</option>
                  {entities.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="a-actor">Who</label>
              <span className={`${styles.selectField} ${styles.selectFieldWide}`}>
                <select id="a-actor" name="actorId" defaultValue={sp.actorId ?? ''}>
                  <option value="">Anyone</option>
                  {[...actors].map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>
            <button
              className={`${styles.btn} ${styles.btnSoft} ${styles.btnIcon} ${filtered ? styles.filterOn : ''}`}
              type="submit"
              aria-label="Filter"
              title={filtered ? 'Filter is active' : 'Filter'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
              </svg>
            </button>
            <Link className={`${styles.btn} ${styles.btnGhost}`} href="/admin/activity">Reset</Link>
          </form>

          {page.items.length === 0 ? (
            <p className={styles.empty}>
              <strong>Nothing recorded</strong>
              {filtered ? 'Try widening the filters.' : 'Changes made in the admin will appear here.'}
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">What happened</th>
                    <th scope="col">Who</th>
                    <th scope="col">When</th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((e) => (
                    <Row key={e.id} e={e} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.panelFoot}>
            <span>
              Showing {page.items.length}
              {sp.before ? ' (paged)' : ''}
            </span>
            <span className={styles.pager}>
              {sp.before ? (
                <Link className={styles.pagerLink} href={`/admin/activity?${qs({ before: undefined })}`}>
                  ← Newest
                </Link>
              ) : (
                <span className={styles.pagerOff}>← Newest</span>
              )}
              {page.nextCursor ? (
                <Link className={styles.pagerLink} href={`/admin/activity?${qs({ before: page.nextCursor })}`}>
                  Older →
                </Link>
              ) : (
                <span className={styles.pagerOff}>Older →</span>
              )}
            </span>
          </div>
        </section>
      </div>
    </>
  );
}

function Row({ e }: { e: ActivityEntry }) {
  const href = activityHref(e);
  const label = ACTIVITY_ENTITIES.find((x) => x.value === e.entity)?.label ?? e.entity;
  const hasDiff = e.before != null || e.after != null;
  return (
    <tr>
      <td>
        <span className={styles.cellPrimary}>
          {href ? <Link className={styles.rowLink} href={href}>{e.summary}</Link> : e.summary}
        </span>
        <span className={styles.cellSecondary}>
          {label} · {e.action.replace(/_/g, ' ')}
        </span>
        {hasDiff && (
          /* A native disclosure: no client JS for an occasional peek. */
          <details className={styles.activityDiff}>
            <summary>Details</summary>
            <div className={styles.activityDiffGrid}>
              <Snapshot title="Before" value={e.before} />
              <Snapshot title="After" value={e.after} />
            </div>
          </details>
        )}
      </td>
      <td className={styles.nowrap}>
        {e.actorId ? e.actorName : <span className={styles.muted}>{e.actorName}</span>}
      </td>
      <td className={styles.nowrap}>
        <time dateTime={e.createdAt} title={formatDate(e.createdAt)} className={styles.relativeTime}>
          {formatRelativeTime(e.createdAt)}
        </time>
      </td>
    </tr>
  );
}

function Snapshot({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <span className={styles.activityDiffLabel}>{title}</span>
      {value == null ? (
        <span className={styles.none}>—</span>
      ) : (
        <pre className={`${styles.activityDiffPre} ${styles.mono}`}>{JSON.stringify(value, null, 2)}</pre>
      )}
    </div>
  );
}
