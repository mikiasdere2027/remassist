'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { SITE_DEFAULTS, type SiteSettingsWithLinks } from '@/lib/site/settings';

/**
 * The site's business details (Site details in the admin) for client
 * components, which can't call the API themselves: the quiz's email fallback,
 * the service pages' contact form. The public layout loads them once and
 * provides them here. Outside a provider the fallback values apply.
 */
const Ctx = createContext<SiteSettingsWithLinks>(SITE_DEFAULTS);

export function SiteSettingsProvider({ value, children }: { value: SiteSettingsWithLinks; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSiteSettings(): SiteSettingsWithLinks {
  return useContext(Ctx);
}
