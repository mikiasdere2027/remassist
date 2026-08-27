import type { NextConfig } from 'next';
import { redirects as legacyRedirects } from './lib/redirects';

/**
 * Rem Assist — Next.js app config.
 * Standalone output for the VPS target, Nginx-owned compression, security
 * headers, and the §11.3 legacy redirect map (sourced from lib/redirects.ts so
 * one list feeds both the server and the CI assertion).
 */
const config: NextConfig = {
  output: 'standalone',
  // A stray package-lock.json in the parent directory confuses Next's
  // workspace-root inference; pin the trace root to this repo explicitly.
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  compress: false,          // Nginx handles compression in production
  experimental: {
    // Force static generation through a single worker. Next 15's parallel
    // worker pool crashes the V8 heap / child-process spawn on Windows + Node
    // ≥20 (`spawn UNKNOWN`, 0xC0000409). One worker keeps builds reliable here;
    // the deployment VPS runs Node 22 and can raise this back when needed.
    staticGenerationMaxConcurrency: 1,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    // `permanent: true` makes Next emit 308, not the 301 §11.3 specifies. Both
    // are permanent and Google treats them alike, but 301 is what older
    // crawlers and link-checkers handle without argument — and these rules
    // exist for exactly that long tail. Map the flag to an explicit status.
    return legacyRedirects.map(({ source, destination, permanent }) => ({
      source,
      destination,
      statusCode: permanent ? (301 as const) : (302 as const),
    }));
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default config;