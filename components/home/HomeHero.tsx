'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import HomeTrustBar from './HomeTrustBar';
import { hasConsent, onConsentChange } from '@/lib/analytics/consent';
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
 * chip's tip card on hover while the orbit float freezes. The clip is now a
 * YouTube embed rather than a self-hosted file, so all four of those run
 * through the player's postMessage API instead of HTMLMediaElement.
 */

const BOOK = 'https://calendly.com/j-zemene-remassistance/new-meeting';
/* The Kalkidan interview, now served by YouTube rather than as the 9.5 MB file
   this repo ships through Git LFS — which is also what made the clip 404 on any
   host that does not resolve LFS. `youtube-nocookie` is the domain that holds
   YouTube's identifiers back until playback actually begins, which is what
   makes the consent gate below worth having rather than decorative. */
const YT_ID = '7zD8nVXq78I';
const YT_ORIGIN = 'https://www.youtube-nocookie.com';
/* The still the rail already uses for this clip. It is painted as the disc's
   ground state and the player covers it, rather than being a fallback that
   swaps in on error — so every case where no video runs degrades to a
   photograph instead of an empty hole. That is not the rare case it sounds
   like: reduced-motion and save-data visitors are never sent the player, and
   neither is anyone who has not accepted cookies. */
const POSTER = '/images/interviews/kalkidan.jpg';

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
  const discRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  /* `armed` is whether the player exists at all. It starts false, so a visitor
     who has not accepted cookies causes no request to YouTube whatsoever — the
     disc is a still photograph until either consent or a deliberate press. */
  const [armed, setArmed] = useState(false);
  const [paused, setPaused] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [hover, setHover] = useState(-1);
  /* Set when the visitor arms the clip from the sound pill rather than the play
     button: the player can only be unmuted once it exists, so the wish is held
     here and replayed against the iframe's load event. */
  const wantSound = useRef(false);

  /* Driving the player without loading Google's iframe_api script. The
     postMessage protocol below is the same one that script wraps, and doing it
     directly keeps a second Google origin — and 60 KB of it — off the page. */
  const command = useCallback((func: string, args: unknown[] = []) => {
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      YT_ORIGIN,
    );
  }, []);

  /* Who gets the player, and when.

     Two groups are never sent it on load: anyone who asked for reduced motion,
     and anyone on a metered or slow connection. Both still get the play button,
     which is the same control everyone else has.

     Everyone else waits on consent. An embed is a third-party vendor that
     writes to the visitor's device, so by the rule the rest of this site
     follows it cannot load before they agree — see lib/analytics/consent.ts.
     Accepting while the hero is still on screen starts it without a reload. */
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Chromium-only, and deliberately not typed by lib.dom — absence means
    // "no signal", which is treated as a normal connection.
    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    const frugal = Boolean(conn?.saveData) || /^(slow-)?2g$/.test(conn?.effectiveType ?? '');
    if (reduced || frugal) return;

    if (hasConsent('marketing')) { setArmed(true); setPaused(false); return; }
    return onConsentChange((state) => {
      if (state.marketing) { setArmed(true); setPaused(false); }
    });
  }, []);

  /* The scroll observer, unchanged in behaviour: off screen the clip mutes and
     pauses, back on screen it resumes unless the visitor paused it deliberately.
     It watches the disc rather than the player, because until the clip is armed
     there is no player to watch. */
  useEffect(() => {
    const disc = discRef.current;
    if (!armed || !disc || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            command('mute');
            command('pauseVideo');
            setSoundOn(false);
          } else {
            setPaused((wasPaused) => {
              if (!wasPaused) command('playVideo');
              return wasPaused;
            });
          }
        });
      },
      { threshold: 0.1 },
    );
    io.observe(disc);
    return () => io.disconnect();
  }, [armed, command]);

  /* Pressing play is itself a request for the clip, so it arms the player even
     when consent is absent — the visitor is asking for this one thing, which is
     the narrow case ePrivacy allows without a prior yes. */
  function toggleVideo() {
    if (!armed) { setArmed(true); setPaused(false); return; }
    if (paused) { command('playVideo'); setPaused(false); }
    else { command('pauseVideo'); setPaused(true); }
  }

  /* soundOn drives the disc's colour as well as the pill's label: the clip is
     greyscale while muted and blooms to colour when the visitor turns sound on
     (see .discLive). That makes it the one bit of colour photography on the
     page, which is the point — it marks the clip as live. */
  function toggleSound() {
    if (!armed) {
      wantSound.current = true;
      setArmed(true); setPaused(false); setSoundOn(true);
      return;
    }
    if (soundOn) { command('mute'); setSoundOn(false); }
    else { command('unMute'); command('setVolume', [100]); setSoundOn(true); }
  }

  /* Commands sent before the player initialises are dropped, so the opening
     state is carried by the src's own parameters and postMessage is only used
     once the frame has loaded. This is the one exception: arming from the sound
     pill has to unmute a player that did not exist when the pill was pressed. */
  function onFrameLoad() {
    if (!wantSound.current) return;
    wantSound.current = false;
    command('unMute');
    command('setVolume', [100]);
  }

  /* A function, not a const: `origin` needs the window, and a client component
     still renders once on the server. Called from inside the `armed` branch, it
     runs only where a player is actually being built — as a const it would be
     evaluated on every render, server included, and throw there.
     `loop` needs `playlist` naming the same video: that is the documented way
     to loop a single clip, not a workaround. */
  function playerSrc() {
    return `${YT_ORIGIN}/embed/${YT_ID}?${new URLSearchParams({
      autoplay: '1', mute: '1', loop: '1', playlist: YT_ID,
      controls: '0', modestbranding: '1', rel: '0', playsinline: '1',
      disablekb: '1', fs: '0', iv_load_policy: '3',
      enablejsapi: '1', origin: window.location.origin,
    })}`;
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

          <div ref={discRef} className={`${styles.disc} ${soundOn ? styles.discLive : ''}`}>
            <div className={styles.media}>
              {/* eslint-disable-next-line @next/next/no-img-element -- the disc
                  is a fixed 420px circle, so next/image would add a layout pass
                  and a srcset for one size that never changes. */}
              <img className={styles.poster} src={POSTER} alt="" aria-hidden="true" />
              {armed && (
                <iframe
                  ref={frameRef}
                  className={styles.frame}
                  src={playerSrc()}
                  title="Kalkidan — team interview"
                  onLoad={onFrameLoad}
                  allow="autoplay; encrypted-media"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              )}
            </div>
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
