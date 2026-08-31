/**
 * check-bundle-budget.mjs — fail the build if the client bundle grows.
 *
 * Run after `next build`, from the repository root:
 *     node tools/check-bundle-budget.mjs
 *
 * WHY THIS EXISTS
 *   lib/chat/kb.ts — 42 KB of chat answers — sat in the root-layout chunk and
 *   was parsed on all 23 routes to serve a widget that starts closed. Nothing
 *   caught it: the build prints these numbers but no step reads them, so a
 *   regression is only ever noticed by someone who happens to look.
 *
 *   The budgets below are the measured sizes plus headroom, not aspirations.
 *   A failure here is not automatically a bug — sometimes a feature is worth
 *   the bytes — but it should be a decision, which means raising the number in
 *   this file deliberately and saying why in the commit.
 *
 * WHAT IT MEASURES
 *   Uncompressed bytes on disk, from .next/app-build-manifest.json. Not
 *   transfer size: gzip ratios move with content and would make the budget
 *   noisy for reasons that have nothing to do with what was imported.
 */
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const NEXT = '.next';

/**
 * page -> KB budget for the sum of that entry's client chunks.
 *
 * `/layout` is the important one: every route pays it. It was 65.1 KB with the
 * chat knowledge base inlined and is 13.9 KB with the panel behind
 * next/dynamic, so 24 KB leaves room for real growth while still failing long
 * before another 40 KB module lands in it.
 */
const BUDGETS_KB = {
  '/layout': 24,
  '/page': 120,
};

/**
 * Everything a first visit to any route downloads, framework and shared vendor
 * chunks included.
 *
 * UNCOMPRESSED, so this number is much larger than the "First Load JS shared
 * by all" line in the build log — that one is the gzipped estimate (103 kB
 * against the 374.7 kB measured here). Do not compare the two. The budget is
 * the measured figure plus ~12%: enough that a dependency bump does not fail
 * the build, tight enough that a second React-sized library does.
 */
const TOTAL_FIRST_LOAD_KB = 420;

/**
 * Read the manifest, preferring the standalone copy.
 *
 * `.next/app-build-manifest.json` is not reliable: a `next dev` run overwrites
 * it with dev chunks, and a build can leave it holding only the routes that
 * were rebuilt — it was observed with a single `/services/page` entry after a
 * full 32-route build, while the standalone copy had all 31. Reading the
 * truncated one made every budget resolve to 0 KB and the guard then failed
 * with "budget exceeded", which is the worst possible way to be wrong: a red
 * CI run pointing at a bundle problem that does not exist.
 *
 * `output: 'standalone'` writes .next/standalone/.next/app-build-manifest.json
 * as a complete copy, and the chunk paths inside it are still relative to
 * .next/, so file sizes resolve the same way. Prefer whichever has more
 * entries rather than assuming either.
 */
function loadManifest() {
  const candidates = [
    join(NEXT, 'standalone', '.next', 'app-build-manifest.json'),
    join(NEXT, 'app-build-manifest.json'),
  ];
  let best = null;
  for (const file of candidates) {
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8'));
      const count = Object.keys(parsed.pages ?? {}).length;
      if (!best || count > best.count) best = { parsed, count, file };
    } catch { /* try the next one */ }
  }
  return best;
}

const found = loadManifest();
if (!found) {
  console.error('no app-build-manifest.json — run `next build` first.');
  console.error('NOTE: a `next dev` run overwrites the .next/ copy with dev chunks; if');
  console.error('the numbers look absurd, rebuild before trusting them.');
  process.exit(1);
}
const manifest = found.parsed;

const kb = (bytes) => bytes / 1024;

/** Sum the on-disk size of an entry's chunks, ignoring CSS. */
function entryJsBytes(page) {
  const files = manifest.pages[page] ?? [];
  let total = 0;
  for (const f of files) {
    if (!f.endsWith('.js')) continue;
    try {
      total += statSync(join(NEXT, f)).size;
    } catch {
      /* listed but absent — a partial build; the missing-manifest path above
         is the real guard, so do not fail on one file. */
    }
  }
  return total;
}

let failed = false;
const rows = [];

for (const [page, budget] of Object.entries(BUDGETS_KB)) {
  if (!manifest.pages[page]) {
    console.error(`entry ${page} is not in the manifest — has it been renamed?`);
    failed = true;
    continue;
  }
  /* The per-entry chunks only, excluding the framework and shared vendor
     chunks every entry lists — those are budgeted once, below. */
  const own = (manifest.pages[page] ?? []).filter(
    (f) => f.includes('/app/') && f.endsWith('.js'),
  );
  let bytes = 0;
  for (const f of own) {
    try { bytes += statSync(join(NEXT, f)).size; } catch { /* see above */ }
  }
  const size = kb(bytes);
  const ok = size <= budget;
  if (!ok) failed = true;
  rows.push([page, size, budget, ok]);
}

/* Everything the root layout pulls in, framework included — the number the
   build log calls "First Load JS shared by all". */
const firstLoad = kb(entryJsBytes('/layout'));
const firstLoadOk = firstLoad <= TOTAL_FIRST_LOAD_KB;
if (!firstLoadOk) failed = true;
rows.push(['/layout (with shared)', firstLoad, TOTAL_FIRST_LOAD_KB, firstLoadOk]);

console.log('bundle budget (uncompressed JS on disk)\n');
for (const [name, size, budget, ok] of rows) {
  console.log(
    `  ${ok ? 'ok  ' : 'OVER'}  ${name.padEnd(24)} ${size.toFixed(1).padStart(7)} KB` +
    `  / ${String(budget).padStart(4)} KB`,
  );
}

if (failed) {
  console.error('\nBundle budget exceeded.');
  console.error('Either move the new weight behind next/dynamic, or raise the budget in');
  console.error('tools/check-bundle-budget.mjs and say why in the commit message.');
  process.exit(1);
}
console.log('\nWithin budget.');
