import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/site';

/**
 * The site-wide Open Graph card (§11.2).
 *
 * There was no og:image anywhere: every share of every page rendered as a
 * bare text link, and the one image that did exist (the blog post's) is
 * 682x619 — below the 1200x630 minimum both Facebook and LinkedIn enforce
 * before they will show a large card at all.
 *
 * This is a file-convention export, and it is NOT enough on its own. Next
 * resolves opengraph-image onto the segment that owns the file, so the home
 * page picked it up (app/page.tsx is in this directory) and the other 22
 * routes did not — each of them declares an `openGraph` object, and that
 * replaces the parent's wholesale. `pageOg` in lib/site.ts therefore points at
 * this route explicitly; what lives here is the artwork, not the wiring.
 *
 * `postProcessMetadata` copies openGraph.images into twitter.images when
 * twitter has none, so the existing `twitter: { card: 'summary_large_image' }`
 * in app/layout.tsx picks this up without a second declaration.
 *
 * Statically generated at build time — there is no per-request work here.
 */
export const alt = 'Rem Assist — remote teams that match your culture';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/* Satori rasterizes text and CSS, not SVG path fills, so the mark is read off
   disk as a PNG (tools/make-icons.mjs writes it) and inlined. Reading at
   module scope keeps it to one filesystem hit for the whole build. */
const mark = readFileSync(join(process.cwd(), 'public/images/og-mark.png')).toString('base64');

/* No custom font is loaded. next/og bundles Noto Sans and nothing else, and
   the brand face (Sora) ships as woff2, which Satori cannot parse — embedding
   it would mean committing a TTF for one build-time image. The card is
   carried by the mark and the palette instead, so hierarchy here comes from
   size and colour rather than weight: only 400 is available, and asking for
   700 would silently render at 400 anyway. */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#000543',
          position: 'relative',
        }}
      >
        {/* Brand glow, the same radial the hero uses behind its art. */}
        <div
          style={{
            position: 'absolute',
            top: -260,
            right: -180,
            width: 820,
            height: 820,
            borderRadius: 9999,
            background:
              'radial-gradient(circle, rgba(81,141,224,0.42) 0%, rgba(81,141,224,0.10) 45%, rgba(0,5,67,0) 70%)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', padding: '64px 72px 0' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori, not the browser. next/image does not exist inside an ImageResponse; a data: URI on a plain img is the documented way to place a bitmap here. */}
          <img src={`data:image/png;base64,${mark}`} height={128} alt="" />
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 28 }}>
            <div style={{ fontSize: 46, color: '#ffffff', letterSpacing: -1 }}>{SITE_NAME}</div>
            <div style={{ fontSize: 21, color: '#8FB6EA', letterSpacing: 3, marginTop: 4 }}>
              REMOTE TEAMS, HIRED AS ONE UNIT
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', padding: '0 72px 72px' }}>
          <div style={{ fontSize: 62, color: '#ffffff', lineHeight: 1.15, letterSpacing: -1.5 }}>
            Remote teams that match
          </div>
          <div style={{ fontSize: 62, color: '#518DE0', lineHeight: 1.15, letterSpacing: -1.5 }}>
            your culture.
          </div>
          <div style={{ fontSize: 26, color: '#B9CBE8', marginTop: 26 }}>
            Results-driven, efficient, on target, thoroughly excellent.
          </div>
        </div>

        {/* Accent rule along the bottom edge. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 10,
            background: 'linear-gradient(90deg, #518DE0 0%, #37BCF0 55%, #000543 100%)',
          }}
        />
      </div>
    ),
    size,
  );
}
