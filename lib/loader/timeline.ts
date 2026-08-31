/**
 * Website loader — the animation timeline, as pure math.
 *
 * Ported constant-for-constant from `RemAssist-Html/assets/website-loader.js`, which was
 * itself a port of `RemAssist-Html/RemAssist Logo Icon Web-loader.html`. The
 * choreography is unchanged; only the renderer is (WebGL shaders → Canvas 2D,
 * see `components/loader/paint.ts`).
 *
 * Nothing here touches the DOM, on purpose. The reveal decision in particular
 * is the piece whose failure strands a visitor behind a full-screen navy
 * rectangle, so it has to be assertable without a browser — see
 * `timeline.test.ts`.
 */

/* ---------- easings, verbatim from the reference ---------- */

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Normalised position of `t` inside the window [a, b], clamped to [0, 1]. */
export const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/** Cubic in-out. */
export const easeIOC = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

export const easeOutQuint = (x: number) => 1 - Math.pow(1 - x, 5);

/** Overshoots above 1 before settling — this is what gives the lock its snap. */
export const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/* ---------- timeline ---------- */

/** Ribbons in the mark. The stagger and the lock's start both depend on it. */
export const PIECES = 4;

/**
 * The reference choreography, in seconds — the numbers from
 * `RemAssist-Html/assets/website-loader.js`, kept unscaled so the original is still legible.
 *
 * Nothing reads these directly. They are the shape of the animation; TIMELINE
 * below is the shape divided by SPEED.
 */
const REFERENCE = {
  /** Empty stage before the droplet — the reference starts its clock at now+200ms. */
  LEAD_IN: 0.2,
  /** How long the droplet takes to swell and fade. */
  DROP_DUR: 0.5,
  TRACE_START: 0.3,
  TRACE_STAGGER: 0.12,
  TRACE_DUR: 1.4,
  /** A ribbon starts filling this long after its own trace begins. */
  FILL_OFFSET: 0.55,
  FILL_DUR: 1.1,
  /** Its outline starts dissolving this long after its own trace begins. */
  DISSOLVE_START_OFFSET: 1.15,
  DISSOLVE_DUR: 0.55,
  LOCK_DUR: 0.9,
  /** Ramp-in of the idle breathing once the lock has landed. */
  IDLE_DUR: 1.0,
} as const;

/**
 * How much faster than the reference the sequence plays.
 *
 * The reference runs 4.5s end to end. That was fine when the loader was
 * masking a client-side React boot, but here it is a brand beat in front of
 * HTML that is already rendered, and the reveal gate would cut it off partway
 * — the animation never reached its own ending. Compressing it is what lets
 * the whole choreography land inside the hold.
 *
 * This is the one number to turn. Everything below scales from it, FLOOR_MS
 * included, so the sequence and the hold cannot drift apart.
 */
export const SPEED = 2.6;

const at = (seconds: number) => seconds / SPEED;

/**
 * The reference also idles for a full second between the last ribbon settling
 * (2.36s) and the lock firing (3.4s) — dead air that reads as hesitation once
 * the rest is quick. The lock now starts the instant the last ribbon is done,
 * so this is not simply the reference played faster.
 */
const LAST_PIECE_START = REFERENCE.TRACE_START + (PIECES - 1) * REFERENCE.TRACE_STAGGER;
const LAST_PIECE_END = Math.max(
  LAST_PIECE_START + REFERENCE.TRACE_DUR,
  LAST_PIECE_START + REFERENCE.FILL_OFFSET + REFERENCE.FILL_DUR,
  LAST_PIECE_START + REFERENCE.DISSOLVE_START_OFFSET + REFERENCE.DISSOLVE_DUR,
);

export const TIMELINE = {
  LEAD_IN: at(REFERENCE.LEAD_IN),
  DROP_DUR: at(REFERENCE.DROP_DUR),
  TRACE_START: at(REFERENCE.TRACE_START),
  TRACE_STAGGER: at(REFERENCE.TRACE_STAGGER),
  TRACE_DUR: at(REFERENCE.TRACE_DUR),
  FILL_OFFSET: at(REFERENCE.FILL_OFFSET),
  FILL_DUR: at(REFERENCE.FILL_DUR),
  DISSOLVE_START_OFFSET: at(REFERENCE.DISSOLVE_START_OFFSET),
  DISSOLVE_DUR: at(REFERENCE.DISSOLVE_DUR),
  LOCK_START: at(LAST_PIECE_END),
  LOCK_DUR: at(REFERENCE.LOCK_DUR),
  IDLE_DUR: at(REFERENCE.IDLE_DUR),
} as const;

/** The moment the whole sequence has finished and only the breathing is left. */
export const SEQUENCE_END = TIMELINE.LOCK_START + TIMELINE.LOCK_DUR;

/** Lead-in included: how long the loader needs to play its ending. */
export const FULL_SEQUENCE_MS = (TIMELINE.LEAD_IN + SEQUENCE_END) * 1000;

/* ---------- reveal gate ---------- */

/**
 * Minimum hold, derived rather than chosen: exactly long enough for the
 * sequence to reach its lock.
 *
 * Picking this by hand is what broke the first cut — a 1200ms floor against a
 * 4500ms sequence meant the fade always started around the first ribbon, so
 * the logo was never seen to assemble. Deriving it means changing SPEED can
 * never reintroduce that; `timeline.test.ts` asserts the relationship.
 */
export const FLOOR_MS = Math.ceil(FULL_SEQUENCE_MS);
/** Hard ceiling: reveal whether or not the page ever reports itself ready. */
export const CAP_MS = Math.ceil(FLOOR_MS * 2);
/** Cross-fade out of the overlay. */
export const FADE_MS = 400;

/**
 * The inline gate script's backstop, in ms — the timer that clears the overlay
 * if the React bundle never arrives or its effect never runs.
 *
 * It lives here rather than beside the script that arms it so the one property
 * that matters can be asserted: it has to sit BEHIND the runner's own worst
 * case (CAP_MS + FADE_MS), or it stops being a backstop and starts truncating
 * the animation on every slow load.
 */
export const FAILSAFE_MS = CAP_MS + FADE_MS + 1500;

/**
 * Should the overlay start fading yet?
 *
 * Deliberately monotonic in `elapsed`: once true it stays true, so a caller
 * cannot un-reveal a loader that has already begun fading.
 */
export function shouldReveal(elapsedMs: number, ready: boolean): boolean {
  if (elapsedMs >= CAP_MS) return true;
  return ready && elapsedMs >= FLOOR_MS;
}

/* ---------- per-frame state ---------- */

export interface DropletState {
  visible: boolean;
  scale: number;
  alpha: number;
}

export interface PieceState {
  /** 0–1 along the ribbon's outline; the comet head sits here. */
  trace: number;
  /** 0–1 radius of the fill wipe out from the ribbon's centre. */
  fill: number;
  /** The outline fades once the fill is well underway. */
  strokeOpacity: number;
}

export interface LoaderState {
  droplet: DropletState;
  pieces: PieceState[];
  /** Scale of the whole mark from the lock/settle. */
  lockScale: number;
  /** Rotation, radians, from the lock/settle. */
  lockRot: number;
  /** Multiplier from the idle breathing — 1 until the lock has landed. */
  breathe: number;
  /** Rotation, radians, from the idle breathing. */
  microRot: number;
}

/**
 * @param t     seconds since the sequence started (already past LEAD_IN)
 * @param tAbs  a free-running clock in seconds, for the idle breathing — it is
 *              intentionally not tied to `t` so the breathing has no phase jump
 * @param count number of ribbons
 */
export function loaderStateAt(t: number, tAbs: number, count = PIECES): LoaderState {
  const T = TIMELINE;

  /* 1. Central droplet — appears and fades as the first stroke begins. */
  const dropP = ramp(t, 0, T.DROP_DUR);
  const droplet: DropletState =
    dropP > 0 && dropP < 1
      ? { visible: true, scale: 0.4 + easeOutQuint(dropP) * 2.2, alpha: (1 - dropP) * 0.95 }
      : { visible: false, scale: 0, alpha: 0 };

  /* 2. Per-ribbon trace / fill / dissolve, staggered. */
  const pieces: PieceState[] = [];
  for (let i = 0; i < count; i++) {
    const st = T.TRACE_START + i * T.TRACE_STAGGER;
    pieces.push({
      trace: easeOutQuint(ramp(t, st, st + T.TRACE_DUR)),
      fill: easeIOC(ramp(t, st + T.FILL_OFFSET, st + T.FILL_OFFSET + T.FILL_DUR)),
      strokeOpacity:
        1 -
        easeIOC(
          ramp(t, st + T.DISSOLVE_START_OFFSET, st + T.DISSOLVE_START_OFFSET + T.DISSOLVE_DUR),
        ),
    });
  }

  /* 3. Elastic lock: a small dip and tilt, then an overshooting return. */
  const lockP = ramp(t, T.LOCK_START, T.LOCK_START + T.LOCK_DUR);
  let lockScale = 1;
  let lockRot = 0;
  if (lockP > 0 && lockP < 1) {
    if (lockP < 0.35) {
      const sub = lockP / 0.35;
      lockScale = 1 - 0.05 * easeIOC(sub);
      lockRot = 0.04 * easeIOC(sub);
    } else {
      const sub = (lockP - 0.35) / 0.65;
      lockScale = 0.95 + 0.05 * easeOutBack(sub);
      lockRot = 0.04 * (1 - easeOutBack(sub));
    }
  }

  /* 4. Idle breathing — keeps the settled mark alive while the page finishes. */
  const idleP = ramp(t, SEQUENCE_END, SEQUENCE_END + T.IDLE_DUR);
  const breathe = 1 + 0.012 * Math.sin(tAbs * 1.4) * idleP;
  const microRot = Math.sin(tAbs * 0.35) * 0.006 * idleP;

  return { droplet, pieces, lockScale, lockRot, breathe, microRot };
}

/**
 * Progress-bar fill, 0–1. Tied to the sequence rather than a fixed duration:
 * it starts with the droplet and reaches full exactly as the lock lands, so
 * speeding the animation up cannot leave the bar crawling at a quarter full.
 */
export const barProgressAt = (elapsedSeconds: number) =>
  ramp(elapsedSeconds, TIMELINE.LEAD_IN, TIMELINE.LEAD_IN + SEQUENCE_END);
