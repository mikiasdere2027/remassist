import Link from 'next/link';
import { isDatabaseConfigured } from '@/db';
import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { authorOptions } from '@/lib/blog/authors';
import { categoryOptions } from '@/lib/blog/categories';
import { getDb } from '@/db';
import { faqItems } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { postMessage } from '../messages';
import PostForm from '../PostForm';
import AdminTopbar from '../../../AdminTopbar';
import styles from '../../../../admin.module.css';

/**
 * New post — the destination of the header's "New post" button.
 *
 * The screen itself is PostForm, the same component the edit page renders, so
 * writing a post and revising one are one interface rather than two that drift
 * apart. This page's job is the three things only the server can do: check who
 * is asking, build the author list, and choose what an empty post starts as.
 *
 * Those defaults are deliberately thin. The fields used to arrive pre-filled
 * with "Uncategorised" and a placeholder cover path, which satisfied the
 * publish gate with values nobody chose — a post could go live categorised as
 * nothing, over a stand-in image. Empty is honest, and the gate then asks for
 * them. The two exceptions are today's date and "5 min read", which are real
 * answers rather than stand-ins.
 *
 * The author defaults to whoever published most recently, because posts come
 * in runs and that is nearly always the right name.
 *
 * Created as a draft — publishing stays an explicit choice, so a half-written
 * article can never reach the blog by accident.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'New post',
  robots: { index: false, follow: false },
};

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const message = postMessage(sp.ok, sp.error);
  const mayWrite = canEditContent(user.role);

  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminTopbar title="New post" subtitle="Drafts, publishing and the live blog" />
        <div className={styles.view}>
          <div className={styles.memberTopRow}>
            <Link className={styles.memberBackBtn} href="/admin/content/posts">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              All posts
            </Link>
          </div>
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
  const [authors, categories, faqOptions] = await Promise.all([
    authorOptions(),
    categoryOptions(),
    db.select({ id: faqItems.id, question: faqItems.question }).from(faqItems).where(eq(faqItems.published, true)),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <AdminTopbar
        title="New post"
        subtitle="Write the article, then publish it when it is ready"
      />

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
          mode="new"
          canEdit={mayWrite}
          authors={authors}
          categories={categories}
          faqOptions={faqOptions}
          values={{
            id: '',
            title: '',
            slug: '',
            excerpt: '',
            category: '',
            date: today,
            readTime: '5 min read',
            image: '',
            authorName: authors[0]?.name ?? '',
            authorAvatar: authors[0]?.avatar ?? '',
            body: '',
            articleLayout: '',
            published: false,
          }}
        />
      </div>
    </>
  );
}
