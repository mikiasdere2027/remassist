import { describe, expect, it } from 'vitest';
import { redirects, notRedirected } from './redirects';
import { ROUTES } from './site';

/**
 * §13.3 — the redirect map is asserted in CI, not just eyeballed. Risk #1 in
 * the register is losing rankings and inbound links at cutover, and the way
 * that actually happens is a rule quietly pointing at a page that 404s.
 *
 * These run without a server: every destination is checked against the route
 * list the app actually serves (lib/site.ts, which also feeds the sitemap), so
 * deleting or renaming a route fails the build instead of the redirect.
 */
const LIVE = new Set(ROUTES.map((r) => r.path));

/** Strip a #fragment — a redirect to /#team lands on the / route. */
const routeOf = (destination: string) => destination.split('#')[0].replace(/\/$/, '') || '/';

describe('legacy redirect map', () => {
  it('sends every source to a route this app serves', () => {
    const dead = redirects
      .filter((r) => !r.destination.startsWith('http'))
      .filter((r) => !LIVE.has(routeOf(r.destination)))
      .map((r) => `${r.source} -> ${r.destination}`);
    expect(dead).toEqual([]);
  });

  it('has no duplicate sources', () => {
    const seen = redirects.map((r) => r.source);
    expect(seen).toEqual([...new Set(seen)]);
  });

  it('never redirects a path to itself', () => {
    expect(redirects.filter((r) => r.source === r.destination)).toEqual([]);
  });

  it('uses absolute paths and no trailing slashes', () => {
    // Next normalises `/pricing/` to `/pricing` before matching, so a slashed
    // source is a rule that can never fire.
    for (const r of redirects) {
      expect(r.source.startsWith('/'), `${r.source} must start with /`).toBe(true);
      expect(r.source.endsWith('/'), `${r.source} must not end with /`).toBe(false);
    }
  });

  it('is permanent — these outlive the cutover', () => {
    expect(redirects.filter((r) => !r.permanent)).toEqual([]);
  });

  it('does not both redirect and deliberately 404 the same path', () => {
    const sources = new Set(redirects.map((r) => r.source));
    expect(notRedirected.filter((n) => sources.has(n.source))).toEqual([]);
  });

  it('covers every legacy URL in the audit, or records why not', () => {
    // docs/url-audit.md §2. Slugs whose only difference is a trailing slash are
    // handled by Next's own 308 and are intentionally absent from both lists.
    const AUTO_NORMALISED = ['/', '/blog', '/how-it-works', '/pricing', '/reviews', '/privacy-policy'];
    const audited = [
      ...AUTO_NORMALISED,
      '/services', '/pricing-2', '/saas', '/rem-ai', '/careers', '/job-form',
      '/thank-you-page', '/terms-of-use', '/inspirations',
      '/viverra-ullamcorper-diam-nibh-suspendisse-erat-in-sit-sodales',
      '/bpos-emerging-growth-in-african-cities-why-ethiopia-is-the-future-hub-of-outsourcing',
      '/rem-assist-your-guide-to-the-future',
      '/elementor-1003',
      '/category/uncategorized',
    ];
    const handled = new Set([
      ...redirects.map((r) => r.source),
      ...notRedirected.map((n) => n.source),
      ...AUTO_NORMALISED,
      /* A legacy URL is equally handled when the app simply serves it. The old
         WordPress services index lived at /services, and the directory page has
         moved back onto that exact path — so it resolves now instead of
         redirecting, which is a better outcome than the 301 it used to get. */
      ...ROUTES.map((r) => r.path),
    ]);
    expect(audited.filter((u) => !handled.has(u))).toEqual([]);
  });
});
