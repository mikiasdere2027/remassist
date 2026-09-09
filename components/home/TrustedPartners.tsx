'use client';

import Image from 'next/image';
import { useRef, useState, useEffect, useCallback } from 'react';
import shared from './HomeSections.module.css';
import styles from './TrustedPartners.module.css';

/**
 * TrustedPartners — "Teams that run on Rem Assist".
 *
 * Five logos, a card each, on a horizontal scroll track. Left / Right chevron
 * buttons navigate the track, which also accepts touch swipes and mouse-drag on
 * desktop. Auto-drifts every 4s and pauses when the pointer enters.
 */
const PARTNERS = [
  {
    name: 'Tano Group',
    logo: '/images/tano-group-logo.png',
    w: 320,
    h: 128,
    href: 'https://tanogrp.com/',
  },
  {
    name: 'LocateNMove',
    logo: '/images/locate-n-move-logo.png',
    w: 320,
    h: 188,
    href: null,
  },
  {
    name: 'Fix My Foundation',
    logo: '/images/fix-my-foundation-logo.png',
    w: 320,
    h: 183,
    href: null,
  },
  {
    name: 'Mejia Auto',
    logo: '/images/mejia-auto-logo.png',
    w: 320,
    h: 107,
    href: null,
  },
  {
    name: 'Sprint Real Estate',
    logo: '/images/sprint-real-estate-logo.png',
    w: 320,
    h: 107,
    href: null,
  },
];

/* One card plus the track's gap, so an arrow press moves exactly one logo
   rather than landing mid-card. Keep in step with .item in the module. */
const SCROLL_STEP = 190;
const AUTO_MS = 4000;

export default function TrustedPartners() {
  const trackRef  = useRef<HTMLDivElement>(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(true);
  const [paused,   setPaused]   = useState(false);

  /* Update arrow disabled states whenever the scroll position changes. */
  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', sync); ro.disconnect(); };
  }, [sync]);

  /* Auto-drift: advance one step every AUTO_MS ms, wrap around. */
  useEffect(() => {
    if (paused) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      if (el.scrollWidth <= el.clientWidth + 4) return;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + SCROLL_STEP, behavior: 'smooth' });
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const scroll = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const firstItem = el.querySelector<HTMLElement>(`.${styles.item}`);
    const step = firstItem ? firstItem.offsetWidth + 14 : SCROLL_STEP;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <section className={styles.section} aria-label="Trusted Partners">
      <div className={styles.head}>
        <span className={shared.eyebrow}>Trusted Partners</span>
        <div className={shared.head}>
          <h2 className={shared.title}>
            Teams that run on<br /><span>Rem Assist</span>
          </h2>
          <div className={shared.aside}>
            <p className={shared.desc}>
              No matter the industry, organizations trust our teams to take work off their plate and
              keep it moving — quietly, accurately, every day.
            </p>
          </div>
        </div>
      </div>

      {/* Outer wrapper: nav buttons + bar */}
      <div
        className={styles.barOuter}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Left chevron */}
        <button
          type="button"
          className={`${styles.navBtn} ${styles.navBtnLeft}`}
          onClick={() => scroll(-1)}
          disabled={!canLeft}
          aria-label="Scroll logos left"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* The scroll viewport */}
        <div className={styles.bar}>
          {/* Fade masks on the edges to hint at overflow */}
          <span
            className={`${styles.fade} ${styles.fadeLeft}${canLeft ? ` ${styles.fadeVisible}` : ''}`}
            aria-hidden="true"
          />
          <span
            className={`${styles.fade} ${styles.fadeRight}${canRight ? ` ${styles.fadeVisible}` : ''}`}
            aria-hidden="true"
          />

          {/* Scrollable logo track */}
          <div
            ref={trackRef}
            className={styles.track}
            role="list"
            aria-label="Partner logos"
          >
            {PARTNERS.map((p) => {
              const logoEl = (
                <Image
                  className={styles.logo}
                  src={p.logo}
                  alt={p.name}
                  width={p.w}
                  height={p.h}
                  sizes="(max-width: 767px) 100px, 140px"
                />
              );

              return (
                <div key={p.name} className={styles.item} role="listitem">
                  {p.href ? (
                    <a
                      className={styles.logoWrap}
                      href={p.href}
                      target="_blank"
                      rel="noopener"
                      title={p.name}
                    >
                      {logoEl}
                    </a>
                  ) : (
                    <div className={styles.logoWrap} title={p.name}>
                      {logoEl}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right chevron */}
        <button
          type="button"
          className={`${styles.navBtn} ${styles.navBtnRight}`}
          onClick={() => scroll(1)}
          disabled={!canRight}
          aria-label="Scroll logos right"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </section>
  );
}
