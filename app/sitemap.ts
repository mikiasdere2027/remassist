import type { MetadataRoute } from 'next';
import { ROUTES, SITE_URL } from '@/lib/site';
import { publishedPosts } from '@/lib/blog/content';

/**
 * sitemap.xml (§11.2). Enumerates the new URL set — the WordPress
 * `wp-sitemap-*` index it replaces is listed in docs/url-audit.md and is
 * handled by the redirect map, not here.
 *
 * Routes come from lib/site.ts rather than a filesystem crawl so a route can
 * never appear here without someone deciding its priority.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const pages = ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
  // Only published posts (from the API) — an unpublished slug 404s, and
  // listing a 404 in the sitemap is a crawl error, not a hint.
  const posts = (await publishedPosts()).map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: 'yearly' as const,
    priority: 0.5,
  }));
  return [...pages, ...posts];
}
