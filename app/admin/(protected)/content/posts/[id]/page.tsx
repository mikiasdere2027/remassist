import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { faqItems, posts } from '@/db/schema';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { authorOptions } from '@/lib/blog/authors';
import { categoryOptions } from '@/lib/blog/categories';
import { postMessage } from '../messages';
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
 * Everything the form does still lands on the same server actions. Saving
 * sanitizes the body against an allowlist before anything reaches the
 * database; publishing checks the same completeness list the form shows.
 * Neither is the editor's decision to make, because a hand-rolled POST can
 * carry anything.
 *
 * One article's body still lives in a React component. Its Body tab says so
 * rather than showing an empty editor somebody would reasonably try to fill
 * and then lose.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit post',
  robots: { index: false, follow: false },
};

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [user, { id }, sp] = await Promise.all([requireUser(), params, searchParams]);
  const message = postMessage(sp.ok, sp.error);
  const mayEdit = canEditContent(user.role);

  if (!isDatabaseConfigured()) notFound();

  const db = getDb();
  const [p] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!p) notFound();

  const [authors, categories, faqOptions] = await Promise.all([
    authorOptions(),
    categoryOptions(),
    db.select({ id: faqItems.id, question: faqItems.question }).from(faqItems).where(eq(faqItems.published, true)),
  ]);

  return (
    <>
      <AdminTopbar title="Edit post" subtitle={p.title} />

      <div className={styles.view}>
        {message && (
          <p
            className={`${styles.signinMsg} ${message.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
            role="status"
          >
            {message.text}
          </p>
        )}

        <PostForm
          mode="edit"
          canEdit={mayEdit}
          authors={authors}
          categories={categories}
          faqOptions={faqOptions}
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
            articleLayout: p.articleLayout ?? '',
            published: p.published,
          }}
        />
      </div>
    </>
  );
}
