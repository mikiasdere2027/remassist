import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

// Next.js + TypeScript recommended rules (flat config bridge).
// Legacy static-site files live outside the Next app and are ignored:
// linting the DC runtime (support.js) or the artboard HTML buys nothing.
// The artboards, index.html and partials/ are all under legacy-html/ now.
const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      'support.js',
      'assets/**',
      'tools/**',
      'uploads/**',
      'legacy-html/**',
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
      '@next/next/no-img-element': 'off',
    },
  },
];

export default eslintConfig;