import { requireUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { apiServer } from '@/lib/api/server';
import type { AuthorOption, FaqOption } from '@/lib/api/posts';
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

export default async function NewPostPage() {
  const user = await requireUser();
  const mayWrite = canEditContent(user.role);

  const [authors, categories, faqOptions] = await Promise.all([
    apiServer<AuthorOption[]>('/admin/posts/authors'),
    apiServer<string[]>('/admin/posts/categories'),
    apiServer<FaqOption[]>('/admin/posts/faq-options'),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <AdminTopbar
        title="New post"
        subtitle="Write the article, then publish it when it is ready"
      />

      <div className={styles.view}>
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
