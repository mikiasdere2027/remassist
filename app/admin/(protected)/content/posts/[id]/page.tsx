import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { isApiError } from '@/lib/api/errors';
import { apiServer } from '@/lib/api/server';
import type { AdminPost, AuthorOption, FaqOption } from '@/lib/api/posts';
import PostForm from '../PostForm';
import AdminTopbar from '../../../AdminTopbar';
import styles from '../../../../admin.module.css';

/**
 * Edit one post — the same screen as New post, opened on an article that
 * exists.
 *
 * The list used to be this page repeated once per row, which is what made it
 * unreadable and what made rich editing impossible: a document editor is a
 * screen, not a cell. Now the list is a list, and both writing and revising
 * run through PostForm — see that file for why the editor is a client
 * component and why the body has a tab of its own.
 *
 * Everything the form does goes to the backend API. Saving sanitizes the
 * body against an allowlist before anything reaches the database; publishing
 * checks the same completeness list the form shows. Neither is the editor's
 * decision to make, because a hand-rolled request can carry anything.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit post',
  robots: { index: false, follow: false },
};

/** Not a UUID → the API answers 400; either way there is no such post. */
async function loadPost(id: string): Promise<AdminPost | null> {
  try {
    return await apiServer<AdminPost>(`/admin/posts/${encodeURIComponent(id)}`);
  } catch (err) {
    if (isApiError(err, 404) || isApiError(err, 400)) return null;
    throw err;
  }
}

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [user, { id }, sp] = await Promise.all([requireUser(), params, searchParams]);
  const mayEdit = canEditContent(user.role);

  const [p, authors, categories, faqOptions] = await Promise.all([
    loadPost(id),
    apiServer<AuthorOption[]>('/admin/posts/authors'),
    apiServer<string[]>('/admin/posts/categories'),
    apiServer<FaqOption[]>('/admin/posts/faq-options'),
  ]);
  if (!p) notFound();

  return (
    <>
      <AdminTopbar title="Edit post" subtitle={p.title} />

      <div className={styles.view}>
        <PostForm
          /* Remount when a different post opens, so the form state is its own. */
          key={p.id}
          mode="edit"
          canEdit={mayEdit}
          authors={authors}
          categories={categories}
          faqOptions={faqOptions}
          notice={
            sp.created ? 'Draft created. It is not on the blog until you publish it.' : undefined
          }
          values={{
            id: p.id,
            title: p.title,
            slug: p.slug,
            excerpt: p.excerpt,
            category: p.category,
            date: p.date,
            readTime: p.readTime,
            image: p.image,
            authorName: p.authorName,
            authorAvatar: p.authorAvatar,
            body: p.body ?? '',
            articleLayout: JSON.stringify(p.articleLayout ?? {}),
            published: p.published,
          }}
        />
      </div>
    </>
  );
}
