import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { PRIMARY_LINKS, RESOURCE_LINKS, SERVICE_LINKS, BOOK_URL } from './nav';
import { ROUTES } from './site';

/** Every .tsx under a directory, recursively. */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}


/**
 * The mobile drawer reads its destinations from lib/nav.ts; the desktop header
 * writes its mega-menu markup by hand, because each item carries an icon and
 * the panels have to work with JavaScript off.
 *
 * Two lists describing one navigation is a drift risk, so these assert they
 * agree — and that every destination is a route the app actually serves. A
 * dead nav link is exactly the defect that shipped once already, when the
 * header still pointed at .dc.html artboards.
 */
const ALL = [...SERVICE_LINKS, ...RESOURCE_LINKS, ...PRIMARY_LINKS];
const LIVE = new Set(ROUTES.map((r) => r.path));
const headerSource = readFileSync(join(process.cwd(), 'components/layout/Header.tsx'), 'utf8');

describe('navigation data', () => {
  it('points every link at a route the app serves', () => {
    const dead = ALL.filter((l) => !LIVE.has(l.href)).map((l) => `${l.label} -> ${l.href}`);
    expect(dead).toEqual([]);
  });

  it('has no duplicate destinations within a group', () => {
    for (const [name, group] of Object.entries({ SERVICE_LINKS, RESOURCE_LINKS, PRIMARY_LINKS })) {
      const hrefs = group.map((l) => l.href);
      expect(hrefs, name).toEqual([...new Set(hrefs)]);
    }
  });

  it('links nothing the desktop header does not also link', () => {
    // Catches the drawer keeping a destination the header dropped.
    const missing = ALL.filter((l) => !headerSource.includes(`href="${l.href}"`)).map((l) => l.href);
    expect(missing).toEqual([]);
  });

  it('leaves no service page unreachable', () => {
    /* Deliberately NOT "every service route is in the menu". /services/gtm-teams
       and /services/sdr-as-a-service are not in the Services panel and never
       were — the artboard header omits them too, and the panel already carries
       ten items. They are reached from the services directory, /pricing, their
       sibling service pages and the footer.
       The property worth defending is that nothing is orphaned: a service page
       that exists, is in the sitemap and is indexed, but that no page links, is
       a real defect. */
    const linked = new Set<string>();
    for (const dir of ['app', 'components']) {
      for (const file of walk(join(process.cwd(), dir))) {
        const src = readFileSync(file, 'utf8');
        for (const r of ROUTES) {
          // its own page linking itself does not count as reachable
          if (file.includes(join('app', ...r.path.split('/').filter(Boolean)))) continue;
          if (src.includes(`"${r.path}"`) || src.includes(`'${r.path}'`)) linked.add(r.path);
        }
      }
    }
    const orphans = ROUTES.map((r) => r.path)
      .filter((p) => p === '/services' || p.startsWith('/services/'))
      .filter((p) => !linked.has(p));
    expect(orphans).toEqual([]);
  });

  it('books through the same external URL the header uses', () => {
    expect(headerSource).toContain(BOOK_URL);
  });

  it('gives every entry a label', () => {
    expect(ALL.filter((l) => !l.label.trim())).toEqual([]);
  });
});
