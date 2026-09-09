import { desc } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { posts } from '@/db/schema';

/**
 * The categories posts are already filed under, for the editor's dropdown.
 *
 * There is no categories table, and this does not invent one. A category is a
 * string on the post — the index card prints it as the topic, and the article
 * hero prints it as the pill above the headline — so the set of categories is
 * whatever the posts say it is. Reading them back is enough to turn a text box
 * into a list, and it cannot fall out of step with the posts the way a
 * separate table would.
 *
 * What it buys is the thing a free text field could not: "Hiring Strategy"
 * stays one category instead of becoming three the first time somebody types
 * "hiring strategy" or "Hiring strategy ". The editor can still introduce a
 * new one — see the New category field in PostForm — which is what keeps this
 * a convenience rather than a fence.
 *
 * Most recently used first, for the same reason as the author list: whoever is
 * writing today is usually writing about the same thing as last week.
 *
 * If categories ever need a description, an order of their own, or a page per
 * category, that is the point at which they earn a table.
 */

/** Deep enough to cover every category in use; the blog is not large. */
const RECENT_POSTS = 200;

export async function categoryOptions(): Promise<string[]> {
  if (!isDatabaseConfigured()) return [];

  const rows = await getDb()
    .select({ category: posts.category })
    .from(posts)
    .orderBy(desc(posts.updatedAt))
    .limit(RECENT_POSTS);

  const seen = new Set<string>();
  for (const row of rows) {
    const name = row.category.trim();
    if (name) seen.add(name);
  }
  return [...seen];
}
