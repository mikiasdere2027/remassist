'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import HomeTrustBar from './HomeTrustBar';
import { track } from '@/lib/analytics/events';
import { hasConsent, onConsentChange } from '@/lib/analytics/consent';
import styles from './HomeHero.module.css';

/**
 * HomeHero — one full-bleed cover: the RemAssist film playing behind the copy.
 *
 * Replaces the circular video disc and its four orbiting chips. That
 * composition put the clip in a 420px circle on the right and needed a 500px
 * orbit at hard pixel offsets to hold the chips, which is why it carried three
 * breakpoints of scale() just to survive a narrow window. A cover has no such
 * geometry — the frame is whatever the section is.
 *
 * WHAT IS GONE, so it is not rediscovered as a regression: the chips, their
 * hover cards and the orbit ring. The chips carried
 * `data-book-placement="home_hero_chip"` and the cards `home_hero_pop`; both
 * placements stop reporting from this page. `home_hero` on the primary CTA is
 * unchanged.
 *
 * THE CLIP IS THIRD-PARTY AND WAITS FOR CONSENT. It is a YouTube embed, which
 * is a `marketing` vendor — see the CONSENT_VERSION note in
 * lib/analytics/consent.ts, bumped to 2 for exactly this. So:
 *
 *   consent granted  → the iframe mounts and autoplays, muted and looping
 *   no consent yet   → the poster only, and a button that mounts it on a click
 *
 * This was briefly a self-hosted file, which needs no consent and therefore
 * autoplays for every visitor. That is the one thing an embed cannot do, and
 * the trade was made deliberately. If the pre-consent poster is ever judged
 * unacceptable, the answer is to go back to hosting the file — not to mount
 * this without consent.
 *
 * Nothing reaches youtube-nocookie.com until one of those two happens. The
 * poster is a local still (public/images/home/hero-cover.jpg), not the
 * i.ytimg.com thumbnail, so the default state makes no third-party request at
 * all — a hotlinked thumbnail would have leaked every visitor's IP to Google
 * before they had answered the banner, which is the thing the banner is for.
 */

const BOOK = 'https://calendly.com/j-zemene-remassistance/new-meeting';

/**
 * Two cuts of the same film, because one aspect ratio cannot serve both.
 *
 * The hero box on a phone is roughly 360x780 — a 0.46 ratio. Covering that
 * with the 16:9 master means scaling it to 1387px wide and showing 360 of
 * them: 73% of the frame is thrown away and the subject ends up cropped
 * against the right edge, behind the headline. No `object-position` saves it;
 * there is no phone-shaped crop of a landscape frame that keeps a centred
 * subject. So phones get a 9:16 cut instead, framed for portrait.
 *
 * youtu.be/0c3z3iVUrEg — "RemAssist", 16:9
 * youtu.be/nkkFr-ewo5Y — "RemAssit Mobile", 9:16
 */
const VIDEO_ID = '0c3z3iVUrEg';
const VIDEO_ID_MOBILE = 'nkkFr-ewo5Y';
const POSTER = '/images/home/hero-cover.jpg';
const POSTER_MOBILE = '/images/home/hero-cover-mobile.jpg';
const YT_ORIGIN = 'https://www.youtube-nocookie.com';
/** Kept in step with the breakpoint the stylesheet switches the poster on. */
const MOBILE_QUERY = '(max-width: 768px)';

const WORDS = ['Customer Service', 'Go-to-Market', 'Outbound Sales', 'IT Staff', 'Back Office', 'Specialized Roles'];

/**
 * `loop` is ignored on a single video unless `playlist` names that same video
 * — a documented quirk of the embed, and the reason a background clip that
 * "stops after one play" is almost always missing this parameter.
 *
 * `enablejsapi` is what makes a sound control possible at all: an iframe's
 * audio cannot be reached from the parent page, so the button below talks to
 * the player over postMessage. That is also why this does NOT pull in
 * YouTube's iframe_api script — the same two commands, without another 100 KB
 * of third-party JavaScript on the site's busiest page.
 */
function embedSrc(id: string): string {
  const params = new URLSearchParams({
    /* Required alongside enablejsapi: the player checks that commands come
       from the origin named here, and silently ignores them otherwise. Read
       at call time because this differs between localhost and production, and
       the iframe only ever mounts client-side. */
    origin: window.location.origin,
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: id,
    controls: '0',
    disablekb: '1',
    fs: '0',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    iv_load_policy: '3',
    enablejsapi: '1',
  });
  return `${YT_ORIGIN}/embed/${id}?${params.toString()}`;
}

/* The sound hint: when it appears after the film starts, and for how long. */
const HINT_KEY = 'ra_sound_hint';
const HINT_DELAY_MS = 1_800;
const HINT_SHOW_MS = 8_000;

export default function HomeHero() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [playing, setPlaying] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  /* Whether the cover is on screen. The control is docked to the viewport, so
     without this it would hang over every section of the page. */
  const [inView, setInView] = useState(true);
  /* The "tap for sound" bubble beside the sound button. The film autoplays
     muted, and a bare speaker icon does not say there is anything to hear. */
  const [hint, setHint] = useState(false);
  /* Which cut to embed. Starts false and is corrected on mount rather than
     guessed during render: the server has no viewport, and a guess that
     disagrees with the client is a hydration mismatch. Only the iframe reads
     this — the poster switches in CSS, so the correct still paints on the
     first frame instead of waiting for JavaScript. */
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const start = useCallback(() => {
    setPlaying(true);
    track('video_play', { video_id: isMobile ? VIDEO_ID_MOBILE : VIDEO_ID });
  }, [isMobile]);

  /* Autoplay is the consented path only. Reduced motion opts out of it too —
     a looping cover is exactly the kind of continuous background movement that
     setting asks us to stop — but the click-to-play button stays, so the
     choice is still the visitor's rather than taken away from them. */
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    const frugal = Boolean(conn?.saveData) || /^(slow-)?2g$/.test(conn?.effectiveType ?? '');
    if (reduced || frugal) return;

    if (hasConsent('marketing')) {
      setPlaying(true);
      return;
    }
    /* Answered later in the session: mount then, without a reload. */
    return onConsentChange((state) => {
      if (state.marketing) setPlaying(true);
    });
  }, []);

  /** One player command, addressed to the embed's own origin and no other. */
  const command = useCallback((func: 'mute' | 'unMute' | 'playVideo' | 'pauseVideo') => {
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      YT_ORIGIN,
    );
  }, []);

  /* Follow the cover in and out of view.

     Hiding the control is only half of it: a hidden control over a clip that
     is still playing is worse than no control, because the sound carries on
     down the page with nothing to stop it. So leaving the viewport mutes and
     pauses too, and coming back resumes — muted. Sound is not restored on the
     way back: returning to a page and having it start talking at you is the
     behaviour the mute button exists to prevent. */
  useEffect(() => {
    const el = heroRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setInView(visible);
        if (!visible) {
          command('mute');
          command('pauseVideo');
          setSoundOn(false);
        } else if (playing) {
          command('playVideo');
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [command, playing]);

  /* Offer sound once, shortly after the muted film starts: long enough in
     that the page has settled, gone again before it becomes furniture. Once
     per visit — sessionStorage, wrapped because it throws in some private
     modes — so it never nags on every page view. */
  useEffect(() => {
    if (!playing || soundOn || !inView) {
      setHint(false);
      return;
    }
    try {
      if (sessionStorage.getItem(HINT_KEY)) return;
    } catch { /* storage blocked: show it, just not remembered */ }
    const show = setTimeout(() => {
      setHint(true);
      try { sessionStorage.setItem(HINT_KEY, '1'); } catch { /* see above */ }
    }, HINT_DELAY_MS);
    const hide = setTimeout(() => setHint(false), HINT_DELAY_MS + HINT_SHOW_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [playing, soundOn, inView]);

  /* The icon shows the ACTION, not the state: muted offers "turn sound on",
     unmuted offers "mute". Browsers only let audio begin from a real gesture,
     which is exactly what this handler is.
     
     `playVideo` after `unMute` is not belt and braces — it is required. The
     browser's autoplay policy permits a MUTED clip to play unasked; the moment
     it is unmuted that permission lapses and the player is stopped. YouTube
     then paints its paused chrome over the hero — the channel title card, a
     red play button in the middle of the frame, and "Watch on YouTube" — which
     is the whole cover ruined by pressing the sound button. Asking it to
     resume in the same gesture is what keeps it playing and that chrome away.
     Verified against the player's own state reports, which is the only way to
     see any of this: the iframe is cross-origin and tells us nothing else. */
  function toggleSound() {
    if (soundOn) {
      command('mute');
      setSoundOn(false);
    } else {
      command('unMute');
      command('playVideo');
      setSoundOn(true);
      track('video_unmute', { video_id: isMobile ? VIDEO_ID_MOBILE : VIDEO_ID });
    }
  }

  return (
    /* data-hero is the header's hook, not a style: it is what lets the
       mobile header go transparent over this section without knowing
       which route it is on. See Header.module.css. */
    <section ref={heroRef} className={styles.hero} data-hero="dark">
      <div className={styles.bg} aria-hidden="true">
        {/* The LCP element. `priority` because it is the largest thing above
            the fold and the one paint that must not wait on the embed. Both
            are rendered and CSS hides one: picking in JavaScript would leave
            the wrong crop on screen until hydration, which on a phone is the
            landscape still this whole change exists to get rid of. */}
        <Image
          className={`${styles.poster} ${styles.posterWide}`}
          src={POSTER}
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <Image
          className={`${styles.poster} ${styles.posterTall}`}
          src={POSTER_MOBILE}
          alt=""
          fill
          priority
          sizes="100vw"
        />
        {playing && (
          <iframe
            ref={frameRef}
            className={`${styles.frame} ${isMobile ? styles.frameTall : ''}`}
            src={embedSrc(isMobile ? VIDEO_ID_MOBILE : VIDEO_ID)}
            title="RemAssist"
            tabIndex={-1}
            allow="autoplay; encrypted-media; picture-in-picture"
          />
        )}
      </div>

      {/* Navy on the left where the words are, clearing towards the right so
          the subject stays visible. Without it the headline sits on whatever
          frame happens to be playing, and contrast becomes a matter of luck. */}
      <div className={styles.wash} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.copy}>
          <div className={styles.eyebrow}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 20v-1.8a3.7 3.7 0 0 0-3.7-3.7H6.7A3.7 3.7 0 0 0 3 18.2V20"></path><circle cx="9.5" cy="7.5" r="3.6"></circle><path d="M21 20v-1.8a3.7 3.7 0 0 0-2.8-3.6"></path><path d="M15.5 4.1a3.7 3.7 0 0 1 0 7"></path></svg>
            <span className={styles.eyebrowText}>Fully Managed</span>
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
            <a className={styles.ctaPrimary} data-book-placement="home_hero" href={BOOK} target="_blank" rel="noopener">Book a Call</a>
            <a className={styles.ctaGhost} href="/pricing">See pricing</a>
          </div>
        </div>

      </div>

      {/* Docked above the Ask RemAssist launcher rather than parked in the
          hero's corner, because it is `position: fixed`: the embed keeps
          playing when the hero scrolls away, so a control scoped to the hero
          would leave audio running with no way to stop it. Icon only — the
          accessible name carries the meaning, and a labelled pill next to a
          62px circle reads as two unrelated things. */}
      <div className={`${styles.controls} ${inView ? "" : styles.controlsOut}`}>
        {hint && (
          <div className={styles.hint} role="status">
            {/* The bubble is a second way to press the button, not a label for it:
                tapping it is a real gesture, which is what the browser needs
                before it will let the film make sound. */}
            <button type="button" className={styles.hintBody} onClick={toggleSound}>
              <strong>Tap to hear the film</strong>
              <span>It’s playing on mute. Turn the sound on to listen.</span>
            </button>
            <button
              type="button"
              className={styles.hintClose}
              onClick={() => setHint(false)}
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        )}
        {!playing ? (
          <button
            type="button"
            className={styles.ctrl}
            onClick={start}
            aria-label="Play the film"
            title="Play the film"
          >
            <span className={styles.ctrlFace}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5-13-7.5Z" /></svg>
            </span>
          </button>
        ) : (
          <button
            type="button"
            className={styles.ctrl}
            onClick={toggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute the film' : 'Turn on sound'}
            title={soundOn ? 'Mute the film' : 'Turn on sound'}
          >
            <span className={styles.ctrlFace}>
              {soundOn ? (
                <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" /><line x1="22" y1="9" x2="16" y2="15" /><line x1="16" y1="9" x2="22" y2="15" /></svg>
              ) : (
                <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M16 9a4 4 0 0 1 0 6" /><path d="M19 6.5a8 8 0 0 1 0 11" /></svg>
              )}
            </span>
          </button>
        )}
      </div>

      {/* Trust strip — part of the hero, so the two together are one screen */}
      <HomeTrustBar />
    </section>
  );
}
