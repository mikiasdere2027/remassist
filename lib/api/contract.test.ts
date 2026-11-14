/**
 * Keeps this app and the backend in step without a shared package:
 *
 *  1. every API path this app calls exists as a route in the backend, and
 *  2. the lists both sides hardcode (lead statuses, sources, priorities,
 *     views, call outcomes, timeline types, field types, roles) are equal.
 *
 * Reads the backend's source from `../remassist-backend` (or BACKEND_DIR).
 * Skipped when that checkout isn't there, so the suite still runs alone.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const BACKEND = resolve(process.env.BACKEND_DIR ?? '../remassist-backend');
const SRC = join(BACKEND, 'src');
const ROOT = resolve('.');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.next', 'dist', '.git'].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

/** `METHOD path` for every handler in the backend (no /v1 prefix). */
function backendRoutes(): Set<string> {
  const out = new Set<string>();
  for (const file of walk(SRC)) {
    const src = readFileSync(file, 'utf8');
    if (!src.includes('@Controller(')) continue;
    let base = '';
    for (const line of src.split('\n')) {
      const c = /@Controller\(['"]([^'"]*)['"]\)/.exec(line);
      if (c) base = c[1];
      const m = /@(Get|Post|Patch|Put|Delete)\((?:['"]([^'"]*)['"])?\)/.exec(line);
      if (m) out.add(`${m[1].toUpperCase()} ${[base, m[2] ?? ''].filter(Boolean).join('/')}`);
    }
  }
  return out;
}

/** `METHOD path` for every literal path this app passes to the API helpers. */
function frontendCalls(): Map<string, string> {
  const out = new Map<string, string>();
  const re =
    /\b(apiServer|apiPublic|api\.(?:get|post|patch|put|delete))(?:<[^>]*>)?\(\s*(?:`([^`]*)`|'([^']*)')/g;
  for (const file of walk(ROOT)) {
    if (file.includes('/tests/') || /\.test\.tsx?$/.test(file)) continue;
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(re)) {
      const fn = m[1];
      const raw = m[2] ?? m[3];
      const method = fn.startsWith('api.') ? fn.slice(4).toUpperCase() : 'GET';
      let path = raw
        .replace(/\$\{[^}]*$/, '') // a nested template (`${q ? `?q=…` : ''}`) cut at its inner backtick
        .replace(/\$\{(?:q|qs|query|search)\}$/, '') // a trailing query-string variable
        .replace(/\?.*$/, '')
        .replace(/\$\{[^}]+\}/g, ':x')
        .replace(/^\//, '');
      if (fn === 'apiPublic' && !path.startsWith('public')) path = `public/${path}`;
      out.set(`${method} ${path}`, file.replace(ROOT + '/', ''));
    }
  }
  return out;
}

/** Does a call like `admin/leads/:x/notes` fit a route like `admin/leads/:id/notes`? */
function matches(call: string, route: string): boolean {
  const [cm, cp] = call.split(' ');
  const [rm, rp] = route.split(' ');
  if (cm !== rm) return false;
  const pattern = cp
    .split('/')
    .map((seg, i) => (seg === ':x' ? (i === 0 ? '.+' : '[^/]+') : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/');
  return new RegExp(`^${pattern}$`).test(rp);
}

/** The string literals of `NAME = [ ... ]`, or the keys of `NAME = { ... }` / `NAME: Record = { ... }`. */
function list(file: string, name: string): string[] {
  const src = readFileSync(file, 'utf8');
  const arr = new RegExp(`\\b${name}\\b[^=]*=\\s*\\[([\\s\\S]*?)\\]\\s*(?:as const)?;`).exec(src);
  if (arr) {
    const keyed = [...arr[1].matchAll(/\bkey: '([^']*)'/g)].map((x) => x[1]);
    return keyed.length ? keyed : [...arr[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  }
  const obj = new RegExp(`\\b${name}\\b[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`).exec(src);
  if (!obj) throw new Error(`${name} not found in ${file}`);
  return [...obj[1].matchAll(/^\s*([a-z_]+):/gm)].map((x) => x[1]);
}

/** A union type `type Name = 'a' | 'b'`. */
function union(file: string, name: string): string[] {
  const src = readFileSync(file, 'utf8');
  const m = new RegExp(`type ${name} =([^;]*);`).exec(src);
  if (!m) throw new Error(`${name} not found in ${file}`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

const B = (p: string) => join(BACKEND, p);

describe.skipIf(!existsSync(SRC))('frontend ↔ backend contract', () => {
  it('every API path this app calls is a backend route', () => {
    const routes = [...backendRoutes()];
    expect(routes.length).toBeGreaterThan(50);
    const missing: string[] = [];
    for (const [call, file] of frontendCalls()) {
      if (!routes.some((r) => matches(call, r))) missing.push(`${call}  (${file})`);
    }
    expect(missing).toEqual([]);
  });

  it('shares the lead lists with the backend', () => {
    const schema = B('src/database/schema/leads.ts');
    expect(list('lib/api/leads.ts', 'PUBLIC_LEAD_SOURCES')).toEqual(list(schema, 'PUBLIC_LEAD_SOURCES'));
    expect(list('lib/api/leads.ts', 'TEAM_LEAD_SOURCES')).toEqual(list(schema, 'TEAM_LEAD_SOURCES'));
    expect(list('lib/api/leads.ts', 'LEAD_STATUSES')).toEqual(list(schema, 'LEAD_STATUSES'));
    expect(list('lib/api/leads.ts', 'SELECTABLE_STATUSES')).toEqual(list(schema, 'SELECTABLE_LEAD_STATUSES'));
    expect(list('lib/api/leads.ts', 'PRIORITIES')).toEqual(list(schema, 'CRM_PRIORITIES'));
    // Every status has a label; every source has a label.
    expect(list('lib/crm/display.ts', 'STATUS_LABELS').sort()).toEqual([...list(schema, 'LEAD_STATUSES')].sort());
    expect(list('lib/leads/display.ts', 'SOURCE_LABELS').sort()).toEqual(
      [...list(schema, 'PUBLIC_LEAD_SOURCES'), ...list(schema, 'TEAM_LEAD_SOURCES')].sort(),
    );
  });

  it('shares the CRM lists with the backend', () => {
    const dto = B('src/modules/leads/dto/lead.dto.ts');
    const crm = B('src/database/schema/crm.ts');
    const views = list('lib/api/leads.ts', 'LEAD_VIEWS').filter((v) => v !== '');
    expect(views.filter((v) => /^[a-z]+$/.test(v))).toEqual(list(dto, 'LEAD_VIEWS'));
    expect(list('lib/crm/display.ts', 'CALL_OUTCOME_LABELS')).toEqual(list(dto, 'CALL_OUTCOMES'));
    expect(union('lib/api/leads.ts', 'TimelineType')).toEqual(list(crm, 'LEAD_ACTIVITY_TYPES'));
    expect(list('lib/crm/fields.ts', 'FIELD_TYPES')).toEqual(list(crm, 'CUSTOM_FIELD_TYPES'));
    const roles = /pgEnum\('user_role',\s*\[([^\]]*)\]/.exec(readFileSync(B('src/database/schema/auth.ts'), 'utf8'));
    expect(list('lib/auth/roles.ts', 'ROLES')).toEqual([...(roles?.[1] ?? '').matchAll(/'([^']+)'/g)].map((x) => x[1]));
  });
});
