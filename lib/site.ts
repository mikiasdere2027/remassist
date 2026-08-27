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
  { path: '/services/extra-services', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/reviews', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/privacy-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms-of-service', priority: 0.3, changeFrequency: 'yearly' },
];
