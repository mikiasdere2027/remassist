import { Fragment } from 'react';
import Link from 'next/link';
import { desc } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { posts } from '@/db/schema';
import { requireUser } from '@/lib/auth/require';
import { canDeletePost, canEditContent } from '@/lib/auth/roles';
import { formatDate, formatRelativeTime } from '@/lib/leads/display';
import { hasBody } from '@/lib/blog/completeness';
import { deletePost, setPostPublished } from './actions';
import { postMessage } from './messages';
import RowMenu from './RowMenu';
import AdminTopbar from '../../AdminTopbar';
import styles from '../../../admin.module.css';

/**
 * The posts list — a list, and nothing else.
 *
 * This screen used to be the editor too: every post rendered as a panel with
 * eleven fields and a body textarea inside it, so finding the one draft that
 * needed publishing meant scrolling past every other article's markup. Forty
 * posts made that a page you could not read. The shape it wants is the one
 * every other list in this admin already has — a filter bar over a table, one
 * line per row, editing behind a link — and now that a post's body is a rich
 * document rather than a textarea, a stack of them on the index was never
 * going to work anyway.
 *
 * So: status tabs with counts, a search box, four columns, and a menu at the
 * end of the row. Everything that edits a post lives at
 * /admin/content/posts/[id]; everything that creates one lives at
 * /admin/content/posts/new. Two things stay on this page because they are
 * decisions about the list rather than about the article — publishing, and
 * deleting a draft — and both are in the row's menu.
 *
 * Two notes on what the columns say:
 *
 *  - Updated is relative, in the same words the leads table and the dashboard
 *    use, with the exact timestamp on hover. A shared vocabulary matters more
 *    here than matching a mockup's longhand: "3 d ago" means on this screen
 *    what it means on the other two.
 *  - Publish is refused, not hidden, for a post with no body. An empty article
 *    on the blog is a link to a blank page, and the menu item says so on hover
 *    rather than quietly disappearing.
 *
 * Filtering and paging are done in memory on purpose. Every post is already
 * being read for the tab counts, and a blog that outgrows one query is a
 * different problem from the one this page has.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Blog posts',
  robots: { index: false, follow: false },
};

const STATUSES = ['all', 'published', 'draft'] as const;
type Status = (typeof STATUSES)[number];

/** Enough rows to fill the panel without turning the page into a scroll. */
const PAGE_SIZE = 10;

function asStatus(v: string | undefined): Status {
  return STATUSES.includes(v as Status) ? (v as Status) : 'all';
}

export default async function PostsListPage({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string; error?: string; status?: string; q?: string; page?: string; del?: string;
  }>;
}) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const message = postMessage(sp.ok, sp.error);
  const mayEdit = canEditContent(user.role);
  const mayDelete = canDeletePost(user.role);
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
            edit.
          </div>
        </div>
      </>
    );
  }

  const db = getDb();
  /* Most recently touched first: on a list you come to in order to finish
     something, the row you want is the one you were last in. */
  const all = await db.select().from(posts).orderBy(desc(posts.updatedAt));

  /* The search narrows what the tabs count, the tabs do not narrow each other.
     A tab whose number changes when you select it tells you nothing about what
     is on the other tabs; a tab that ignores your search tells you nothing
     about your search. */
  const needle = q.toLowerCase();
  const matching = needle
    ? all.filter((p) =>
        [p.title, p.category, p.slug, p.excerpt, p.authorName]
          .some((f) => f.toLowerCase().includes(needle)),
      )
    : all;

  const total = matching.length;
  const publishedCount = matching.filter((p) => p.published).length;
  const draftCount = total - publishedCount;

  const rows = matching.filter((p) => {
    if (status === 'published') return p.published;
    if (status === 'draft') return !p.published;
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  /* Clamped rather than trusted: a hand-typed ?page=9 on a two-page list lands
     on the last page, not on an empty table that looks like lost content. */
  const page = Math.min(Math.max(1, Number(sp.page) || 1), pageCount);
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* Every link keeps the other controls. Losing the search you typed because
     you clicked Draft is what makes a filter bar feel broken when each control
     works perfectly on its own. Params equal to their default are omitted, so
     the canonical URL of the default view is bare. */
  const href = (next: { status?: Status; q?: string; page?: number; del?: string }) => {
    const s = next.status ?? status;
    const term = next.q ?? q;
    /* Changing the filter always returns to page one — page 3 of the drafts is
       not the same three posts as page 3 of everything. */
    const p = next.page ?? (next.status !== undefined || next.q !== undefined ? 1 : page);
    const params = new URLSearchParams();
    if (s !== 'all') params.set('status', s);
    if (term) params.set('q', term);
    if (p > 1) params.set('page', String(p));
    if (next.del) params.set('del', next.del);
    const qs = params.toString();
    return `/admin/content/posts${qs ? `?${qs}` : ''}`;
  };

  /* Only honoured if it names a row on the page you are looking at, so a stale
     ?del= left in the URL after a filter change cannot arm a confirm step
     under a row you did not open it on. */
  const confirming = mayDelete && sp.del && visible.some((p) => p.id === sp.del) ? sp.del : null;

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
          <div className={styles.filterPills} role="group" aria-label="Filter posts by status">
            <Tab href={href({ status: 'all' })} on={status === 'all'} label="All" count={total} />
            <Tab
              href={href({ status: 'published' })}
              on={status === 'published'}
              label="Published"
              count={publishedCount}
            />
            <Tab
              href={href({ status: 'draft' })}
              on={status === 'draft'}
              label="Draft"
              count={draftCount}
            />
          </div>

          {/* A GET form, so a search is a URL you can keep, share or reload.
              The status rides along in a hidden field for the same reason the
              tabs carry the search: neither control resets the other. */}
          <form className={styles.filterSearch} method="get" role="search">
            {status !== 'all' && <input type="hidden" name="status" value={status} />}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search the blog…"
              aria-label="Search posts by title, category, slug or author"
            />
          </form>

          {q && (
            <Link className={`${styles.btn} ${styles.btnGhost}`} href={href({ q: '' })}>
              Clear search
            </Link>
          )}
        </div>

        <section className={styles.panel}>
          {visible.length === 0 ? (
            <p className={styles.empty}>
              <strong>{all.length === 0 ? 'No posts yet' : 'No posts match'}</strong>
              {all.length === 0
                ? 'Use “New post” above to write the first one.'
                : 'Try another search, or a different tab.'}
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Title</th>
                    <th scope="col">Status</th>
                    <th scope="col">Updated</th>
                    <th scope="col" className={styles.nowrap} style={{ textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => {
                    const publishable = hasBody(p.body);
                    return (
                      <Fragment key={p.id}>
                        <tr>
                          <td>
                            {/* The dominant cell: the article in weight, the
                                category under it in small grey, the title itself
                                the link to the editor — the row's main action is
                                the thing you came to read. */}
                            <Link className={styles.rowLink} href={`/admin/content/posts/${p.id}`}>
                              {p.title}
                            </Link>
                            <span className={styles.cellSecondary}>{p.category}</span>
                          </td>
                          <td>
                            <span
                              className={`${styles.pill} ${p.published ? styles.pillLow : styles.pillMed}`}
                            >
                              {p.published ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td className={styles.nowrap}>
                            <span
                              className={styles.relativeTime}
                              title={formatDate(p.updatedAt)}
                            >
                              {formatRelativeTime(p.updatedAt)}
                            </span>
                          </td>
                          <td>
                            <div className={styles.actions}>
                              {mayEdit ? (
                                <RowMenu
                                  publish={setPostPublished}
                                  id={p.id}
                                  title={p.title}
                                  published={p.published}
                                  publishable={publishable}
                                  editHref={`/admin/content/posts/${p.id}`}
                                  deleteHref={href({ del: p.id })}
                                  mayDelete={mayDelete}
                                />
                              ) : (
                                <Link
                                  className={styles.rowLink}
                                  href={`/admin/content/posts/${p.id}`}
                                >
                                  Open
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                        {confirming === p.id && (
                          <ConfirmDelete post={p} backHref={href({})} />
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pageCount > 1 && (
            <div className={styles.panelFoot}>
              <span>
                {rows.length} {rows.length === 1 ? 'post' : 'posts'} · page {page} of {pageCount}
              </span>
              <Pager page={page} pageCount={pageCount} href={href} />
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/**
 * Deleting asks first, in the row's own place.
 *
 * A server-rendered confirm step rather than a browser dialog, matching the
 * rate tables: this admin ships no client-side JS for its tables, and a
 * `confirm()` that a page can be built without is a control that is not really
 * there. The checkbox is `required` in the browser and re-checked in
 * deletePost, because a required attribute is a courtesy and not a control.
 */
function ConfirmDelete({
  post,
  backHref,
}: {
  post: { id: string; title: string; slug: string };
  backHref: string;
}) {
  return (
    <tr>
      <td className={styles.editCell} colSpan={4}>
        <form className={styles.editForm} action={deletePost}>
          <input type="hidden" name="id" value={post.id} />
          <p style={{ margin: 0, flex: '1 1 22rem' }}>
            <strong>Delete “{post.title}”?</strong>
            <span className={styles.cellSecondary}>
              The draft and everything written in it go for good. Nothing else on this screen
              destroys anything — unpublishing keeps the article and only takes it off the blog.
            </span>
          </p>
          <label className={styles.confirmCheck} htmlFor={`del-${post.id}`}>
            <input type="checkbox" id={`del-${post.id}`} name="confirm" value="1" required />
            <span>
              I understand this cannot be undone, and that <code>/blog/{post.slug}</code> is
              given up along with it.
            </span>
          </label>
          <div className={styles.rowActions} style={{ padding: 0 }}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" autoFocus>
              Delete this draft
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

/**
 * Numbered pages, as links.
 *
 * Numbers rather than only Older/Newer because the order here is "last
 * touched", which is stable enough that page 2 means something between visits
 * — unlike the leads table, where a cursor is the honest answer to a list that
 * grows from the top while you read it.
 */
function Pager({
  page,
  pageCount,
  href,
}: {
  page: number;
  pageCount: number;
  href: (next: { page?: number }) => string;
}) {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  return (
    <span className={styles.pager}>
      {page > 1 ? (
        <Link className={styles.pagerLink} href={href({ page: page - 1 })} aria-label="Previous page">
          ‹
        </Link>
      ) : (
        <span className={styles.pagerOff} aria-hidden="true">‹</span>
      )}

      {pages.map((n) =>
        n === page ? (
          <span
            key={n}
            className={`${styles.pagerLink} ${styles.pagerLinkOn}`}
            aria-current="page"
          >
            {n}
          </span>
        ) : (
          <Link key={n} className={styles.pagerLink} href={href({ page: n })}>
            {n}
          </Link>
        ),
      )}

      {page < pageCount ? (
        <Link className={styles.pagerLink} href={href({ page: page + 1 })} aria-label="Next page">
          ›
        </Link>
      ) : (
        <span className={styles.pagerOff} aria-hidden="true">›</span>
      )}
    </span>
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
      title="Posts"
      subtitle="Drafts, publishing and the live blog"
      action={
        mayEdit ? (
          <Link href="/admin/content/posts/new" className={styles.btnHeader}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New post
          </Link>
        ) : undefined
      }
    />
  );
}
