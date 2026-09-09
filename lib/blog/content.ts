import { and, desc, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { posts } from '@/db/schema';
import seed from '@/db/content-seed.json';
import type { Post } from './posts';

/**
 * Blog posts, read from the database.
 *
 * Same fallback rule as the FAQ and reviews: seed when DATABASE_URL is absent,
 * because CI builds without one and these routes are prerendered; a loud
 * failure when it is present and the query fails, because silently serving the
 * seed would undo an editor's work.
 *
 * Returns the same `Post` shape lib/blog/posts.ts exported, so the route, the
 * JSON-LD component and the metadata all keep working unchanged. That was the
 * plan recorded in app/blog/[slug]/page.tsx from the start: "swap
 * postBySlug/publishedPosts".
 */

function toPost(r: {
  slug: string; title: string; excerpt: string; date: string; readTime: string;
  category: string; image: string; authorName: string; authorAvatar: string;
  published: boolean;
}): Post {
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

/** Newest first, matching how the index reads. */
export async function publishedPosts(): Promise<Post[]> {
  if (!isDatabaseConfigured()) {
    return seed.posts.filter((p) => p.published).map(toPost);
  }
  const rows = await getDb()
    .select()
    .from(posts)
    .where(eq(posts.published, true))
    .orderBy(desc(posts.date));
  return rows.map(toPost);
}

/**
 * A published post and its stored body, or null.
 *
 * The body comes back separately from the Post because Post is the shape the
 * index cards and the JSON-LD want, and neither has any use for the article
 * text. Null body plus a legacy slug means the route renders ArticleBody
 * instead — see lib/blog/legacy-bodies.ts.
 */
export async function postBySlug(
  slug: string,
): Promise<{ post: Post; body: string | null; articleLayout: string | null } | null> {
  if (!isDatabaseConfigured()) {
    const p = seed.posts.find((x) => x.slug === slug && x.published);
    return p ? { post: toPost(p), body: p.body ?? null, articleLayout: (p as { articleLayout?: string }).articleLayout ?? null } : null;
  }
  const [row] = await getDb()
    .select()
    .from(posts)
    /* Published only. An unpublished post must 404 rather than being readable
       by anyone who guesses the slug — a draft is not a soft-launch. */
    .where(and(eq(posts.slug, slug), eq(posts.published, true)))
    .limit(1);
  return row ? { post: toPost(row), body: row.body, articleLayout: row.articleLayout } : null;
}

/**
 * Split stored body text into blocks for rendering.
 *
 * Plain text in, structure out: a blank line starts a new paragraph, a leading
 * "## " makes a heading. Deliberately not a Markdown parser and deliberately
 * not HTML — see the note in the posts editor's actions on why staff-written
 * HTML is not accepted here. Everything is rendered as text by the route, so
 * there is no escaping to get wrong.
 */
export function bodyBlocks(body: string): Array<{ type: 'h2' | 'p'; text: string }> {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => (block.startsWith('## ')
      ? { type: 'h2' as const, text: block.slice(3).trim() }
      : { type: 'p' as const, text: block }));
}
