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

/**
 * Build directory. Defaults to .next everywhere, so nothing about a build or a
 * deploy changes.
 *
 * The override exists because two `next dev` servers in one checkout share
 * .next and corrupt each other: both rewrite _buildManifest.js.tmp on every
 * compile, and the loser of the race serves a 500 for every route — including
 * static pages neither process touched. That is not hypothetical here; it is
 * what happens whenever a second agent or a second terminal runs the dev
 * server in this repo. Setting NEXT_DIST_DIR gives the second one its own
 * output tree. See tools/dev-isolated.mjs.
 */
const distDir = process.env.NEXT_DIST_DIR || '.next';

const config: NextConfig = {
  distDir,
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
    /* The phase photographs on /how-it-works are hotlinked from Unsplash's
       CDN rather than committed to public/ — see components/how-it-works/
       phases.ts for why. next/image refuses a remote src that is not
       allow-listed here, and the refusal is a build-time error, not a
       broken <img>. Path is left open because the id and the resize query
       change per photograph; the host is the part worth pinning. */
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Uploads from the admin go to Cloudinary (via the backend's signed uploads).
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
    /* Next caches an optimised image for `max(minimumCacheTTL, upstreamMaxAge)`
       and puts that same value in the response's Cache-Control. Files served
       out of public/ leave the box as `max-age=0`, so every /_next/image
       response was going out as `max-age=60, must-revalidate` — a re-fetch of
       every image on the site, once a minute, forever. One year: the URL is
       already keyed by source, width and quality, so a changed image is a
       changed URL. */
    minimumCacheTTL: 31536000,
  },
  /**
   * The browser talks to the NestJS backend through this app: /api/v1/* is
   * proxied to ${API_URL}/v1/*. Same origin for the browser — no CORS, and the
   * session cookie is simply this site's cookie — and the backend never needs
   * to be reachable from the internet (it listens on 127.0.0.1). Server
   * components call API_URL directly (lib/api/server.ts).
   *
   * Rewrites are compiled at build time: API_URL must be set when `next build`
   * runs (it defaults to the local backend).
   */
  async rewrites() {
    const api = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
    return [{ source: '/api/v1/:path*', destination: `${api}/v1/:path*` }];
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
      {
        /* Raw public/ assets, served without going through the optimiser —
           the loader logo, the certification marks, the partner logos. These
           had no Cache-Control at all, so they revalidated on every navigation.

           This is also what lifts the optimiser's own TTL: the value above is
           a floor, and Next takes the larger of it and whatever the upstream
           asset declares. 30 days rather than a year because these are
           overwritten in place under the same filename — unlike /_next/image
           URLs, nothing here is content-addressed. */
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000' }],
      },
    ];
  },
};

export default config;