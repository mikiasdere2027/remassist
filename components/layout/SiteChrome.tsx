'use client';

import { usePathname } from 'next/navigation';

/**
 * Hides the marketing chrome on /admin.
 *
 * The root layout applies to every route, so the header, footer, chat widget,
 * booking modal and consent banner were rendering on top of the admin. The
 * admin has no business loading a Calendly iframe or asking an employee to
 * accept analytics cookies.
 *
 * The idiomatic fix is a route group — move the marketing routes under
 * app/(site)/ with their own layout and leave /admin outside it. That is a
 * cleaner separation and worth doing, but it means relocating ~25 shipped route
 * directories, which is a large and risky diff for a cosmetic problem. This
 * keeps the change to one file until that move is worth making on its own.
 *
 * usePathname resolves during SSR too, so the admin's HTML never contains the
 * chrome — it is not hidden with CSS, it is not rendered.
 */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;
  return <>{children}</>;
}
