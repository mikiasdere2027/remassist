#!/usr/bin/env node
/**
 * raster-to-next-image — swap the ported pages' raw <img> tags for next/image.
 *
 * The artboards shipped full-resolution JPEGs and let CSS shrink them. Measured
 * against what the browser actually renders:
 *
 *   /images/teams/*.jpg        1024x1024, ~450KB  ->  36px byline avatar
 *   /images/Agents/*.jpg       150x151,     43KB  ->  54px avatar
 *   Virtual-assitant.jpg       1152x922,  1174KB  ->  472x806 (object-fit: cover)
 *
 * next/image serves a correctly-sized AVIF/WebP from the same source file, so
 * nothing in public/ is rewritten and the originals stay in git. Verified on one
 * team photo: 510,675 B JPEG -> 8,573 B AVIF at w=640.
 *
 * SVGs are deliberately left as <img>: next/image does not optimise them and
 * routing them through the optimiser would need dangerouslyAllowSVG.
 *
 * `sizes` is the CSS size the image occupies — the browser combines it with the
 * device pixel ratio to pick from the generated srcset. Do not inflate it for
 * retina by hand; that double-counts.
 *
 * Usage: node tools/raster-to-next-image.js [--write]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const ROOT = process.cwd();

/** src prefix -> the props next/image needs. Order matters: first match wins. */
const RULES = [
  {
    test: /^\/images\/teams\//,
    // square source; rendered as a small round byline avatar
    props: `width={96} height={96} sizes="36px"`,
  },
  {
    test: /^\/images\/Agents\/Virtual-assitant\.jpg$/,
    // large editorial photo in a relative box, cropped with object-fit
    props: `width={1152} height={922} sizes="(max-width: 860px) 100vw, 472px"`,
  },
  {
    test: /^\/images\/Agents\//,
    props: `width={128} height={128} sizes="54px"`,
  },
];

function ruleFor(src) {
  return RULES.find((r) => r.test.test(src));
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

// <img ... /> with a single-quoted src, as the codemod emits them.
const IMG = /<img\s([^>]*?)\/>/g;
const SRC = /src='([^']+)'/;
const ALT = /alt='([^']*)'/;
const CLS = /className=\{([^}]+)\}/;

let files = 0;
let converted = 0;
const skipped = new Map();

for (const file of walk(path.join(ROOT, 'app'))) {
  const original = fs.readFileSync(file, 'utf8');
  let n = 0;

  const next = original.replace(IMG, (whole, attrs) => {
    const src = (attrs.match(SRC) || [])[1];
    if (!src) return whole;
    const rule = ruleFor(src);
    if (!rule) {
      skipped.set(src, (skipped.get(src) || 0) + 1);
      return whole;
    }
    const alt = (attrs.match(ALT) || [, ''])[1];
    const cls = (attrs.match(CLS) || [])[1];
    n++;
    return (
      `<Image src='${src}' alt='${alt}'` +
      (cls ? ` className={${cls}}` : '') +
      ` ${rule.props} />`
    );
  });

  if (!n) continue;
  let out = next;
  if (!/^import Image from 'next\/image';$/m.test(out)) {
    // after the first import line, so the file keeps a single import block
    out = out.replace(/^(import .*?;\n)/, `$1import Image from 'next/image';\n`);
  }
  files++;
  converted += n;
  if (WRITE) fs.writeFileSync(file, out);
  console.log(`  ${path.relative(ROOT, file).replace(/\\/g, '/')}  ${n}`);
}

console.log(`\n${WRITE ? 'WROTE' : 'DRY RUN'} — ${converted} <img> in ${files} file(s)`);
if (skipped.size) {
  console.log('\nleft as <img> (no rule — SVG or unrecognised):');
  for (const [src, count] of [...skipped].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}x  ${src}`);
  }
}
