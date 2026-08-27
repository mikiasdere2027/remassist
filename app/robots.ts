import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * robots.txt (§11.2). Everything is crawlable except the API surface, which
 * has nothing indexable on it. The sitemap points at the absolute URL so it
 * stays correct when fetched from either apex or www.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
