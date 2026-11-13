import { apiPublic, TAGS } from '@/lib/api/public';
import type { PublicPostDetail } from '@/lib/api/posts';
import seed from '@/lib/content/seed/content.json';
import { cleanHtml } from '@/lib/content/sanitize';
import { parseArticleLayout } from './article-layout';
import type { Post } from './posts';

/**
 * Blog posts for the public site, from the backend API
 * (GET /v1/public/posts and /v1/public/posts/:slug), cached under the `posts`
 * tag — the backend revalidates it when an editor saves or publishes.
 *
 * If the API can't be reached (e.g. a build without the backend running) the
 * bundled seed (lib/content/seed/content.json) is served instead — loudly, see
 * lib/api/public.ts.
 */

type SeedPost = (typeof seed.posts)[number] & { articleLayout?: string | null };

function seedToPost(r: SeedPost): Post {
  return {
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    date: r.date,
    readTime: r.readTime,
    category: r.category,
    image: r.image,
    published: r.published,
    author: { name: r.authorName, avatar: r.authorAvatar },
  };
}

/** Published seed posts, newest first — the fallback for publishedPosts(). */
export function seedPublishedPosts(): Post[] {
  return (seed.posts as SeedPost[])
    .filter((p) => p.published)
    .map(seedToPost)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** One published seed post as the detail endpoint would answer, or null. */
export function seedPostBySlug(slug: string): PublicPostDetail | null {
  const p = (seed.posts as SeedPost[]).find((x) => x.slug === slug && x.published);
  if (!p) return null;
  return {
    post: seedToPost(p),
    /* Cleaned like the API's answer, so the page can render either as-is. */
    body: p.body ? cleanHtml(p.body) : null,
    articleLayout: parseArticleLayout(p.articleLayout ?? null),
    /* The seed's FAQ ids are not the database's, and the fallback is a
       build-time stopgap: no embedded central FAQ entries. */
    existingFaq: [],
  };
}

/** Newest first, matching how the index reads. */
export function publishedPosts(): Promise<Post[]> {
  return apiPublic<Post[]>('/public/posts', {
    tags: [TAGS.posts],
    fallback: seedPublishedPosts,
  });
}

/**
 * A published post with its sanitised body, parsed layout and the central FAQ
 * entries it embeds — or null.
 *
 * Checked against the published list first: apiPublic falls back to the seed
 * on any error, a 404 included, so asking for an unpublished slug directly
 * would serve the seed's copy of it. The list is cached under the same tag, so
 * the check is free after the first request.
 */
export async function postBySlug(slug: string): Promise<PublicPostDetail | null> {
  const posts = await publishedPosts();
  if (!posts.some((p) => p.slug === slug)) return null;
  return apiPublic<PublicPostDetail | null>(`/public/posts/${encodeURIComponent(slug)}`, {
    tags: [TAGS.posts],
    fallback: () => seedPostBySlug(slug),
  });
}
