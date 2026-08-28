'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FADE_MS,
  FAILSAFE_MS,
  TIMELINE,
  barProgressAt,
  clamp01,
  easeIOC,
  loaderStateAt,
  shouldReveal,
} from '@/lib/loader/timeline';
import { createPainter, type LoaderPainter } from './paint';
import styles from './RemLoader.module.css';

/**
 * RemLoader — the brand animation that opens the home route.
 *
 * A port of the loader from `index.html` (`assets/website-loader.js` plus its
 * overlay markup and inline failsafe), with three deliberate differences:
 *
 *  1. Canvas 2D instead of three.js — see `paint.ts` for why.
 *  2. Once per browser session, not once per page load.
 *  3. Compressed to ~1.33s and gated on readiness, rather than held for the
 *     reference's full 4.5s. MIGRATION-PLAN §7.4 originally cut this loader on
 *     the grounds that a splash in front of already-rendered HTML is a
 *     regression; that is right about the *masking* role it used to play, so
 *     what comes back is a short brand beat that gets out of the way, not a
 *     boot mask. The hold is derived from the sequence (FLOOR_MS in
 *     lib/loader/timeline.ts), so the mark is always seen to finish
 *     assembling — speeding it up is a matter of turning SPEED, and the hold
 *     follows on its own.
 *
 * The overlay markup is server-rendered into the static HTML of `/`. It has to
 * be — an overlay that arrives with hydration paints *after* the page it is
 * meant to cover, which is a flash rather than an opening.
 */

const SESSION_KEY = 'rem-loader-seen';

/**
 * Module scope survives client-side navigation within the document, so once
 * the loader has played, returning to `/` from another route renders nothing.
 * Without this, a <Link> back to the home page would drop a full-screen
 * overlay into the middle of a visit.
 */
let hasPlayed = false;

/**
 * Runs during HTML parse, before first paint and before hydration.
 *
 * Two jobs the React bundle cannot do:
 *  - hide the overlay for a visitor who has already seen it this session,
 *    with no frame of navy in between;
 *  - guarantee the overlay clears even if that bundle never arrives.
 *
 * It hides rather than removes, on purpose: removing the node before (or
 * behind the back of) hydration makes React unmount a child that is no longer
 * there.
 */
const GATE_SCRIPT = `(function(){
var el=document.getElementById('rem-loader');
if(!el)return;
try{if(sessionStorage.getItem('${SESSION_KEY}')){el.style.display='none';return;}}catch(e){}
document.documentElement.style.overflow='hidden';
var clear=function(){
document.documentElement.style.overflow='';
var n=document.getElementById('rem-loader');
if(n){n.style.opacity='0';n.style.display='none';n.style.pointerEvents='none';}
};
window.__remLoaderClear=clear;
window.__remLoaderFailsafe=setTimeout(clear,${FAILSAFE_MS});
document.addEventListener('visibilitychange',function(){
if(document.visibilityState==='visible'&&window.__remLoaderFailsafe){
clearTimeout(window.__remLoaderFailsafe);
window.__remLoaderFailsafe=setTimeout(clear,${FAILSAFE_MS});
}
});
})();`;

declare global {
  interface Window {
    __remLoaderClear?: () => void;
    __remLoaderFailsafe?: ReturnType<typeof setTimeout>;
  }
}

/** Mirrors the probe HomeHero uses before it autoplays the hero video. */
function prefersStill(): boolean {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const conn = nav.connection;
  const frugal = Boolean(conn?.saveData) || /^(slow-)?2g$/.test(conn?.effectiveType ?? '');
  return Boolean(reduced) || frugal;
}

export default function RemLoader() {
  /* `hasPlayed` is read at render time so a later visit to `/` renders null.
     On the first render — server and hydration alike — it is false in both
     places, so the markup matches. */
  const [visible, setVisible] = useState(!hasPlayed);
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    let frame = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    let painter: LoaderPainter | null = null;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
      painter?.destroy();
      if (window.__remLoaderFailsafe) {
        clearTimeout(window.__remLoaderFailsafe);
        window.__remLoaderFailsafe = undefined;
      }
      document.documentElement.style.overflow = '';
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* private mode — the loader simply plays again next navigation */
      }
      hasPlayed = true;
      setVisible(false);
    };

    /* Already seen this session: the gate script has hidden the overlay, so
       there is nothing to animate — just take it out of the tree. */
    let seen = false;
    try {
      seen = Boolean(sessionStorage.getItem(SESSION_KEY));
    } catch {
      /* ignore */
    }
    if (seen) {
      finish();
      return;
    }

    /* Readiness. Deliberately NOT `window.load`: HomeHero autoplays a 9.1 MB
       video, so `load` lands seconds after the page is usable and would turn
       the hold into a five-second one. Fonts settling is the signal that the
       page has stopped visibly changing. */
    let ready = false;
    const markReady = () => {
      ready = true;
    };
    const onReadyStateChange = () => {
      if (document.readyState === 'complete') markReady();
    };
    if (document.fonts) document.fonts.ready.then(markReady, markReady);
    else markReady();
    if (document.readyState === 'complete') markReady();
    else document.addEventListener('readystatechange', onReadyStateChange);

    const still = prefersStill();
    if (still) {
      /* No canvas at all — the static mark, held. */
      imgRef.current?.classList.remove(styles.fallbackHidden);
    } else {
      try {
        painter = canvasRef.current ? createPainter(canvasRef.current) : null;
      } catch {
        painter = null;
      }
      /* Canvas unavailable or the sampling threw: same static mark as the
         reduced-motion path, rather than an empty navy screen. */
      if (!painter) imgRef.current?.classList.remove(styles.fallbackHidden);
    }

    const onResize = () => painter?.resize();
    window.addEventListener('resize', onResize);

    const t0 = performance.now();
    let barShown = 0;
    let fadeStart = -1;

    /* Everything time-based, split out from the paint loop on purpose.
       requestAnimationFrame does not run in a background tab, and `/` gets
       opened in one constantly — middle-click, session restore, "open in new
       tab". Driving the reveal from rAF meant such a visitor's loader never
       finished on its own: the 6s failsafe hid it, the session flag was never
       written, and the node stayed in the DOM for the rest of the visit.
       Timers still fire (throttled) when hidden, so the reveal rides on one.

       Called from both loops with the same clock — rAF timestamps and
       performance.now() share a time origin — and is idempotent, so a double
       call in the same millisecond changes nothing.

       @returns false once the loader has finished. */
    const advance = (now: number): boolean => {
      const elapsed = now - t0;

      if (fadeStart < 0 && shouldReveal(elapsed, ready)) fadeStart = now;

      /* The bar is snapped to full as the fade starts, so it never dissolves
         at 30% on a fast connection. */
      const target = fadeStart >= 0 ? 1 : barProgressAt(elapsed / 1000);
      if (target > barShown) {
        barShown = target;
        if (barRef.current) barRef.current.style.width = `${Math.round(barShown * 100)}%`;
      }

      if (fadeStart >= 0) {
        const p = clamp01((now - fadeStart) / FADE_MS);
        overlay.style.opacity = String(1 - easeIOC(p));
        if (p >= 1) {
          finish();
          return false;
        }
      }
      return true;
    };

    /* Paint only. The sequence has reached its lock by the time the fade
       starts, so what cross-fades out is the settled mark, breathing — never
       a stroke caught halfway. */
    const tick = (now: number) => {
      if (!advance(now)) return;
      painter?.draw(loaderStateAt((now - t0) / 1000 - TIMELINE.LEAD_IN, now / 1000));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    timer = setInterval(() => advance(performance.now()), 100);

    return () => {
      cancelAnimationFrame(frame);
      if (timer !== undefined) clearInterval(timer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('readystatechange', onReadyStateChange);
      painter?.destroy();
      /* Never leave the page unscrollable behind an unmounted loader. */
      document.documentElement.style.overflow = '';
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* aria-hidden: the page underneath is fully rendered and readable to
          assistive tech from the first byte — the overlay is decoration over
          it, and must not be announced. */}
      <div
        id="rem-loader"
        ref={overlayRef}
        className={styles.overlay}
        aria-hidden="true"
        role="presentation"
        suppressHydrationWarning
      >
        <canvas id="rem-loader-stage" ref={canvasRef} className={styles.stage} />
        {/* eslint-disable-next-line @next/next/no-img-element -- next/image
            would defer this behind its own loader; the fallback has to be
            paintable the instant the canvas path is ruled out. */}
        <img
          id="rem-loader-fallback"
          ref={imgRef}
          src="/images/rem-loader-logo.svg"
          alt=""
          className={`${styles.fallback} ${styles.fallbackHidden}`}
        />
        <div className={styles.track}>
          <span id="rem-loader-bar" ref={barRef} className={styles.bar} />
        </div>
        <span className={styles.caption}>Loading</span>
      </div>
      <script dangerouslySetInnerHTML={{ __html: GATE_SCRIPT }} />
    </>
  );
}
