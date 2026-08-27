#!/usr/bin/env node
/**
 * css-module-classnames — one-shot codemod for the Phase 01 page port.
 *
 * The artboards were converted to JSX with their class names left as plain
 * strings (`className='pr-wrap pr-hero'`) while their CSS landed in a CSS
 * *Module* (`page.module.css`), whose selectors webpack rewrites to hashed
 * names. Nothing matched, so 20 of 22 routes rendered unstyled.
 *
 * Global stylesheets are not an option: `.rs-wrap` is defined three different
 * ways (faq 1140px, case-studies 1200px, reviews 1140px) and `.hv-*` is shared
 * by five more pages, so hoisting them to globals would make the pages fight
 * each other. This rewrites the call sites to module lookups instead.
 *
 *   className='pr-wrap pr-hero'  ->  className={`${styles['pr-wrap']} ${styles['pr-hero']}`}
 *   className='pr-wrap'          ->  className={styles['pr-wrap']}
 *
 * A token with no matching selector in the page's own module is left as a
 * literal (writing styles['x'] for a missing class renders the string
 * "undefined" into the class list) and reported, so the leftovers can be
 * looked at by hand.
 *
 * Usage: node tools/css-module-classnames.js [--write]
 */
const { readFileSync, writeFileSync, readdirSync, statSync, existsSync } = require('node:fs');
const { join, dirname } = require('node:path');

const WRITE = process.argv.includes('--write');
const ROOT = process.cwd();

/** Recursively collect app/**\/page.tsx. */
function pages(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (name === 'page.tsx') out.push(p);
  }
  return out;
}

/** Class selectors defined in a stylesheet (`.foo`, including inside media queries). */
function definedClasses(css) {
  const found = new Set();
  // strip comments and declaration blocks so only selectors are scanned
  const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').split('{').map((chunk) => chunk.split('}').pop());
  for (const sel of selectors) {
    for (const m of sel.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) found.add(m[1]);
  }
  return found;
}

let totalRewritten = 0;
const report = [];

for (const file of pages(join(ROOT, 'app'))) {
  const cssPath = join(dirname(file), 'page.module.css');
  if (!existsSync(cssPath)) continue;
  const known = definedClasses(readFileSync(cssPath, 'utf8'));
  let src = readFileSync(file, 'utf8');
  const unknown = new Set();
  let count = 0;

  src = src.replace(/className='([^']*)'/g, (whole, value) => {
    const tokens = value.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return whole;
    const parts = tokens.map((t) => {
      if (known.has(t)) return { mod: true, t };
      unknown.add(t);
      return { mod: false, t };
    });
    if (!parts.some((p) => p.mod)) return whole; // nothing to map — leave alone
    count++;
    if (parts.length === 1) return `className={styles['${parts[0].t}']}`;
    const body = parts.map((p) => (p.mod ? `\${styles['${p.t}']}` : p.t)).join(' ');
    return 'className={`' + body + '`}';
  });

  if (count) {
    // every rewritten page must import its module
    if (!/import\s+styles\s+from\s+'\.\/page\.module\.css'/.test(src)) {
      report.push(`  !! ${file} rewrites ${count} but has no styles import`);
    }
    totalRewritten += count;
    if (WRITE) writeFileSync(file, src);
  }
  report.push(
    `${file.replace(ROOT + '\\', '').replace(/\\/g, '/')}  rewrote=${count}` +
      (unknown.size ? `  UNMAPPED=[${[...unknown].join(', ')}]` : ''),
  );
}

console.log(report.join('\n'));
console.log(`\n${WRITE ? 'WROTE' : 'DRY RUN'} — ${totalRewritten} className sites`);
