/**
 * Generate the app icons from the brand mark.
 *
 * The site shipped with no icon of any kind: `/favicon.ico` 404'd, there was
 * no `app/icon.*`, and so no <link rel="icon"> was emitted at all — every tab,
 * bookmark and search result fell back to the browser's blank-page glyph.
 *
 * Source is public/images/rem-loader-logo.svg rather than rem-logo.svg: the
 * full logo is a wordmark ("Rem Assist" set beside the mark) on an 860x356
 * canvas, which is illegible once it is scaled into a 16px box. The loader
 * asset is the same mark with the type dropped, which is what an icon wants.
 *
 * Outputs (all committed; regenerate with `node tools/make-icons.js`):
 *   app/icon.svg          - the icon Next links from every page
 *   app/favicon.ico       - 16/32/48, for the /favicon.ico crawlers request directly
 *   app/apple-icon.png    - 180x180, full-bleed (iOS applies its own mask)
 *   public/images/og-mark.png - 260px mark for the OG card, which cannot
 *                               rasterize an SVG at request time
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Icon ground. White, not the brand navy the rest of the chrome uses.
 *
 * Consequence worth knowing: the mark's four tones are light cyans (#37BCF0
 * through #0E8FD8), which sit at roughly 2.2:1 against white versus ~9:1
 * against navy. At 190px that reads fine; at the 16px a browser tab actually
 * uses, the lightest strokes go pale. If that turns out to be too faint in
 * use, the fix is to drop each tone's HSL lightness by ~0.16 — which keeps the
 * hues and their relative order, so the mark still reads as the brand — rather
 * than to flatten it to a single colour.
 */
const ICON_BG = '#ffffff';

/* The mark's own canvas, from the source file's viewBox. */
const MARK_W = 311.2;
const MARK_H = 382;

const markPaths = readFileSync(join(root, 'public/images/rem-loader-logo.svg'), 'utf8')
  .replace(/^[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>[\s\S]*$/, '')
  .trim();

/**
 * Compose the mark onto a square of `size`, filling `fill` of the box.
 * `radius` of 0 gives the full-bleed square Apple wants; the web icon is
 * rounded so it reads as a mark rather than a cropped photo.
 *
 * `fill` is 0.82 rather than the 0.76 this used on navy. A dark tile framed
 * the mark and gave it its edges; on white the tile is invisible against a
 * light tab strip, so the mark has to carry the whole icon and needs the room.
 */
function square(size, { fill = 0.82, radius = 0 } = {}) {
  const scale = (size * fill) / MARK_H;
  const w = MARK_W * scale;
  const h = MARK_H * scale;
  const x = (size - w) / 2;
  const y = (size - h) / 2;
  const bg = radius
    ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${ICON_BG}"/>`
    : `<rect width="${size}" height="${size}" fill="${ICON_BG}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
${bg}
<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(5)})">
${markPaths}
</g>
</svg>`;
}

/**
 * Pack PNGs into an ICO. Every browser that still asks for /favicon.ico
 * accepts PNG-compressed entries, so there is no BMP encoder here: the
 * container is a 6-byte header plus one 16-byte directory entry each.
 */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // 0 means 256
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const render = (svg, size) =>
  sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

const out = (rel, buf) => {
  writeFileSync(join(root, rel), buf);
  console.log(`${rel}  ${buf.length.toLocaleString()} bytes`);
};

/* The web icon stays vector: one file, sharp at every size. */
out('app/icon.svg', Buffer.from(square(512, { radius: 96 }) + '\n'));

const icoSizes = [16, 32, 48];
const icoParts = [];
for (const size of icoSizes) {
  /* Small sizes get a tighter corner radius; 96/512 scaled to 16px is a
     3px round that reads as a smudge. */
  icoParts.push({ size, data: await render(square(size * 8, { radius: size * 8 * 0.1875 }), size) });
}
out('app/favicon.ico', ico(icoParts));

out('app/apple-icon.png', await render(square(1024, { fill: 0.74 }), 180));

/* next/og rasterizes with Satori, which does not run SVG path fills — the OG
   route needs a bitmap of the mark. Transparent, so the card draws its own
   background. */
out(
  'public/images/og-mark.png',
  await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${MARK_W}" height="${MARK_H}" viewBox="0 0 ${MARK_W} ${MARK_H}">${markPaths}</svg>`,
    ),
    { density: 384 },
  )
    .resize({ height: 260 })
    .png({ compressionLevel: 9 })
    .toBuffer(),
);
