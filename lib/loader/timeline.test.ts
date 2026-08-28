import { describe, expect, it } from 'vitest';
import {
  CAP_MS,
  FADE_MS,
  FAILSAFE_MS,
  FLOOR_MS,
  FULL_SEQUENCE_MS,
  PIECES,
  SEQUENCE_END,
  TIMELINE,
  barProgressAt,
  clamp01,
  easeIOC,
  easeOutBack,
  easeOutQuint,
  loaderStateAt,
  ramp,
  shouldReveal,
} from './timeline';

/**
 * The loader's choreography, asserted without a browser.
 *
 * Scope warning, because this repo has been burned by it: these cover the math
 * only. The quiz shipped with 432 green tests around `score()` while its result
 * screen was unreachable. A green run here is not evidence that the overlay
 * ever leaves the screen — that is a browser check, not a unit test.
 */

const sample = (n: number) => Array.from({ length: n + 1 }, (_, i) => i / n);

describe('easings', () => {
  it('pin their endpoints', () => {
    expect(easeIOC(0)).toBe(0);
    expect(easeIOC(1)).toBe(1);
    expect(easeOutQuint(0)).toBe(0);
    expect(easeOutQuint(1)).toBe(1);
    expect(easeOutBack(0)).toBeCloseTo(0, 10);
    expect(easeOutBack(1)).toBeCloseTo(1, 10);
  });

  it('rise monotonically across [0, 1]', () => {
    for (const ease of [easeIOC, easeOutQuint]) {
      let prev = -Infinity;
      for (const x of sample(200)) {
        const y = ease(x);
        expect(y).toBeGreaterThanOrEqual(prev);
        prev = y;
      }
    }
  });

  it('gives easeOutBack an overshoot above 1 — this is the lock’s snap', () => {
    const peak = Math.max(...sample(200).map(easeOutBack));
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.2);
  });

  it('clamps outside the ramp window', () => {
    expect(ramp(-5, 1, 2)).toBe(0);
    expect(ramp(99, 1, 2)).toBe(1);
    expect(ramp(1.5, 1, 2)).toBeCloseTo(0.5, 10);
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(3)).toBe(1);
  });
});

describe('loaderStateAt', () => {
  it('starts on an empty stage', () => {
    const s = loaderStateAt(0, 0);
    expect(s.droplet.visible).toBe(false);
    for (const p of s.pieces) {
      expect(p.trace).toBe(0);
      expect(p.fill).toBe(0);
      expect(p.strokeOpacity).toBe(1);
    }
  });

  it('shows the droplet before the first ribbon traces', () => {
    /* Expressed as a fraction of TIMELINE, not a literal second: SPEED moves
       every one of these instants. */
    const s = loaderStateAt(TIMELINE.TRACE_START / 2, 0);
    expect(s.droplet.visible).toBe(true);
    expect(s.pieces[0].trace).toBe(0);
  });

  it('staggers each ribbon by TRACE_STAGGER', () => {
    for (let i = 0; i < 4; i++) {
      const start = TIMELINE.TRACE_START + i * TIMELINE.TRACE_STAGGER;
      expect(loaderStateAt(start, 0).pieces[i].trace).toBe(0);
      expect(loaderStateAt(start + 0.01, 0).pieces[i].trace).toBeGreaterThan(0);
    }
  });

  it('dissolves every outline once its fill is underway', () => {
    for (let i = 0; i < 4; i++) {
      const st = TIMELINE.TRACE_START + i * TIMELINE.TRACE_STAGGER;
      const done = st + TIMELINE.DISSOLVE_START_OFFSET + TIMELINE.DISSOLVE_DUR;
      expect(loaderStateAt(done, 0).pieces[i].strokeOpacity).toBeCloseTo(0, 10);
    }
  });

  /* The lock is a settle on a finished mark. If a ribbon were still filling
     when it fired, the dip would read as a glitch rather than a landing. */
  it('has every ribbon fully filled before the lock starts', () => {
    for (const p of loaderStateAt(TIMELINE.LOCK_START, 0).pieces) {
      expect(p.fill).toBe(1);
      expect(p.trace).toBe(1);
      expect(p.strokeOpacity).toBeCloseTo(0, 10);
    }
  });

  it('dips then returns the mark to its own size across the lock', () => {
    expect(loaderStateAt(TIMELINE.LOCK_START, 0).lockScale).toBe(1);
    const dip = loaderStateAt(TIMELINE.LOCK_START + 0.35 * TIMELINE.LOCK_DUR, 0);
    expect(dip.lockScale).toBeCloseTo(0.95, 2);
    expect(dip.lockRot).toBeGreaterThan(0);
    const after = loaderStateAt(SEQUENCE_END + 0.01, 0);
    expect(after.lockScale).toBe(1);
    expect(after.lockRot).toBe(0);
  });

  it('keeps the idle breathing inside ±1.2%', () => {
    for (const t of sample(120).map((x) => SEQUENCE_END + x * 6)) {
      const s = loaderStateAt(t, t);
      expect(Math.abs(s.breathe - 1)).toBeLessThanOrEqual(0.012 + 1e-9);
      expect(Math.abs(s.microRot)).toBeLessThanOrEqual(0.006 + 1e-9);
    }
  });

  it('does not breathe until the lock has landed', () => {
    const s = loaderStateAt(SEQUENCE_END, 12.3);
    expect(s.breathe).toBe(1);
    /* toBeCloseTo, not toBe: the amplitude is zero but sin() carries its sign,
       so this is -0 for half the clock. */
    expect(s.microRot).toBeCloseTo(0, 10);
  });
});

describe('shouldReveal', () => {
  it('holds the floor even when the page is already ready', () => {
    expect(shouldReveal(0, true)).toBe(false);
    expect(shouldReveal(FLOOR_MS - 1, true)).toBe(false);
    expect(shouldReveal(FLOOR_MS, true)).toBe(true);
  });

  it('waits past the floor while the page is not ready', () => {
    expect(shouldReveal(FLOOR_MS, false)).toBe(false);
    expect(shouldReveal(CAP_MS - 1, false)).toBe(false);
  });

  /* The backstop that matters: a page that never reports ready still reveals. */
  it('reveals at the cap regardless of readiness', () => {
    expect(shouldReveal(CAP_MS, false)).toBe(true);
    expect(shouldReveal(CAP_MS * 10, false)).toBe(true);
  });

  it('never flips back to false as time advances', () => {
    for (const ready of [true, false]) {
      let seen = false;
      for (let ms = 0; ms <= CAP_MS + 2000; ms += 25) {
        const now = shouldReveal(ms, ready);
        if (seen) expect(now).toBe(true);
        seen ||= now;
      }
      expect(seen).toBe(true);
    }
  });

  it('caps after the floor, so the two gates cannot invert', () => {
    expect(CAP_MS).toBeGreaterThan(FLOOR_MS);
  });

  /* The backstop exists to catch a runner that never runs. If it were to fire
     while a slow-but-working load is still fading, every such visitor would
     see the animation cut instead — and the overlay would be left hidden in
     the DOM with the session flag unwritten. */
  it('arms the failsafe behind the runner’s own worst case', () => {
    expect(FAILSAFE_MS).toBeGreaterThan(CAP_MS + FADE_MS);
  });
});

/**
 * The regression this file exists to prevent.
 *
 * The loader first shipped with a hand-picked 1200ms floor against a 4500ms
 * sequence, so the fade always began around the first ribbon and the mark was
 * never seen to assemble — the animation had no ending as far as a visitor was
 * concerned. Both numbers now derive from SPEED, and these assert they cannot
 * come apart again.
 */
describe('the hold is long enough for the animation to finish', () => {
  it('holds at least until the lock has landed', () => {
    expect(FLOOR_MS).toBeGreaterThanOrEqual(FULL_SEQUENCE_MS);
  });

  it('has nothing left to animate at the moment it reveals', () => {
    /* The state at the floor is the state the visitor is left with. */
    const s = loaderStateAt(FLOOR_MS / 1000 - TIMELINE.LEAD_IN, 0);
    expect(s.droplet.visible).toBe(false);
    for (const p of s.pieces) {
      expect(p.trace).toBe(1);
      expect(p.fill).toBe(1);
      expect(p.strokeOpacity).toBeCloseTo(0, 10);
    }
    expect(s.lockScale).toBe(1);
    expect(s.lockRot).toBe(0);
  });

  it('starts the lock the moment the last ribbon settles, with no dead air', () => {
    const last = PIECES - 1;
    const st = TIMELINE.TRACE_START + last * TIMELINE.TRACE_STAGGER;
    const settled = st + TIMELINE.DISSOLVE_START_OFFSET + TIMELINE.DISSOLVE_DUR;
    expect(TIMELINE.LOCK_START).toBeCloseTo(settled, 10);
  });

  it('stays fast — the whole overlay is gone inside two seconds', () => {
    expect(FLOOR_MS + FADE_MS).toBeLessThan(2000);
  });
});

describe('barProgressAt', () => {
  it('runs 0 → 1 and lands exactly with the lock, not before it', () => {
    expect(barProgressAt(0)).toBe(0);
    expect(barProgressAt(SEQUENCE_END)).toBeLessThan(1);
    expect(barProgressAt(TIMELINE.LEAD_IN + SEQUENCE_END)).toBe(1);
  });
});
