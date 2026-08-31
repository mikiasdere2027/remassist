#!/usr/bin/env node
/*
 * package-standalone.js — complete the `output: 'standalone'` bundle.
 *
 * `next build` emits .next/standalone with the server + traced node_modules,
 * but — per MIGRATION-PLAN.md §2.2 / §12 — it does NOT copy public/ or
 * .next/static. Deploying without them ships a site with no images and no CSS.
 *
 * Usage:
 *     npm run build
 *     node tools/package-standalone.js     # stages .next/standalone for deploy
 *
 * Exits non-zero if a required source is missing, so CI can use it as a guard
 * (see .github/workflows/ci.yml "Standalone package guard").
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STANDALONE = path.join(ROOT, '.next', 'standalone');

/* [source, destination-relative-to-standalone] — copy whole directories. */
const COPIES = [
  [path.join(ROOT, 'public'), path.join(STANDALONE, 'public')],
  [path.join(ROOT, '.next', 'static'), path.join(STANDALONE, '.next', 'static')],
];

/*
 * Directories under public/ that must NOT travel in the release.
 *
 * public/uploads is 142 MB of interview video. It is deployed once into
 * shared/uploads and symlinked into each release (see deploy/remote-deploy.sh),
 * because it is the same footage every time and re-uploading it per deploy
 * makes a 300 KB code change cost 142 MB over the wire.
 *
 * remote-deploy.sh already deletes it from the release after unpacking, which
 * is far too late: it is packed, transferred and unpacked first. Excluding it
 * at the source is where the saving actually happens, and it also means the
 * tarball this produces is the same shape as what lands on the server.
 *
 * Paths are relative to public/ and matched exactly.
 */
const EXCLUDE = new Set(['uploads']);

const WARN_ONLY = process.argv.includes('--warn-only');

function copyDir(src, dest, skip) {
  fs.mkdirSync(dest, { recursive: true });
  let copied = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip && skip.has(entry.name)) {
      console.log(`  skipped ${entry.name}/ (deployed separately, see EXCLUDE)`);
      continue;
    }
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copied += copyDir(s, d);
    else { fs.copyFileSync(s, d); copied++; }
  }
  return copied;
}

let ok = true;
for (const [src, dest] of COPIES) {
  if (!fs.existsSync(src)) {
    console.error('missing source: ' + path.relative(ROOT, src));
    ok = false;
    continue;
  }
  /* Only the top level of public/ is filtered — EXCLUDE names are its own
     children, not a pattern to apply at every depth. */
  const n = copyDir(src, dest, src.endsWith('public') ? EXCLUDE : null);
  console.log(`copied ${n} file(s) → ${path.relative(ROOT, dest)}`);
}

if (!ok) {
  console.error('\nstandalone package incomplete — run `npm run build` first');
  process.exit(WARN_ONLY ? 0 : 1);
}

console.log('\nstandalone package staged at ' + path.relative(ROOT, STANDALONE));