'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef } from 'react';
import shared from './HomeSections.module.css';
import styles from './TeamRail.module.css';

/**
 * TeamRail — "Meet the minds behind Rem Assist" (index.html, Phase 02).
 *
 * The DCLogic behaviour ported here: the rail advances one card every 3.2s,
 * wrapping at the end; hover, focus and any pointer interaction hold it off
 * for 8s so it never fights the visitor; it pauses off-screen and on a hidden
 * tab; and prefers-reduced-motion disables the auto-advance entirely.
 *
 * `img` is set only for the headshots that exist in /public/images/teams. The
 * rest fall back to the initials monogram the artboard already designed for
 * that case — do not point these at files that aren't there.
 */
const TEAM = [
  { initials: 'JZ', name: 'Johnathan Zemene', role: 'Chief Executive Officer', img: '/images/teams/Johnathan.jpg', linkedin: 'https://www.linkedin.com/in/johnathan-zemene-20b5bb199/', blurb: 'Driving the strategic vision and architecting the future of our organization.' },
  { initials: 'MS', name: 'Minassie Sora', role: 'Chief Operations Officer', img: '/images/teams/Minassie.jpg', linkedin: 'https://www.linkedin.com/in/minassie-sora-9a39a7160/', blurb: 'Leading operational efficiency across borders to deliver consistent business results.' },
  { initials: 'YB', name: 'Yonas Berisa', role: 'Chief Design Officer', img: '/images/teams/Yonas.jpg', linkedin: 'https://www.linkedin.com/in/yonas-berisa/', blurb: 'Leading the visual direction and crafting beautiful interface experiences.' },
  { initials: 'BD', name: 'Bezamariam Demeke', role: 'HR Manager', img: '/images/teams/Bezamariam.jpg', linkedin: 'https://www.linkedin.com/in/bezamariam-d/', blurb: 'Cultivating a high-performance culture and empowering the people who drive the vision.' },
  { initials: 'YM', name: 'Yismaw Mulaw', role: 'IT Admin / Cyber-Specialist', img: '/images/teams/Yismaw.jpg', linkedin: 'https://www.linkedin.com/in/yismaw-mulaw-285016188/', blurb: 'Defending the digital frontier and ensuring the integrity of every byte.' },
  { initials: 'KY', name: 'Kalkidan Yilkal T.', role: 'Business Process Manager', img: '/images/teams/Kalkidan.jpg', linkedin: 'https://www.linkedin.com/in/kalkidan-yilkal-t-613a76283/', blurb: 'Unlocking operational potential and engineering sustainable growth pathways.' },
  { initials: 'MH', name: 'Mikiyas Hailegebreal', role: 'Automation Engineer', img: '/images/teams/Mikiyas.jpg', linkedin: 'https://www.linkedin.com/in/mikiyas-hailegebreal-019487350', blurb: 'Automating the workflows and integrations that keep our delivery fast, consistent, and audit-ready.' },
  { initials: 'ST', name: 'Solomon Tadesse', role: 'Full Stack Developer', img: '/images/teams/Solomon.jpg', linkedin: 'https://www.linkedin.com/in/solomon-tadesse-fikre', blurb: 'Building and shipping the tools and platforms that power the Rem Assist experience end to end.' },
  { initials: 'EL', name: 'Ermias Lemma', role: 'BDR Lead', img: '/images/teams/Ermias.jpg', linkedin: 'https://www.linkedin.com/in/ermias-lemma-4a9a65376', blurb: 'Turning outreach and discovery into measurable pipeline growth and qualified meetings.' },
];

const ADVANCE_MS = 3200;
const HOLD_MS = 8000;

export default function TeamRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const resumeAt = useRef(0);
  /* Written to directly, not held in state — onScroll fires for every frame of
     a drag, and re-rendering nine cards with their images to move one inline
     width is work nothing asked for. Mirrors components/services/useRail.ts. */
  const progressRef = useRef<HTMLSpanElement>(null);

  /** One card plus the gap — measured, since the card width is responsive. */
  const step = useCallback(() => {
    const el = railRef.current;
    return (el?.querySelector('article')?.getBoundingClientRect().width || 320) + 24;
  }, []);

  const hold = useCallback(() => {
    resumeAt.current = performance.now() + HOLD_MS;
  }, []);

  function onScroll() {
    const el = railRef.current;
    const bar = progressRef.current;
    if (!el || !bar) return;
    const max = el.scrollWidth - el.clientWidth;
    const pct = max > 0 ? Math.max(8, Math.min(100, (el.scrollLeft / max) * 100)) : 8;
    bar.style.width = `${pct}%`;
  }

  function nudge(dir: -1 | 1) {
    const el = railRef.current;
    if (!el) return;
    hold();
    el.scrollBy({ left: dir * step(), behavior: 'smooth' });
  }

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let hovered = false;
    let onScreen = false;

    const tick = () => {
      if (hovered || document.hidden || !onScreen) return;
      if (performance.now() < resumeAt.current) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const s = step();
      // within one step of the end → wrap back round to the first card
      const left = el.scrollLeft + s >= max - 4 ? 0 : el.scrollLeft + s;
      el.scrollTo({ left, behavior: 'smooth' });
    };
    const timer = setInterval(tick, ADVANCE_MS);

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
  }, [hold, step]);

  return (
    // id is a redirect target: the legacy /inspirations/ page was
    // "our team section", and lib/redirects.ts sends it to /#team.
    <section className={styles.section} id="team">
      <div className={styles.wrap}>
        <span className={shared.eyebrow}>Our team</span>
        <div className={shared.head}>
          <h2 className={shared.title}>Meet the minds<br />behind <span>Rem Assist</span></h2>
          <div className={shared.aside}>
            <p className={shared.desc}>
              Our work is powered by a team that values quality, creativity, and collaboration in
              everything we do.
            </p>
          </div>
        </div>

        <div className={styles.rail} ref={railRef} onScroll={onScroll}>
          {TEAM.map((m) => (
            <article className={styles.card} key={m.name}>
              <div className={styles.photo}>
                <span className={styles.initials} aria-hidden="true">{m.initials}</span>
                {m.img && (
                  /* The source photos are 1024x1024 (~450KB) rendered in a
                     320px card. `fill` + `sizes` lets next/image serve a
                     card-sized AVIF/WebP instead of the original JPEG. */
                  <Image src={m.img} alt={m.name} fill sizes="320px" style={{ objectFit: 'cover' }} />
                )}
              </div>
              <div className={styles.meta}>
                <div>
                  <h3 className={styles.name}>{m.name}</h3>
                  <p className={styles.role}>{m.role}</p>
                </div>
                {m.linkedin && (
                  <a className={styles.linkedin} href={m.linkedin} target="_blank" rel="noopener" aria-label={`${m.name} on LinkedIn`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12M7.12 20.45H3.56V9h3.56zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0" /></svg>
                  </a>
                )}
              </div>
              <div className={styles.blurbWrap}>
                <p className={styles.blurb}>{m.blurb}</p>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.controls}>
          <div className={styles.progress}>
            <span className={styles.progressFill} ref={progressRef} style={{ width: '8%' }} />
          </div>
          <button type="button" className={styles.arrow} onClick={() => nudge(-1)} aria-label="Scroll team left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M19 12H5m6 6-6-6 6-6" /></svg>
          </button>
          <button type="button" className={styles.arrow} onClick={() => nudge(1)} aria-label="Scroll team right">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
}
