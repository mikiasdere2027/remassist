'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import HomeTrustBar from './HomeTrustBar';
import styles from './HomeHero.module.css';

/**
 * HomeHero — the interactive hero from index.html (Phase 02).
 *
 * Structure mirrors the artboard exactly, because the layout depends on it:
 *   .visual  → positioning parent for the video disc and the sound pill
 *     .stage → 540px flex box, lifted above both so the hover cards paint
 *       .orbit → the 500px circle the chips are positioned INSIDE (their
 *                left/top offsets are measured from this box, not the stage)
 *   HomeTrustBar → the trust strip is the hero's second flex child in the
 *                  artboard, so hero + strip together fill one viewport.
 *
 * The DCLogic behaviour ported here: autoplay the muted hero video (pausing it
 * when it scrolls out of view), toggle sound, play/pause on click, and reveal a
 * chip's tip card on hover while the orbit float freezes.
 */

const BOOK = 'https://calendly.com/j-zemene-remassistance/new-meeting';
const VIDEO = '/uploads/20260521_174353000_iOS.MP4';

/* Offsets and delays are the artboard's, relative to the 500x500 orbit box.
   `pop` mirrors the dc-hero-pop--right / --up modifiers: chips near the right
   edge anchor their card to the right, and the top-right chip opens upward, so
   neither card gets clipped by the hero. */
const CHIPS = [
  {
    top: 10, left: 10, delay: '0s', pop: '',
    label: 'Watch Customer Service',
    tipTitle: 'Hear what Customer Service is',
    tip: 'Meet our CS agents and see how 24/7 voice, chat, and email coverage runs day to day.',
  },
  {
    top: 380, left: 390, delay: '1.6s', pop: 'right',
    label: 'Watch GTM Teams',
    tipTitle: 'Hear what GTM Teams are',
    tip: 'Inside a GTM pod — outbound, marketing ops, and CRM admin working as one unit.',
  },
  {
    top: 360, left: -40, delay: '2.4s', pop: '',
    label: 'Watch SDR explainer',
    tipTitle: 'Hear what SDR as a Service is',
    tip: 'From list building to booked meetings — the full outbound engine, end to end.',
  },
  {
    top: 20, left: 380, delay: '0.8s', pop: 'up-right',
    label: 'Watch Extra Services',
    tipTitle: 'Hear what Extra Services are',
    tip: 'IT helpdesk, AI automations, and back-office support — the rest of the bench at work.',
  },
];

const WORDS = ['Customer Service', 'Go-to-Market', 'Outbound Sales', 'IT Staff', 'Back Office', 'Specialized Roles'];

function popClass(pop: string) {
  if (pop === 'right') return `${styles.pop} ${styles.popRight}`;
  if (pop === 'up-right') return `${styles.pop} ${styles.popUp} ${styles.popRight}`;
  return styles.pop;
}

export default function HomeHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [hover, setHover] = useState(-1);

  /* React does not reliably render the `muted` attribute, and autoplay is
     rejected without it — so mute, loop and start the video from here. The
     observer mirrors the artboard: off screen the video mutes and pauses, back
     on screen it resumes unless the visitor paused it deliberately.
     
     The file is 9.1 MB for 108 seconds, and it autoplays on the busiest page
     on the site. Two groups never get that download: anyone who asked for
     reduced motion, and anyone on a metered or slow connection. They get the
     poster frame and the play button, which is the same control everyone else
     already has. */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Chromium-only, and deliberately not typed by lib.dom — absence means
    // "no signal", which is treated as a normal connection.
    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    const frugal = Boolean(conn?.saveData) || /^(slow-)?2g$/.test(conn?.effectiveType ?? '');

    if (reduced || frugal) {
      v.preload = 'none';
      setPaused(true);
      return;                       // no observer either: nothing is playing
    }

    void v.play().catch(() => {});
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            v.muted = true;
            v.pause();
            setSoundOn(false);
          } else {
            setPaused((wasPaused) => {
              if (!wasPaused) void v.play().catch(() => {});
              return wasPaused;
            });
          }
        });
      },
      { threshold: 0.1 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  function toggleVideo() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { void v.play().catch(() => {}); setPaused(false); }
    else { v.pause(); setPaused(true); }
  }

  function toggleSound() {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted) { v.muted = false; v.volume = 1; setSoundOn(true); }
    else { v.muted = true; setSoundOn(false); }
  }

  return (
    <section className={styles.hero}>
      <div className={styles.grid}>
        <div>
          <div className={styles.eyebrow}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 20v-1.8a3.7 3.7 0 0 0-3.7-3.7H6.7A3.7 3.7 0 0 0 3 18.2V20"></path><circle cx="9.5" cy="7.5" r="3.6"></circle><path d="M21 20v-1.8a3.7 3.7 0 0 0-2.8-3.6"></path><path d="M15.5 4.1a3.7 3.7 0 0 1 0 7"></path></svg>
            <span className={styles.eyebrowText}>Expert teams. Built around your goals.</span>
          </div>
          <h1 className={styles.h1}>
            Remote Teams for<span className={styles.srOnly}> Specialized Roles</span>
          </h1>
          <div className={styles.rot} aria-hidden="true">
            <div className={styles.rotTrack}>
              {WORDS.map((w) => (
                <span key={w} className={styles.word}>{w}</span>
              ))}
              {/* the first word repeated, so the cycle loops without a jump */}
              <span className={styles.word}>{WORDS[0]}</span>
            </div>
          </div>
          <p className={styles.lead}>
            A hyper-efficient outsourcing team, delivered in pods and <br />built to the exact shape of your operation.
          </p>
          <div className={styles.cta}>
            <a className={styles.ctaPrimary} href={BOOK} target="_blank" rel="noopener">Book a Call</a>
            <a className={styles.ctaGhost} href="/pricing">See pricing</a>
          </div>
        </div>

        {/* Circular video with orbiting tool chips */}
        <div className={styles.visual}>
          <div className={styles.stage}>
            <div className={styles.orbit}>
              <div className={styles.orbitRing} aria-hidden="true" />

              {CHIPS.map((c, i) => (
                <div
                  key={c.label}
                  className={styles.chip}
                  /* hover lives on the wrapper, not the card, so the tip stays
                     open while the pointer travels down onto it */
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(-1)}
                  style={{
                    top: c.top,
                    left: c.left,
                    '--chip-delay': c.delay,
                    '--chip-play': hover === -1 ? 'running' : 'paused',
                  } as CSSProperties}
                >
                  <a className={styles.chipCard} href={BOOK} target="_blank" rel="noopener">
                    <span className={styles.chipPlay}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z"></path></svg></span>
                    <span className={styles.chipLabel}>{c.label}</span>
                  </a>
                  {hover === i && (
                    <div className={popClass(c.pop)}>
                      <div className={styles.popT}>{c.tipTitle}</div>
                      <p className={styles.popB}>{c.tip}</p>
                      <div className={styles.popRow}>
                        <a className={styles.popBtn} href={BOOK} target="_blank" rel="noopener">Click to play</a>
                        <span className={styles.popWave} aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.disc}>
            <video ref={videoRef} src={VIDEO} loop muted playsInline />
            <button type="button" className={styles.playBtn} aria-label="Play or pause video" onClick={toggleVideo}>
              <span className={styles.playDisc}>
                {paused ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--brand-navy)" stroke="none" style={{ marginLeft: 3 }}><path d="M7 4.5v15l13-7.5-13-7.5Z"></path></svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--brand-navy)" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>
                )}
              </span>
            </button>
          </div>

          {/* The icon shows the ACTION, not the state: muted offers "turn sound
              on", unmuted offers "mute" — same as the artboard. */}
          <button type="button" className={styles.sound} onClick={toggleSound} aria-pressed={soundOn}>
            <span className={styles.soundIcon}>
              <span className={styles.soundRing} aria-hidden="true"></span>
              {soundOn ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"></path><path d="M16 9a4 4 0 0 1 0 6"></path><path d="M19 6.5a8 8 0 0 1 0 11"></path></svg>
              )}
            </span>
            <span className={styles.soundLabel}>{soundOn ? 'Mute sound' : 'Click for sound'}</span>
          </button>
        </div>
      </div>

      {/* Trust strip — part of the hero, so the two together are one screen */}
      <HomeTrustBar />
    </section>
  );
}
