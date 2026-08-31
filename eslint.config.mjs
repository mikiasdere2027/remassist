import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

// Next.js + TypeScript recommended rules (flat config bridge).
// The DC static site this app was ported from has moved out to the standalone
// static-site repo: artboards, index.html, partials/, assets/, support.js and
// sync-partials.js all live there now. The 'support.js' and 'legacy-html/**'
// entries that used to sit below went with it, so nothing from the static site
// is ignored here any more.
const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      'tools/**',
      'uploads/**',
      '.next/',
      'next-env.d.ts',
      'package-lock.json',
    ],
  },
  {
    // Header/footer were ported verbatim from partials/*.html and use plain
    // <img> for legacy brand SVGs (filter: brightness()/invert() transforms
    // would be lost reshuffling through next/image, which also needs the
    // dangerouslyAllowSVG flag). Keep the rule active everywhere else.
    files: ['components/layout/**'],
    rules: { '@next/next/no-img-element': 'off' },
  },
  {
    /* Satori, not the browser. `next/image` does not exist inside an
       ImageResponse — a data: URI on a plain <img> is the documented way to
       place a bitmap here, so the rule is categorically inapplicable to this
       file rather than merely inconvenient.

       This is a file-level `off` and NOT an inline eslint-disable-next-line,
       deliberately. Under Node 20 (what the VPS runs) ESLint applies such a
       directive but still reports it as "Unused eslint-disable directive";
       under Node 24 (dev machines) it does not. `npm run lint` is
       --max-warnings=0 and the deploy gate runs the lint ON the server, so the
       inline form passed locally and failed every deploy — same bytes, same
       eslint 9.39.4, same eslint-config-next 15.5.24. A file-scoped rule state
       cannot be miscounted, so this form is identical on both runtimes. */
    files: ['app/opengraph-image.tsx'],
    rules: { '@next/next/no-img-element': 'off' },
  },
  {
    // Auto-generated static page ports (Phase 01 §7.1 + §7.2). The prose comes
    // verbatim from the trusted .dc.html artboards, so straight quotes and
    // apostrophes in rendered text are intentional (React handles them fine
    // in JSX text; the rule only flags the stylistic escape preference).
    // Cross-page links are kept as plain <a> for 1:1 fidelity (migrating them
    // to next/link client navigation is a Phase-05 polish, not a port need).
    files: ['app/**/page.tsx'],
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      /* `@next/next/no-img-element` used to be off here too, which meant the
         one rule that catches an unoptimised raster image could not fire on
         the 20 generated pages — the exact files most likely to grow one, and
         where nine full-size JPEGs were in fact shipping through plain <img>.
         It is on now; the handful of legitimate uses left are all SVG sources
         and carry an inline disable saying so. `npm run lint` also runs with
         --max-warnings=0, so a new one fails CI rather than scrolling past. */
    },
  },
];

export default eslintConfig;