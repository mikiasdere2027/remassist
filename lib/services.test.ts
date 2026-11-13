import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { SERVICES, serviceByPath } from './services';
import { ROUTES } from './site';

/**
 * lib/services.ts feeds the `Service` JSON-LD a crawler reads. It duplicates
 * each page's `metadata.description` by hand, which is the kind of copy that
 * rots the moment someone edits one of the two — so that is asserted against
 * the page source rather than trusted.
 */
const LIVE = new Set(ROUTES.map((r) => r.path));
const PATHS = new Set(SERVICES.map((s) => s.path));

/** The `description:` string from a page's own metadata export. */
function pageDescription(path: string): string {
  const src = readFileSync(join(process.cwd(), 'app', '(site)', `${path}/page.tsx`), 'utf8');
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

  it('describes each service exactly as that page describes itself', () => {
    for (const s of SERVICES) {
      expect(s.description, `description drift on ${s.path}`).toBe(pageDescription(s.path));
    }
  });

  /* The "seats that work alongside this one" band used to close every service
     page but the directory, and it emitted that page's Service and breadcrumb
     JSON-LD as a side effect. The band is gone from all of them now; the graph
     is not optional, so each page renders ServiceJsonLd itself. This is the
     test that catches a page dropping it. */
  it('gives every service page its Service and breadcrumb JSON-LD', () => {
    for (const s of SERVICES) {
      const src = readFileSync(join(process.cwd(), 'app', '(site)', `${s.path}/page.tsx`), 'utf8');
      expect(src, `${s.path} has no ServiceJsonLd`).toContain(`<ServiceJsonLd path='${s.path}' />`);
    }
  });

  it('resolves a known path and rejects an unknown one', () => {
    expect(serviceByPath('/services/gtm-teams')?.name).toBe('GTM Teams');
    expect(serviceByPath('/services/nope')).toBeUndefined();
  });
});
