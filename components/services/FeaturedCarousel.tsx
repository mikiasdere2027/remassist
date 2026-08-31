'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { DIRECTORY, categoryNumber, featuredCategories } from './directory';
import styles from './FeaturedCarousel.module.css';

/**
 * The three featured lines, one at a time.
 *
 * They were three cards side by side. At three-up each had roughly 380px to
 * carry a title, a blurb, four roles and a link — which is why the roles ran
 * in one cramped column and the fourth was usually the last thing anyone read.
 * One card at a time gets the full width: the roles sit two-up, and the right
 * half can carry a photograph.
 *
 * WHAT IS DELIBERATE HERE:
 *
 * - All three slides are rendered and inactive ones hidden with `visibility`,
 *   not unmounted and not the `hidden` attribute. These three categories are
 *   NOT in the tab directory below — they were lifted out of it — so this is
 *   the only place their roles exist, and a crawler has to see all of them.
 *   (`hidden` would not work anyway: Tailwind's preflight sets
 *   [hidden]{display:none!important}, which collapses the box.)
 *
 * - The slides keep the category ids, so /services#finance still resolves. The
 *   hash is read on mount and on hashchange and pages to the matching slide —
 *   a browser cannot jump to a slide that is not the visible one on its own.
 *
 * - Autoplay, with the three guards that make it tolerable: it stops while the
 *   pointer is over the carousel or focus is inside it, so it never moves the
 *   thing you are reading or about to click; it restarts its clock on every
 *   manual change, so paging never fights the timer; and it does not run at all
 *   under prefers-reduced-motion, which is the setting that actually means
 *   "stop moving things".
 */
const AUTOPLAY_MS = 6500;
const SLIDES = featuredCategories();

/* The counter reads 01 / 09, not 01 / 03. The number on a slide is its place in
   the whole directory — the six that are not featured carry on below in the tab
   rail — so counting against three would say the page holds three lines when it
   holds nine. */
const TOTAL = String(DIRECTORY.length).padStart(2, '0');

export default function FeaturedCarousel() {
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);

  const go = useCallback((next: number) => {
    setActive(((next % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);

  /* `active` is a dependency on purpose: changing slide by hand tears the
     interval down and starts a fresh one, so a manual step always gets the
     full dwell rather than whatever was left on the previous tick. */
  useEffect(() => {
    if (held) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setActive((a) => (a + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [held, active]);

  /* Deep links: /services#sales-revenue and its two siblings. */
  useEffect(() => {
    const fromHash = (smooth: boolean) => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const i = SLIDES.findIndex((c) => c.id === id);
      if (i < 0) return;
      setActive(i);
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
          block: 'start',
        });
      });
    };
    fromHash(false);
    const onHash = () => fromHash(true);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div
      className={styles.wrap}
      role="group"
      aria-roledescription="carousel"
      aria-label="Featured service lines"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
      }}
    >
      <div className={styles.stack}>
        {SLIDES.map((c, i) => (
          <div
            key={c.id}
            id={c.id}
            className={`${styles.slide} ${i === active ? styles.slideOn : ''}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${SLIDES.length}: ${c.name}`}
            inert={i !== active}
          >
            <div className={styles.body}>
              <div className={styles.head}>
                <span className={styles.ico} aria-hidden="true">
                  <svg viewBox="0 0 24 24">{c.icon}</svg>
                </span>
                <span>
                  <h3 className={styles.name}>{c.name}</h3>
                  <p className={styles.blurb}>{c.blurb}</p>
                </span>
              </div>

              <ul className={styles.roles}>
                {c.items.map((item) => (
                  <li key={item.name}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7" /></svg>
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>

              <span className={styles.spacer} />

              {/* The counter and the link share the card's foot: the number on
                  the left, the way out on the right. */}
              <div className={styles.foot}>
                <p className={styles.count}>
                  <span className={styles.countNow}>{categoryNumber(c.id)}</span>
                  <span className={styles.countAll}>/ {TOTAL}</span>
                </p>
                <Link href={c.more.href} className={styles.go} aria-label={`Explore ${c.name}`}>
                  Explore More
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                </Link>
              </div>
            </div>

            {c.photo && (
              <div className={styles.media}>
                {/* alt empty: the copy beside it already names the line, and the
                    photograph is atmosphere rather than information. */}
                <Image src={c.photo} alt="" fill sizes="(max-width: 980px) 100vw, 50vw" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.controls}>
        <div className={styles.arrows}>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => go(active - 1)}
            aria-label="Previous service line"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6 6-6-6 6-6" /></svg>
          </button>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowNext}`}
            onClick={() => go(active + 1)}
            aria-label="Next service line"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
