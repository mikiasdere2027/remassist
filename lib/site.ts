/**
 * Site-level constants for metadata, canonicals and the sitemap (§11.2).
 *
 * SITE_URL is the production origin the app will own after cutover. It is
 * overridable so staging builds emit their own canonicals instead of pointing
 * every staging page at production — set NEXT_PUBLIC_SITE_URL in the staging
 * environment. No trailing slash: every consumer appends its own path.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://remassistance.com').replace(/\/$/, '');

export const SITE_NAME = 'Rem Assist';

/**
 * Every route this app serves, with the sitemap priority and change frequency
 * each one earns. Keep it in sync when a route is added — app/sitemap.ts reads
 * it directly, and there is no filesystem crawl to fall back on.
 */
export interface Route {
  path: string;
  priority: number;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

/**
 * NOT LISTED: /case-studies. The page is live and honest about being empty
 * ("we publish a study only once the client has approved the numbers"), and the
 * header marks it "coming soon" rather than linking it. Advertising ~119 words
 * of placeholder to crawlers is thin content — add it back with the first
 * write-up.
 */
export const ROUTES: Route[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/how-it-works', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/qualify', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/services/sales-and-revenue', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/services/customer-service-agents', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/services/sdr-as-a-service', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/services/gtm-teams', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/services/virtual-back-office-team', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/services/finance-and-accounting', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/services/hr-and-recruiting', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/services/marketing-and-content', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/services/managed-it', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/services/ai-and-automation', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/services/industry-specific', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/services', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/reviews', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/privacy-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms-of-service', priority: 0.3, changeFrequency: 'yearly' },
];

/**
 * Open Graph defaults for a page.
 *
 * Next's `mergeMetadata` REPLACES the whole `openGraph` object when a child
 * segment declares one — it does not merge field by field. Every page here
 * declared `openGraph: { url }` to set its own canonical URL, and in doing so
 * silently discarded `type`, `siteName` and `locale` from the root layout: 22
 * routes shipped with none of them. Spreading the defaults back in is the
 * whole fix.
 *
 * The og:image IS set here, and has to be. app/opengraph-image.tsx exists and
 * Next does resolve it through the file convention — but only onto the segment
 * that owns the file. The home page picked it up (app/page.tsx sits in the same
 * directory); every other route declared its own `openGraph` object and lost it
 * along with everything else. Verified in the build output: before this,
 * /pricing emitted og:title, og:description and og:url and nothing more.
 *
 * The route is prerendered to a static PNG, so `/opengraph-image` is a real
 * URL that serves it — the ?hash query Next appends elsewhere is a cache
 * buster, not part of the path. metadataBase makes it absolute.
 */
export const OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'Rem Assist — remote teams that match your culture',
};

/**
 * Open Graph defaults for a page.
 */
export function pageOg(path: string, extra: Record<string, unknown> = {}) {
  return {
    type: 'website' as const,
    siteName: SITE_NAME,
    locale: 'en_US',
    url: path,
    images: [OG_IMAGE],
    ...extra,
  };
}
