'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PHASES } from '@/lib/content/how-it-works-phases';
import styles from './PhaseScroller.module.css';

/**
 * The four phases, one screen at a time.
 *
 * They were four cards stacked down the page — roughly two and a half screens
 * of scrolling in which every card looked like the one above it, because they
 * are deliberately the same shape. Read that way, phase three is skimmed and
 * the promise inside it ("nobody is assigned to your account without your
 * sign-off") goes past at the speed of a bullet list. Here the section pins
 * and one phase holds the screen at a time: scrolling advances it, the rail on
 * the left fills as you go, and the section releases the page once the fourth
 * has been reached. The point of the page is that onboarding is a sequence, so
 * the page reads as a sequence.
 *
 * WHAT IS DELIBERATE HERE:
 *
 * - The pinning is an enhancement, not the layout. Everything renders as four
 *   ordinary cards down the page, and only a viewport with room for it — wide
 *   enough, tall enough, and not asking for reduced motion — gets the pinned
 *   version. That is the same guard the CSS applies, and the two have to be
 *   changed together; the query is written out in both places rather than
 *   passed between them, because CSS cannot read a constant from here.
 *
 * - A hijacked scroll is the thing everybody hates about this pattern, so the
 *   scroll is not hijacked: the section is a tall track with a sticky panel in
 *   it, native scrolling throughout. Nothing is animated to a timer, nothing
 *   swallows a wheel event, and a flick still moves the page as far as a flick
 *   moves the page. What changes is what the sticky panel shows.
 *
 * - Which phase is showing comes from four invisible full-screen triggers
 *   tiling the track, watched by one IntersectionObserver against a thin band
 *   across the middle of the viewport. No scroll listener, no measuring on
 *   every frame. Two can touch the band at once during a fast scroll, so the
 *   set of intersecting triggers is kept and the furthest one wins — a rule
 *   that gives the same answer whichever order the entries arrive in, which is
 *   what stops the panel flickering between two phases.
 *
 * - Every phase stays in the DOM and stays in the accessibility tree: the ones
 *   that are not showing are transparent, not `visibility: hidden` and not
 *   unmounted. A screen reader gets all four in order, which is the correct
 *   reading of an ordered list of phases, and a crawler sees the whole section
 *   rather than one quarter of it. They only lose pointer events, so a hidden
 *   phase cannot be selected or clicked through.
 */

/**
 * Who gets the pinned version. Keep in step with the media query at the foot
 * of PhaseScroller.module.css — 901px because below that the two columns have
 * collapsed anyway, 700px because a phase card in a shorter viewport would be
 * pinned and still clipped, and reduced-motion because the whole idea is
 * movement tied to the scroll.
 */
const PINNED = '(min-width: 901px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)';

/** A band across the middle of the viewport, ~2% of its height. Anything
    thinner risks a fast scroll stepping over it between two frames. */
const BAND = '-49% 0px -49% 0px';

export default function PhaseScroller() {
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  const triggers = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const mq = window.matchMedia(PINNED);
    const sync = () => setPinned(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    /* Stacked layout: all four are on screen at once, so there is no "current"
       one to track. Reset, or the rail would come back mid-sequence. */
    if (!pinned) {
      setActive(0);
      return;
    }
    const els = triggers.current.filter((el): el is HTMLDivElement => el !== null);
    if (els.length === 0) return;

    const showing = new Set<number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const i = Number((entry.target as HTMLElement).dataset.step);
          if (entry.isIntersecting) showing.add(i);
          else showing.delete(i);
        }
        /* Empty at the very top and bottom of the track, where the band is off
           the triggers entirely — hold the last phase rather than snapping. */
        if (showing.size > 0) setActive(Math.max(...showing));
      },
      { rootMargin: BAND, threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pinned]);

  /* The rail jumps by scrolling to the trigger rather than by setting state:
     the observer stays the single source of truth for which phase is showing,
     so a jump cannot leave the rail saying one thing and the scroll position
     another. */
  const goTo = useCallback((i: number) => {
    triggers.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const last = PHASES.length - 1;

  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        {pinned && (
          <p className={styles.hint}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="m6 13 6 6 6-6" />
            </svg>
            Keep scrolling — the phases step through one at a time.
          </p>
        )}
      </div>

      {/* The track is what makes the scrolling long enough to step through: one
          screen per phase, plus a tail so the last one is not released the
          instant it arrives. `--hw-steps` follows the data — add a fifth phase
          and the track lengthens by a screen on its own. */}
      <div
        className={styles.track}
        style={{ '--hw-steps': PHASES.length } as React.CSSProperties}
      >
        <div className={styles.triggers} aria-hidden="true">
          {PHASES.map((phase, i) => (
            <div
              key={phase.id}
              data-step={i}
              className={styles.trigger}
              ref={(el) => {
                triggers.current[i] = el;
              }}
            />
          ))}
        </div>

        <div className={styles.stage}>
          <div className={`${styles.wrap} ${styles.stageInner}`}>
            {pinned && (
              <div
                className={styles.rail}
                role="group"
                aria-label="Jump to a phase"
                style={{ '--hw-fill': last > 0 ? active / last : 1 } as React.CSSProperties}
              >
                {PHASES.map((phase, i) => (
                  <button
                    key={phase.id}
                    type="button"
                    className={[
                      styles.railDot,
                      i === active ? styles.railDotOn : '',
                      i < active ? styles.railDotDone : '',
                    ].filter(Boolean).join(' ')}
                    aria-label={`Phase ${phase.n}: ${phase.title}`}
                    aria-current={i === active ? 'step' : undefined}
                    onClick={() => goTo(i)}
                  >
                    <span>{phase.n}</span>
                  </button>
                ))}
              </div>
            )}

            <ol className={styles.slides}>
              {PHASES.map((phase, i) => (
                <li
                  key={phase.id}
                  id={phase.id}
                  className={`${styles.slide} ${i === active ? styles.slideOn : ''}`}
                >
                  <div className={styles.card}>
                    <div className={styles.cardHead}>
                      <span className={styles.badge}>{phase.n}</span>
                      <span className={styles.when}>{phase.when}</span>
                    </div>
                    <h3>{phase.title}</h3>
                    <p>{phase.blurb}</p>

                    <div className={styles.split}>
                      <div className={styles.col}>
                        <h4>
                          <span className={styles.colIco}>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <circle cx="12" cy="12" r="8.5" />
                              <circle cx="12" cy="12" r="3.5" />
                              <path d="m15.5 8.5 3.6-3.6" />
                            </svg>
                          </span>
                          What we do
                        </h4>
                        <ul>
                          {phase.we.map((line) => (
                            <li key={line}>
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>
                              {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className={styles.col}>
                        <h4>
                          <span className={styles.colIco}>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <circle cx="12" cy="9" r="3.6" />
                              <path d="M5.5 19.2a6.5 6.5 0 0 1 13 0" />
                            </svg>
                          </span>
                          What we need from you
                        </h4>
                        <ul>
                          {phase.you.map((line) => (
                            <li key={line}>
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>
                              {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className={styles.shot}>
                    <Image
                      src={phase.photo.src}
                      alt={phase.photo.alt}
                      fill
                      sizes="(max-width: 900px) 92vw, 38vw"
                    />
                    <span className={styles.shotTag}>
                      Phase {phase.n} of {String(PHASES.length).padStart(2, '0')}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
