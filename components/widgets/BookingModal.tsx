'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './BookingModal.module.css';

/**
 * "Book a Call" modal — ported from assets/booking-modal.js (Phase 02).
 * Intercepts any click on a calendly.com link and opens a branded in-page
 * scheduler dialog instead of navigating away. Progressive enhancement: the
 * anchors keep their real href + target="_blank", so without JS (or on a
 * modified click) they open Calendly natively. The legacy script is untouched.
 */
const CALENDLY_URL = 'https://calendly.com/j-zemene-remassistance/new-meeting';
const HOST_NAME = 'Johnathan Zemene (ASSIST)';
const EVENT_NAME = 'Rem - Outsourced teams (review & plan)';
const HIDE_DETAILS = true;

/* The Rem mark from assets/booking-modal.js, drawn stroke-first behind the
   brand panel. pathLength="1" normalises every path to the same dash length
   so the four strokes draw in step rather than at their own rates. */
const MARK_PATHS = [
  'M173.5,13c7.6,0,15.2,0.6,22.7,2.1s9.7,3,9.4,8.3c-0.7,11.1-17.9,4.8-24.5,4.5C92.4,23.7,19.9,92.7,25.6,182.5 c0.5,8.8,4.8,20.8,5,28.1c0.1,4.5-3.7,8.5-8.3,8.1C12.2,217.9,9,176.9,10.6,157c5.6-64.1,55.2-121.9,117-138.5l15-3.1 c8-1.6,16.1-2.4,24.2-2.4H173.5L173.5,13z',
  'M236.8,178.8c-2.4-2.1-2.5-6-3.3-9.3c-1-5.1-1.9-11.2-3-15.7c-1.9-7.6-5.9-15-10.6-21.1 c-27.7-36.1-88.8-29.6-107.4,12c-26.3,58.8,33.1,108.4,87.1,116.6c5.8,1.3,10.4-2.8,16-3.7c6.1-0.9,10.5-0.1,16.3,0.2 c12.5,0.2,18.1,13.1,10.9,22.8c-3.7,4.5-10.2,5.1-15.6,5.4c-14.1,0.7-15.8,0.2-26.2-7.3s-12.7-2.7-18.7-4.2 c-53-12.9-106.3-62.7-90.7-121.3c21.1-87.8,150.3-76.8,159.1,11.9c0.4,4.2,0.5,7.8-1.6,11C246.7,180.1,240.5,181.8,236.8,178.8 L236.8,178.8z',
  'M155.4,37.3c24.2-2,47.4,1.1,69.6,10.8c7,3.1,24,9.6,19.4,19.1c-5.5,11.3-19.1-0.4-26.8-3.7 C121,22,22.6,115.5,58.9,214.2c2.1,5.6,10.5,19.6,10.8,23.3c0.5,7.1-5.1,11.5-11.8,8.7c-7.5-3.1-18-33.7-20-42 C19.5,125.9,74.3,44.2,155.4,37.3z',
  'M280.6,183c0.3-168-232.1-148.7-218.9-1.6c1.6,18.3,7.7,36,17.5,51.6c13.2,21,27.5,40.1,13.6,69.6 c-3.1,6.6-16.3,19.3-3.9,24.6c6.9,3,11.7-4.5,14.9-9.5c10.3-17,12.2-38.1,7.5-57.6c-2.5-10.4-7.2-20.1-13.2-28.9 c-28.8-42-26.6-78.7,2.1-119.5c44.6-53.5,133.9-36.6,156.7,28.5c6.9,19.7,3.8,37.2,11.2,56.8c2.2,5.8,15.6,30.7,14.4,34.4 c-0.8,2.3-12.2,2.9-15.6,4.4c-16.9,7.4-5.4,41.2-15.3,54.7c-5.9,8-18,4.7-26.5,5.5c-26.6,2.7-46.2,34.5-52.5,58 c-1.9,4.7-2.8,13.6,4,15.3c12.6,1.6,12.4-15.8,16.8-24c27-51.4,39.3-20.9,66.7-39.3c16.5-12.3,11.9-45.8,14.6-54.9 c29.3-3,27.8-18.4,20.8-35.3C291.4,206,280.7,183.2,280.6,183L280.6,183z',
];

const EMBED = `${CALENDLY_URL}?hide_event_type_details=${HIDE_DETAILS ? '1' : '0'}`;

/** Route the site uses for its Calendly links (the one we intercept). */
function isCalendly(href: string | null | undefined): boolean {
  if (!href) return false;
  try {
    const host = new URL(href, window.location.origin).hostname;
    return /(^|\.)calendly\.com$/i.test(host);
  } catch {
    return false;
  }
}

export default function BookingModal() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const lastFocus = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: globalThis.MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const a = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || !isCalendly(a.href)) return;
      e.preventDefault();
      lastFocus.current = document.activeElement as HTMLElement | null;
      setLoaded(false);
      setOpen(true);
      /* The overlay mounts with opacity:0; flip it to visible on the next frame
         so the fade-in transition actually runs (legacy booking-modal.js did the
         same via classList.add('is-visible') in a requestAnimationFrame). */
      window.requestAnimationFrame(() => setVisible(true));
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { doClose(); } };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open]);

  function doClose() {
    setVisible(false);
    window.setTimeout(() => setOpen(false), 280);
    lastFocus.current?.focus?.({ preventScroll: true });
  }

  return (
    <>
      {open && (
        <div className={`${styles.overlay} ${visible ? styles.visible : ''}`} role="dialog" aria-modal="true" aria-label={EVENT_NAME}>
          <div className={styles.backdrop} onMouseDown={doClose} />
          <div className={styles.dialog} ref={dialogRef}>
            <aside className={styles.brand}>
              <svg className={styles.mark} viewBox="0 0 311.2 382" aria-hidden="true" focusable="false">
                {MARK_PATHS.map((d) => <path key={d.slice(0, 24)} pathLength={1} d={d} />)}
              </svg>
              <img src="/images/rem-logo.svg" alt="Rem Assist" className={styles.logo} />
              <div className={styles.divider} />
              <span className={styles.host}>{HOST_NAME}</span>
              <span className={styles.event}>{EVENT_NAME}</span>
              <div className={styles.isoRow}>
                {[
                  { src: '/images/ISO_9001-2015.svg', top: 'Certified', bottom: 'ISO 9001:2015' },
                  { src: '/images/ISO_27001-2022.svg', top: 'Certified', bottom: 'ISO 27001:2022' },
                ].map((c) => (
                  <span className={styles.iso} key={c.bottom}>
                    <span className={styles.isoTop}>{c.top}</span>
                    <img src={c.src} alt={c.bottom} />
                    <span className={styles.isoBot}>{c.bottom}</span>
                  </span>
                ))}
              </div>
            </aside>
            <div className={styles.body}>
              {!loaded && (
                <div className={styles.spin} aria-live="polite">
                  <i />
                  <span>Loading available times…</span>
                </div>
              )}
              <iframe
                onLoad={() => setLoaded(true)}
                src={EMBED}
                title={EVENT_NAME}
                allow="camera; microphone; fullscreen"
                className={styles.frame}
              />
            </div>
            {/* Same glyph as the fit-finder modal's close, not a stroked SVG. */}
            <button type="button" className={styles.close} aria-label="Close booking dialog" onClick={doClose}>
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}