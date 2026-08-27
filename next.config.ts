import type { NextConfig } from 'next';
import { redirects as legacyRedirects } from './lib/redirects';

/**
 * Rem Assist — Next.js app config.
 *
 * Two deployment targets. The plan (§2, §12) is a self-managed VPS behind
 * Nginx, which wants `output: 'standalone'` and no Next-level gzip. Vercel
 * builds its own serverless output and compresses at the edge, so both of
 * those are wrong there. VERCEL=1 is set during a Vercel build, so the config
 * picks the right shape rather than the repo having to choose one host.
 */
const onVercel = Boolean(process.env.VERCEL);

const config: NextConfig = {
  // systemd runs .next/standalone/server.js on the VPS. On Vercel this is
  // redundant work that its own output supersedes.
  ...(onVercel ? {} : { output: 'standalone' as const }),
  // A stray package-lock.json in the parent directory confuses Next's
  // workspace-root inference; pin the trace root to this repo explicitly.
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  // Nginx compresses on the VPS; Vercel's edge does it there, and leaving it
  // off would ship uncompressed HTML from the serverless function.
  compress: onVercel,
  experimental: {
    // Force static generation through a single worker. Next 15's parallel
    // worker pool crashes the V8 heap / child-process spawn on Windows + Node
    // ≥20 (`spawn UNKNOWN`, 0xC0000409). That is a Windows-only fault, and
    // pinning it to one worker on a Linux builder just makes builds slower.
    ...(process.platform === 'win32' ? { staticGenerationMaxConcurrency: 1 } : {}),
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