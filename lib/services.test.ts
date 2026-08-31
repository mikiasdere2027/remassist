import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { SERVICES, relatedServices, serviceByPath } from './services';
import { ROUTES } from './site';

/**
 * lib/services.ts feeds two things that must not disagree: the `Service`
 * JSON-LD a crawler reads, and the cross-links a reader clicks. It also
 * duplicates each page's `metadata.description` by hand, which is the kind of
 * copy that rots the moment someone edits one of the two — so that is asserted
 * against the page source rather than trusted.
 */
const LIVE = new Set(ROUTES.map((r) => r.path));
const PATHS = new Set(SERVICES.map((s) => s.path));

/** The `description:` string from a page's own metadata export. */
function pageDescription(path: string): string {
  const src = readFileSync(join(process.cwd(), 'app', `${path}/page.tsx`), 'utf8');
  const block = src.slice(src.indexOf('export const metadata'));
  const m = /description:\s*'([^']*)'/.exec(block.replace(/\n\s*/g, ' '));
  if (!m) throw new Error(`no metadata.description in ${path}`);
  return m[1];
}

describe('service catalogue', () => {
  it('lists every service route the sitemap serves, and no others', () => {
    /* `/services` as well as `/services/*`: the directory page moved up to the
       section root, so a prefix test with a trailing slash silently drops it. */
    const serviceRoutes = [...LIVE].filter((p) => p === '/services' || p.startsWith('/services/')).sort();
    expect([...PATHS].sort()).toEqual(serviceRoutes);
  });

  it('has no duplicate paths', () => {
    expect(new Set(SERVICES.map((s) => s.path)).size).toBe(SERVICES.length);
  });

  it('points every `related` entry at a service in this file', () => {
    const dead = SERVICES.flatMap((s) =>
      s.related.filter((r) => !PATHS.has(r)).map((r) => `${s.path} -> ${r}`),
    );
    expect(dead).toEqual([]);
  });

  it('never lists a service as related to itself', () => {
    const self = SERVICES.filter((s) => s.related.includes(s.path)).map((s) => s.path);
    expect(self).toEqual([]);
  });

  it('gives every service exactly three distinct siblings to link', () => {
    for (const s of SERVICES) {
      expect(relatedServices(s.path)).toHaveLength(3);
      expect(new Set(s.related).size).toBe(3);
    }
  });

  it('describes each service exactly as that page describes itself', () => {
    for (const s of SERVICES) {
      expect(s.description, `description drift on ${s.path}`).toBe(pageDescription(s.path));
    }
  });

  /* /services is the directory itself. A "seats that work alongside this one"
     band there would offer three links to three of the nine lines the page has
     just listed in full, so it carries the JSON-LD the band would have emitted
     and nothing else. Every other service page still needs the band — it is
     their only route sideways. */
  it('renders the cross-link band on every service page except the directory', () => {
    for (const s of SERVICES.filter((x) => x.path !== '/services')) {
      const src = readFileSync(join(process.cwd(), 'app', `${s.path}/page.tsx`), 'utf8');
      expect(src, `${s.path} has no RelatedServices`).toContain(`<RelatedServices path='${s.path}'`);
    }
  });

  it('keeps the directory page its Service and breadcrumb JSON-LD', () => {
    const src = readFileSync(join(process.cwd(), 'app/services/page.tsx'), 'utf8');
    expect(src).toContain(`<ServiceJsonLd path='/services' />`);
  });

  it('resolves a known path and rejects an unknown one', () => {
    expect(serviceByPath('/services/gtm-teams')?.name).toBe('GTM Teams');
    expect(serviceByPath('/services/nope')).toBeUndefined();
    expect(relatedServices('/services/nope')).toEqual([]);
  });
});
