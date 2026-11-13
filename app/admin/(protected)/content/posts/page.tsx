import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { canDeletePost, canEditContent } from '@/lib/auth/roles';
import { apiServer } from '@/lib/api/server';
import { postsListPath, type AdminPostRow } from '@/lib/api/posts';
import PostsTable from './PostsTable';
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
 * deleting a draft — and both are in the row's menu (PostsTable, which calls
 * the API).
 *
 * The search goes to the API (GET /v1/admin/posts?q=); the status tabs and
 * paging are done here, in memory, because the tab counts need every
 * matching post anyway, and a blog that outgrows one query is a different
 * problem from the one this page has.
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
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const mayEdit = canEditContent(user.role);
  const mayDelete = canDeletePost(user.role);
  const status = asStatus(sp.status);
  const q = (sp.q ?? '').trim().slice(0, 200);

  /* Most recently touched first: on a list you come to in order to finish
     something, the row you want is the one you were last in.

     The search narrows what the tabs count, the tabs do not narrow each other.
     A tab whose number changes when you select it tells you nothing about what
     is on the other tabs; a tab that ignores your search tells you nothing
     about your search. */
  const matching = await apiServer<AdminPostRow[]>(postsListPath('all', q));
  /* "No posts yet" only when nothing narrowed the list. */
  const anyPosts = matching.length > 0 || q !== '';

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

  /* Every link keeps the other controls. Params equal to their default are
     omitted, so the canonical URL of the default view is bare. */
  const href = (next: { status?: Status; q?: string; page?: number }) => {
    const s = next.status ?? status;
    const term = next.q ?? q;
    /* Changing the filter always returns to page one. */
    const p = next.page ?? (next.status !== undefined || next.q !== undefined ? 1 : page);
    const params = new URLSearchParams();
    if (s !== 'all') params.set('status', s);
    if (term) params.set('q', term);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/admin/content/posts${qs ? `?${qs}` : ''}`;
  };

  return (
    <>
      <Topbar mayEdit={mayEdit} />

      <div className={styles.view}>
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
              The status rides along in a hidden field: neither control resets
              the other. */}
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

        <PostsTable
          rows={visible}
          mayEdit={mayEdit}
          mayDelete={mayDelete}
          empty={
            anyPosts
              ? { title: 'No posts match', text: 'Try another search, or a different tab.' }
              : { title: 'No posts yet', text: 'Use “New post” above to write the first one.' }
          }
          footer={
            pageCount > 1 ? (
              <div className={styles.panelFoot}>
                <span>
                  {rows.length} {rows.length === 1 ? 'post' : 'posts'} · page {page} of {pageCount}
                </span>
                <Pager page={page} pageCount={pageCount} href={href} />
              </div>
            ) : undefined
          }
        />
      </div>
    </>
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
