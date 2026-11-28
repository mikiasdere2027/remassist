import 'server-only';
import { apiPublic, TAGS } from '@/lib/api/public';
import { SITE_DEFAULTS, type SiteSettingsWithLinks } from './settings';

/**
 * The site's business details for server components: the footer, the
 * structured data, the legal and pricing pages. Cached with the `site` tag, so
 * an admin's edit reaches the pages without a rebuild. Falls back to the
 * values the site always showed if the backend can't be reached.
 */
export function getSiteSettings(): Promise<SiteSettingsWithLinks> {
  return apiPublic<SiteSettingsWithLinks>('/public/site-settings', {
    tags: [TAGS.site],
    fallback: () => SITE_DEFAULTS,
  });
}
