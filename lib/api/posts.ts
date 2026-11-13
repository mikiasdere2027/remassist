/**
 * Blog posts — response shapes and request bodies for the backend's posts
 * module (remassist-backend src/modules/posts).
 *
 *   GET    /v1/admin/posts?status=&q=   → AdminPostRow[] (no bodies)
 *   GET    /v1/admin/posts/:id          → AdminPost (layout parsed, `missing`)
 *   POST   /v1/admin/posts              → AdminPost (always a draft)
 *   PATCH  /v1/admin/posts/:id          → AdminPost (incl. { published })
 *   DELETE /v1/admin/posts/:id          → 204 (drafts only; live post → 409)
 *   GET    /v1/admin/posts/authors      → AuthorOption[]
 *   GET    /v1/admin/posts/categories   → string[]
 *   GET    /v1/admin/posts/faq-options  → FaqOption[]
 *   POST   /v1/admin/posts/preview      → { html } (sanitised, writes nothing)
 *   GET    /v1/public/posts             → PublicPost[]
 *   GET    /v1/public/posts/:slug       → PublicPostDetail
 *
 * A refused publish answers 409 with `missing: string[]` (editor labels of
 * the fields still empty) next to the message.
 */
import type { ArticleLayout } from '@/lib/blog/article-layout';
import type { Post } from '@/lib/blog/posts';
import { isApiError } from './errors';

export type PostStatus = 'all' | 'published' | 'draft';

/** One row of the admin list. */
export interface AdminPostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  image: string;
  authorName: string;
  authorAvatar: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  /** What still blocks publishing. Absent on backends older than this field. */
  missing?: string[];
}

/** A post as the editor reads it. */
export interface AdminPost extends Omit<AdminPostRow, 'missing'> {
  body: string | null;
  articleLayout: ArticleLayout;
  missing: string[];
}

/** The fields the editor sends on create and save. */
export interface PostInput {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  /** JSON text or the object; the backend normalises it. */
  articleLayout: string | ArticleLayout | null;
  date: string;
  readTime: string;
  category: string;
  image: string;
  authorName: string;
  authorAvatar: string;
}

export interface AuthorOption {
  name: string;
  /** Their role, for the option label. */
  role: string;
  /** Their headshot, applied to the post when they are picked. */
  avatar: string | null;
}

export interface FaqOption {
  id: string;
  question: string;
}

/** The public list item — the same shape as lib/blog/posts.ts `Post`. */
export type PublicPost = Post;

export interface PublicPostDetail {
  post: PublicPost;
  /** Sanitised HTML, or null when the post has no body. */
  body: string | null;
  articleLayout: ArticleLayout;
  /** The central FAQ entries the layout embeds, published only, answers as HTML. */
  existingFaq: Array<{ question: string; answer: string }>;
}

export function postsListPath(status: PostStatus, q: string): string {
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (q) params.set('q', q);
  const qs = params.toString();
  return `/admin/posts${qs ? `?${qs}` : ''}`;
}

/** The `missing` list from a refused publish, or null for any other error. */
export function publishMissing(err: unknown): string[] | null {
  if (!isApiError(err, 409)) return null;
  const missing = (err.body as { missing?: unknown } | null)?.missing;
  return Array.isArray(missing) ? (missing as string[]) : null;
}
