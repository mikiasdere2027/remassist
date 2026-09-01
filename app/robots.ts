import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * robots.txt (§11.2). Everything is crawlable except the API surface, which
 * has nothing indexable on it, and /admin, which is behind a login. The sitemap
 * points at the absolute URL so it stays correct when fetched from either apex
 * or www.
 *
 * Disallowing /admin is hygiene, not a control: robots.txt is a request, and a
 * public one at that. The gate in app/admin/(protected)/layout.tsx is what
 * actually protects it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
