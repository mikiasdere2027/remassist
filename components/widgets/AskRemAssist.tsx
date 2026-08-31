'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { track } from '@/lib/analytics/events';
import styles from './AskRemAssist.module.css';

/**
 * "Ask RemAssist" — the launcher and proactive teaser tooltip.
 *
 * This component mounts in the root layout, so whatever it imports is parsed
 * on every route in the site. The chat panel is dynamically imported on first open
 * to keep the root bundle lean.
 *
 * Teaser cycle (mirrors the original ask-remassist.js behaviour):
 *   - Appears 5 s after page load
 *   - Auto-hides after 9 s
 *   - Repeats every 5 minutes
 *   - Stops cycling once the visitor opens the chat or dismisses with ×
 */
const AskRemAssistPanel = dynamic(() => import('./AskRemAssistPanel'), { ssr: false });

const AVATAR = '/images/rem-loader-logo.svg';

/** How long the teaser stays visible before auto-hiding (ms) */
const SHOW_DURATION = 9_000;
/** First appearance delay after page load (ms) */
const INITIAL_DELAY = 5_000;
/** Interval between each teaser pulse (ms) */
const REPEAT_INTERVAL = 5 * 60_000;

export default function AskRemAssist() {
  const [open, setOpen] = useState(false);
  const [teaserVisible, setTeaserVisible] = useState(false);
  /* When true the teaser cycle has been permanently stopped (user opened or ×-dismissed) */
  const stopped = useRef(false);

  useEffect(() => {
    /** Show the teaser for SHOW_DURATION, then hide it. */
    function pulse() {
      if (stopped.current) return;
      setTeaserVisible(true);
      setTimeout(() => {
        if (!stopped.current) setTeaserVisible(false);
      }, SHOW_DURATION);
    }

    /* First pulse */
    const firstTimer = setTimeout(pulse, INITIAL_DELAY);

    /* Repeat every REPEAT_INTERVAL — setInterval fires repeatedly */
    const repeatTimer = setInterval(pulse, INITIAL_DELAY + REPEAT_INTERVAL);

    return () => {
      clearTimeout(firstTimer);
      clearInterval(repeatTimer);
    };
  }, []);

  function openChat(placement = 'launcher') {
    stopped.current = true;
    setTeaserVisible(false);
    setOpen(true);
    track('chat_open', { placement });
  }

  function dismissTeaser(e: React.MouseEvent) {
    e.stopPropagation();
    stopped.current = true;
    setTeaserVisible(false);
  }

  return (
    <div className={styles.root}>
      {open && <AskRemAssistPanel onClose={() => setOpen(false)} />}

      {!open && teaserVisible && (
        <div
          className={`${styles.teaser} ${styles.teaserShown}`}
          onClick={() => openChat('teaser')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openChat('teaser');
            }
          }}
          aria-label="Questions about our teams or pricing? Ask me."
        >
          <span className={styles.teaserText}>
            Questions about our teams or pricing? <strong>Ask me.</strong>
          </span>
          <button
            type="button"
            className={styles.teaserClose}
            onClick={dismissTeaser}
            aria-label="Dismiss message"
          >
            &times;
          </button>
        </div>
      )}

      <button
        type="button"
        className={`${styles.launcher} ${open ? styles.launcherHidden : ''}`}
        onClick={() => openChat('launcher')}
        aria-label="Ask RemAssist — open chat"
        aria-expanded={open}
        tabIndex={open ? -1 : 0}
      >
        <span className={styles.launcherPing} aria-hidden="true" />
        <span className={styles.launcherFace}>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG source. next/image needs the dangerouslyAllowSVG flag to touch one, and has nothing to optimise in a vector: no resize, no format conversion. */}
          <img src={AVATAR} alt="" />
        </span>
        <span className={styles.launcherDot} aria-hidden="true" />
      </button>
    </div>
  );
}
