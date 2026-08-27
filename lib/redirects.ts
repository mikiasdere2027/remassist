/**
 * Redirect map — §11.3 of MIGRATION-PLAN.md.
 *
 * This is the single source of truth for legacy → new path mappings. It is
 * consumed by the Next.js redirects() config (next.config.ts) and asserted in
 * CI (lib/redirects.test.ts): every `source` must resolve to a live
 * destination, and no entry may point at a page that 404s.
 *
 * Rules (from §11.3):
 * - `permanent: true` (301). These stay indefinitely — external links and
 *   search results point at them, and there is no expiry date on that.
 * - If any legacy URL contains spaces, match the **encoded** form (`%20`).
 * - Where a legacy page has no equivalent, redirect to the nearest relevant
 *   parent — never blanket-everything to `/`, which reads as a soft-404.
 * - The inventory of legacy URLs is docs/url-audit.md (§3.1).
 *
 * TRAILING SLASHES: every legacy WordPress URL ends in `/`, but no entry here
 * does. Next normalises `/pricing/` → `/pricing` with its own 308 before these
 * rules are matched (verified against all five surviving slugs), so writing the
 * slashed form would create a rule that never fires.
 *
 * DESTINATIONS were chosen by reading each live page (2026-08-26), not guessed
 * from the slug — several turned out to be empty Elementor stubs, which is why
 * a few land on the nearest topical parent rather than a like-for-like page.
 */

export interface Redirect {
  /** Legacy path, starting with `/`. Encoded form (%20) if it has spaces. */
  source: string;
  /** Live destination path within this app (or full URL with protocol). */
  destination: string;
  /** true for 301 (permanent), false for 302 (temporary). */
  permanent: boolean;
}

export const redirects: Redirect[] = [
  // --- Pages with a direct equivalent -------------------------------------
  // The old services index listed every subservice and industry use case;
  // "Everything we staff, in one place" is the same page in the new IA.
  { source: '/services', destination: '/services/extra-services', permanent: true },
  { source: '/pricing-2', destination: '/pricing', permanent: true },
  { source: '/terms-of-use', destination: '/terms-of-service', permanent: true },

  // --- Empty Elementor stubs → nearest topical parent ---------------------
  // Both render nav + footer only. /rem-ai has a clear topical home; /saas was
  // one of the industry use cases on the old services index, so it goes there.
  { source: '/rem-ai', destination: '/services/ai-and-automation', permanent: true },
  { source: '/saas', destination: '/services/extra-services', permanent: true },
  // "Our team section Inspirations" — the team rail lives on the home page.
  { source: '/inspirations', destination: '/#team', permanent: true },

  // --- Posts and taxonomies -----------------------------------------------
  // None of the four WordPress posts has a ported equivalent (the new blog
  // carries different articles), so they land on the blog index rather than a
  // mismatched post. Revisit if any is rewritten for the new site.
  { source: '/viverra-ullamcorper-diam-nibh-suspendisse-erat-in-sit-sodales', destination: '/blog', permanent: true },
  { source: '/bpos-emerging-growth-in-african-cities-why-ethiopia-is-the-future-hub-of-outsourcing', destination: '/blog', permanent: true },
  { source: '/rem-assist-your-guide-to-the-future', destination: '/blog', permanent: true },
  { source: '/elementor-1003', destination: '/blog', permanent: true },
  { source: '/category/uncategorized', destination: '/blog', permanent: true },
];

/**
 * Legacy URLs deliberately left to 404, with the reason. Recorded here so the
 * decision is visible and reversible rather than looking like an oversight.
 *
 * A removed page with no equivalent should 404: pointing it at an unrelated
 * page is what search engines treat as a soft-404, which is worse than the
 * honest answer. app/not-found.tsx signposts the live sections for anyone who
 * lands on one from an old link.
 *
 * OPEN (needs a business decision — flagged in docs/url-audit.md §4):
 * `/careers` is the only one of these with real content. If a careers page is
 * coming, add the mapping; if hiring moves to a third-party board, point it
 * there. Until then it 404s rather than dumping applicants on a sales page.
 */
export const notRedirected: { source: string; reason: string }[] = [
  { source: '/careers', reason: 'Live jobs board with no Next.js equivalent — awaiting a decision on whether careers returns.' },
  { source: '/job-form', reason: 'Empty stub; the application form behind /careers. Same decision as /careers.' },
  { source: '/thank-you-page', reason: 'Empty post-submit stub. Nothing to send a visitor to, and no one links to it deliberately.' },
];
