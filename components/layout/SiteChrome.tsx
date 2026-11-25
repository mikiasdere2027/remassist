'use client';

import { usePathname } from 'next/navigation';

/**
 * Hides the marketing chrome on the admin.
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

/**
 * `/api/auth` is not an oversight. Auth.js REWRITES rather than redirects for
 * its own pages: requesting a code lands on /api/auth/verify-request, which
 * renders the configured verifyRequest page while the URL stays under
 * /api/auth. Matching only /admin let the marketing header render on top of the
 * sign-in code screen. The error page rewrites the same way.
 */
/* /p/<token>: a client's proposal, shown as a clean document. */
const BARE_PREFIXES = ['/admin', '/api/auth', '/p/', '/i/'];

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (BARE_PREFIXES.some((p) => pathname?.startsWith(p))) return null;
  return <>{children}</>;
}
