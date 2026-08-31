import { LOGO_CENTER, LOGO_PATHS, LOGO_VIEWBOX } from '@/lib/loader/logo';
import { clamp01, type LoaderState } from '@/lib/loader/timeline';

/**
 * The loader mark, drawn on a 2D canvas.
 *
 * This replaces the three.js renderer in `RemAssist-Html/assets/website-loader.js`. Every
 * effect there has a direct 2D equivalent, so this is a translation rather than
 * an approximation:
 *
 *   SVGLoader → shape.getPoints(140)   → getPointAtLength() over the same `d`
 *   stroke shader (smoothstep tail)    → sampled points in ~20 alpha bands
 *   fill shader (radial smoothstep)    → clip(Path2D) + a radial gradient
 *   perspective camera fit             → a plain ctx.scale()
 *
 * The reason not to keep three.js: it is ~150 KB gzipped that has to arrive
 * *before* the loading screen can draw anything, on the one route where time to
 * first paint is the whole point. This module is a few KB and needs no WebGL.
 *
 * Coordinates: SVG y grows downward and so does canvas y, so the three.js
 * `-(y - CY)` flip is deliberately NOT carried over. Re-adding it inverts the
 * mark.
 */

/** Radius of the droplet, in artboard units — the reference's CircleGeometry(8). */
const DROP_RADIUS = 8;
const DROP_COLOR = '#37BCF0';

/** Comet tail length, as a fraction of the ribbon's perimeter (uTail in the shader). */
const TAIL_FRACTION = 0.18;
/** Alpha bands the tail is quantised into. 20 is past the point of seeing steps. */
const TAIL_BANDS = 20;
/** Outline weight in CSS pixels, before the mark's own scale is applied. */
const STROKE_PX = 1.6;

/* The fill shader's constants, kept by name so the two can be compared:
     edge   = uProgress * 1.05
     reveal = smoothstep(edge, edge - 0.18, d)
     rim    = a highlight band just inside the edge */
const FILL_OVERSHOOT = 1.05;
const FILL_SOFTNESS = 0.18;
const RIM_LIGHTEN = 0.18;

interface Piece {
  /** Filled with the ribbon's own colour, clipped to reveal the wipe. */
  path: Path2D;
  /** Outline samples, in artboard units, origin-centred. */
  pts: Float64Array;
  /** Cumulative arc length at each sample. */
  dist: Float64Array;
  perimeter: number;
  /** Centre of the ribbon's bounding box — the wipe radiates from here. */
  cx: number;
  cy: number;
  /** Half the bbox diagonal, the shader's uRadius. */
  radius: number;
  color: string;
  /** `color` pre-split so per-frame alpha does not re-parse the hex. */
  rgb: [number, number, number];
}

export interface LoaderPainter {
  /** Re-read the stage size. Call on resize. */
  resize(): void;
  draw(state: LoaderState): void;
  destroy(): void;
}

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const rgba = ([r, g, b]: [number, number, number], a: number) => `rgba(${r},${g},${b},${a})`;

/** Lighten toward white, the shader's `uColor + rim * 0.18`. */
const lighten = ([r, g, b]: [number, number, number], amount: number) =>
  `rgb(${Math.min(255, Math.round(r + 255 * amount))},${Math.min(255, Math.round(g + 255 * amount))},${Math.min(255, Math.round(b + 255 * amount))})`;

/**
 * Sample the four paths.
 *
 * `getPointAtLength` is only defined on a rendered SVG geometry element, and
 * Safari has historically returned zeros for a detached one — so the scratch
 * <svg> is attached to the document (zero-sized, hidden, aria-hidden) for the
 * length of the measurement and removed immediately after.
 */
function samplePaths(): Piece[] {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText =
    'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;visibility:hidden';
  document.body.appendChild(svg);

  try {
    return LOGO_PATHS.map(({ d, fill }) => {
      const el = document.createElementNS(NS, 'path');
      el.setAttribute('d', d);
      svg.appendChild(el);

      const perimeter = el.getTotalLength();
      /* One sample per ~2 artboard units: dense enough that the outline reads
         as a curve, cheap enough to walk every frame. */
      const count = Math.max(160, Math.min(420, Math.round(perimeter / 2)));
      const pts = new Float64Array(count * 2);
      const dist = new Float64Array(count);

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (let i = 0; i < count; i++) {
        const p = el.getPointAtLength((perimeter * i) / (count - 1));
        const x = p.x - LOGO_CENTER.x;
        const y = p.y - LOGO_CENTER.y;
        pts[i * 2] = x;
        pts[i * 2 + 1] = y;
        dist[i] = (perimeter * i) / (count - 1);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }

      const w = maxX - minX;
      const h = maxY - minY;

      /* The fill is drawn from the raw path data, not from `pts`. The three.js
         version took only the first sub-shape of each path; a Path2D honours
         the real fill rule, so any hole in the artwork stays a hole. */
      const path = new Path2D(d);
      const shifted = new Path2D();
      const shift = new DOMMatrix().translate(-LOGO_CENTER.x, -LOGO_CENTER.y);
      shifted.addPath(path, shift);

      return {
        path: shifted,
        pts,
        dist,
        perimeter,
        cx: minX + w / 2,
        cy: minY + h / 2,
        radius: (Math.hypot(w, h) / 2) * 1.02,
        color: fill,
        rgb: hexToRgb(fill),
      };
    });
  } finally {
    svg.remove();
  }
}

/**
 * @param canvas the loader's stage canvas
 * @returns null when the canvas cannot be set up at all (no 2D context, no
 *          Path2D/DOMMatrix); the caller falls back to the static logo.
 */
export function createPainter(canvas: HTMLCanvasElement): LoaderPainter | null {
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof Path2D === 'undefined' || typeof DOMMatrix === 'undefined') return null;

  let pieces: Piece[];
  try {
    pieces = samplePaths();
  } catch {
    return null;
  }
  if (!pieces.length || pieces.some((p) => !Number.isFinite(p.perimeter) || p.perimeter === 0)) {
    return null;
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  /** Artboard units → CSS pixels. */
  let baseScale = 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width || window.innerWidth;
    height = rect.height || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    /* Ported from the legacy resize(): about 24% of viewport height, clamped to
       130–210px, and never wider than 42vw. The perspective-camera fit it used
       to reach that number is not needed here — the scale is direct. */
    const targetPx = Math.min(
      Math.max(130, Math.min(height * 0.24, 210)),
      (width * 0.42) / (LOGO_VIEWBOX.width / LOGO_VIEWBOX.height),
    );
    baseScale = targetPx / LOGO_VIEWBOX.height;
  }

  /**
   * The radial wipe. The shader computes, per fragment,
   * `smoothstep(edge, edge - 0.18, d)` over the normalised distance from the
   * ribbon's centre; a radial gradient puts the same ramp at the same radii,
   * with two intermediate stops standing in for the smoothstep's curve.
   */
  function fillPiece(c: CanvasRenderingContext2D, piece: Piece, progress: number) {
    if (progress <= 0) return;
    const edge = progress * FILL_OVERSHOOT;
    const inner = Math.max(0, edge - FILL_SOFTNESS);

    const grad = c.createRadialGradient(
      piece.cx,
      piece.cy,
      0,
      piece.cx,
      piece.cy,
      piece.radius || 1,
    );
    /* addColorStop throws IndexSizeError on any offset outside [0, 1], and
       these are all derived from `edge`, which starts at ~0 — `edge - 0.001`
       is negative on the first frames of every wipe. An exception here kills
       the animation frame loop outright, so every offset gets clamped. */
    const stop = (at: number, color: string) => grad.addColorStop(clamp01(at), color);

    stop(0, piece.color);
    if (inner > 0) stop(inner, piece.color);
    if (edge < 1) {
      /* Rim highlight: the shader brightens a narrow band just inside the
         leading edge, which is what makes the wipe read as a wipe. */
      stop(Math.max(inner, edge - FILL_SOFTNESS * 0.4), lighten(piece.rgb, RIM_LIGHTEN));
      stop(edge - 0.001, rgba(piece.rgb, 0.35));
      stop(edge, rgba(piece.rgb, 0));
      stop(1, rgba(piece.rgb, 0));
    }

    c.save();
    c.clip(piece.path);
    c.fillStyle = grad;
    c.fillRect(piece.cx - piece.radius, piece.cy - piece.radius, piece.radius * 2, piece.radius * 2);
    c.restore();
  }

  /**
   * The comet tail. The shader fades each vertex by how far it sits behind the
   * head; here the same fade is quantised into TAIL_BANDS polylines, so a frame
   * costs ~20 strokes per ribbon instead of one per segment.
   */
  function strokePiece(
    c: CanvasRenderingContext2D,
    piece: Piece,
    progress: number,
    opacity: number,
    scale: number,
  ) {
    if (progress <= 0 || opacity <= 0.002) return;
    const head = progress * piece.perimeter;
    const tail = piece.perimeter * TAIL_FRACTION;

    c.save();
    c.lineWidth = STROKE_PX / scale;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = piece.color;

    const n = piece.dist.length;
    for (let band = 0; band < TAIL_BANDS; band++) {
      /* Band 0 is at the head (alpha 1), the last band is at the tail's end. */
      const near = head - (tail * band) / TAIL_BANDS;
      const far = head - (tail * (band + 1)) / TAIL_BANDS;
      const alpha = (1 - band / TAIL_BANDS) * opacity;
      if (alpha <= 0.002) continue;

      c.globalAlpha = alpha;
      c.beginPath();
      let drawing = false;
      for (let i = 0; i < n; i++) {
        const d = piece.dist[i];
        /* `far <= d <= near`, with one extra segment of overlap at each end so
           consecutive bands join instead of leaving hairline gaps. */
        if (d < far - 1 || d > near + 1) {
          drawing = false;
          continue;
        }
        const x = piece.pts[i * 2];
        const y = piece.pts[i * 2 + 1];
        if (drawing) c.lineTo(x, y);
        else {
          c.moveTo(x, y);
          drawing = true;
        }
      }
      c.stroke();
    }
    c.restore();
  }

  function draw(state: LoaderState) {
    /* A stage with no box yields baseScale 0, which makes the outline's
       `STROKE_PX / scale` infinite and the whole frame garbage. Skip instead —
       there is nothing to see at that size anyway. */
    if (!(width > 0) || !(height > 0) || !(baseScale > 0)) return;

    ctx!.setTransform(1, 0, 0, 1, 0, 0);
    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    const scale = baseScale * state.lockScale * state.breathe;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.translate(width / 2, height / 2);
    ctx!.rotate(state.lockRot + state.microRot);
    ctx!.scale(scale, scale);

    if (state.droplet.visible) {
      ctx!.save();
      ctx!.globalAlpha = state.droplet.alpha;
      ctx!.fillStyle = DROP_COLOR;
      ctx!.beginPath();
      ctx!.arc(0, 0, DROP_RADIUS * state.droplet.scale, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();
    }

    /* Fill under outline, ribbon by ribbon, in artwork order. */
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      const s = state.pieces[i];
      if (!s) continue;
      fillPiece(ctx!, p, s.fill);
      strokePiece(ctx!, p, s.trace, s.strokeOpacity, scale);
    }
  }

  resize();

  return {
    resize,
    draw,
    destroy() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
