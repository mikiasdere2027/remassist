#!/usr/bin/env node
/*
 * sync-partials.js — one header, one footer, across every page.
 *
 * The DC template engine only understands sc-for / sc-if; it has no include or
 * partial mechanism. So instead of injecting chrome at runtime (which would
 * hide the nav from crawlers and no-JS visitors), the canonical markup lives in
 * partials/ and is stamped into each page as real HTML between sentinel
 * comments. Re-run this after editing a partial:
 *
 *     node tools/sync-partials.js          # write changes
 *     node tools/sync-partials.js --check  # verify only, non-zero if stale
 *
 * First run replaces each page's existing <header>/<footer> block and wraps the
 * result in markers; later runs replace whatever sits between the markers.
 */
'use strict';

const fs = require('fs');
const path = require('path');

/* The static site now lives under legacy-html/ and is gitignored — the pages,
   index.html and partials/ all moved together, so this only needs a new root. */
const ROOT = path.join(path.resolve(__dirname, '..'), 'legacy-html');
const CHECK = process.argv.includes('--check');

const PARTS = [
  { name: 'header', tag: 'header', file: path.join(ROOT, 'partials', 'header.html') },
  { name: 'footer', tag: 'footer', file: path.join(ROOT, 'partials', 'footer.html') },
];

const open = (n) => `<!-- @shared:${n} — generated from partials/${n}.html by tools/sync-partials.js. Edit the partial, not this block. -->`;
const close = (n) => `<!-- /@shared:${n} -->`;

/* Find a top-level <tag ...> ... </tag> span. The chrome elements are never
   nested inside another element of the same name, so first-open/first-close
   is unambiguous here. */
function findBlock(src, tag) {
  const start = src.search(new RegExp('<' + tag + '[\\s>]'));
  if (start < 0) return null;
  const endTag = '</' + tag + '>';
  const end = src.indexOf(endTag, start);
  if (end < 0) return null;
  return { start, end: end + endTag.length };
}

function findMarkers(src, name) {
  const a = src.indexOf(open(name));
  if (a < 0) return null;
  const c = src.indexOf(close(name), a);
  if (c < 0) return null;
  return { start: a, end: c + close(name).length };
}

function indentOf(src, i) {
  const lineStart = src.lastIndexOf('\n', i - 1) + 1;
  const m = src.slice(lineStart, i).match(/^[ \t]*/);
  return m ? m[0] : '';
}

/* index.html is the deployed homepage (Vercel serves / from it), so it no
   longer carries the .dc.html suffix the other artboards use — match it by
   name as well or the homepage silently stops receiving partial updates. */
const isPage = (f) => f.endsWith('.dc.html') || f === 'index.html';

const pages = fs.readdirSync(ROOT).filter(isPage).sort();
if (!pages.length) {
  console.error('no pages found in ' + ROOT);
  process.exit(1);
}

const bodies = {};
for (const p of PARTS) {
  if (!fs.existsSync(p.file)) {
    console.error('missing partial: ' + path.relative(ROOT, p.file));
    process.exit(1);
  }
  bodies[p.name] = fs.readFileSync(p.file, 'utf8').replace(/\s+$/, '');
}

let changed = 0, stale = [];

for (const page of pages) {
  const file = path.join(ROOT, page);
  let src = fs.readFileSync(file, 'utf8');
  const before = src;
  const notes = [];

  for (const p of PARTS) {
    const marked = findMarkers(src, p.name);
    const span = marked || findBlock(src, p.tag);
    if (!span) { notes.push(p.name + ':MISSING'); continue; }

    const pad = indentOf(src, span.start);
    const body = bodies[p.name]
      .split('\n')
      .map((l, i) => (i === 0 || !l ? l : pad + l))
      .join('\n');
    const replacement = open(p.name) + '\n' + pad + body + '\n' + pad + close(p.name);

    if (src.slice(span.start, span.end) === replacement) { notes.push(p.name + ':ok'); continue; }
    src = src.slice(0, span.start) + replacement + src.slice(span.end);
    notes.push(p.name + (marked ? ':updated' : ':adopted'));
  }

  if (src !== before) {
    changed++;
    stale.push(page);
    if (!CHECK) fs.writeFileSync(file, src);
  }
  console.log((CHECK ? '  ' : (src !== before ? '* ' : '  ')) + page.padEnd(34) + notes.join('  '));
}

if (CHECK) {
  if (changed) {
    console.error('\n' + changed + ' page(s) out of sync: ' + stale.join(', '));
    process.exit(1);
  }
  console.log('\nall ' + pages.length + ' pages match the partials');
} else {
  console.log('\n' + changed + ' of ' + pages.length + ' page(s) rewritten');
}
