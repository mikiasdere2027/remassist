'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * The service-page rail behaviour, shared by InterviewRail and BlogRail and
 * ported from components/home/TeamRail: advance one card on an interval,
 * wrapping at the end; hold off for 8s after hover, focus or any pointer
 * interaction so it never fights the visitor; pause off-screen, on a hidden
 * tab, and while `paused` is true; and stay put under prefers-reduced-motion.
 */
const HOLD_MS = 8000;

interface Options {
  /** ms between advances */
  advanceMs?: number;
  /** card width fallback, before the first card can be measured */
  cardWidth?: number;
  /** the rail's flex gap, in px */
  gap?: number;
  /** hold the auto-advance off entirely — e.g. while a clip is playing */
  paused?: boolean;
}

export function useRail<T extends HTMLElement = HTMLDivElement>(
  { advanceMs = 4000, cardWidth = 288, gap = 20, paused = false }: Options = {},
) {
  const railRef = useRef<T>(null);
  const resumeAt = useRef(0);
  /**
   * The progress bar is written to directly rather than held in state.
   * `onScroll` fires for every frame of a drag or a smooth scroll — dozens of
   * events per gesture — and each one used to setState, re-rendering the whole
   * rail (every card, every image) to move one inline width. Nothing else in
   * the subtree depends on the value, so React never needed to know it.
   * Same approach as the loader's progress bar in components/loader/RemLoader.tsx.
   */
  const progressRef = useRef<HTMLSpanElement>(null);

  /** One card plus the gap — measured, since the card width is responsive. */
  const step = useCallback(() => {
    const el = railRef.current;
    return (el?.firstElementChild?.getBoundingClientRect().width || cardWidth) + gap;
  }, [cardWidth, gap]);

  const hold = useCallback(() => {
    resumeAt.current = performance.now() + HOLD_MS;
  }, []);

  const onScroll = useCallback(() => {
    const el = railRef.current;
    const bar = progressRef.current;
    if (!el || !bar) return;
    const max = el.scrollWidth - el.clientWidth;
    const pct = max > 0 ? Math.max(8, Math.min(100, (el.scrollLeft / max) * 100)) : 8;
    bar.style.width = `${pct}%`;
  }, []);

  const nudge = useCallback((dir: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    hold();
    el.scrollBy({ left: dir * step(), behavior: 'smooth' });
  }, [hold, step]);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let hovered = false;
    let onScreen = false;

    const tick = () => {
      if (hovered || paused || document.hidden || !onScreen) return;
      if (performance.now() < resumeAt.current) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const s = step();
      // within one step of the end → wrap back round to the first card
      const left = el.scrollLeft + s >= max - 4 ? 0 : el.scrollLeft + s;
      el.scrollTo({ left, behavior: 'smooth' });
    };
    const timer = setInterval(tick, advanceMs);

    const enter = () => { hovered = true; };
    const leave = () => { hovered = false; };
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    el.addEventListener('focusin', enter);
    el.addEventListener('focusout', leave);
    el.addEventListener('pointerdown', hold);
    el.addEventListener('wheel', hold, { passive: true });

    const io = new IntersectionObserver(
      ([e]) => { onScreen = e.isIntersecting; },
      { threshold: 0.15 },
    );
    io.observe(el);

    return () => {
      clearInterval(timer);
      io.disconnect();
      el.removeEventListener('mouseenter', enter);
      el.removeEventListener('mouseleave', leave);
      el.removeEventListener('focusin', enter);
      el.removeEventListener('focusout', leave);
      el.removeEventListener('pointerdown', hold);
      el.removeEventListener('wheel', hold);
    };
  }, [advanceMs, hold, paused, step]);

  return { railRef, progressRef, onScroll, nudge, hold };
}
