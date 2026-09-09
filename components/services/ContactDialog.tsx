'use client';

import { useEffect, useRef, useState } from 'react';
import ContactRailForm from './ContactRailForm';
import styles from './ContactRail.module.css';

/**
 * The contact dialog opened from the "Let's Talk" banner.
 *
 * Left: the pitch — what the visitor gets for filling this in. Right: the
 * brief itself. This is the split card that used to sit inline in the band,
 * moved behind the CTA unchanged in substance.
 *
 * Modelled on BookingModalDialog: mounts at opacity 0 and flips on the next
 * frame so the fade actually runs after the chunk lands, and owns the close
 * timing so the fade-out finishes before the parent unmounts us.
 */

/** Matches the fade-out in ContactRail.module.css. */
const FADE_MS = 280;

const POINTS = [
  {
    title: 'Tailored to your needs',
    body: 'We understand your goals and recommend the right solution.',
    icon: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    title: 'Expert guidance',
    body: 'Our specialists will help you find the perfect fit.',
    icon: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </>
    ),
  },
  {
    title: 'Quick response',
    body: 'We\u2019ll get back to you within one business day.',
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
  },
];

export default function ContactDialog({ onClose }: { onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const closing = useRef(false);

  /* Mount at opacity 0, then flip on the next frame so the transition runs.
     The timer is not belt-and-braces for its own sake: rAF is suspended
     outright in a backgrounded tab and in some embedded webviews, and there
     the flip would never happen — leaving a dialog that is invisible but still
     holding focus and the body scroll lock, which is worse than one that
     appears without a fade. Whichever lands first wins; setVisible(true)
     twice is a no-op. */
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setVisible(true));
    const timer = window.setTimeout(() => setVisible(true), 60);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  /* Guarded: the backdrop, the close button and Escape can all fire before the
     timer lands, and two overlapping closes would call onClose twice. */
  function doClose() {
    if (closing.current) return;
    closing.current = true;
    setVisible(false);
    window.setTimeout(onClose, FADE_MS);
  }

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') doClose(); };
    document.addEventListener('keydown', esc);
    /* The dialog scrolls itself on short viewports; without this the page
       behind it scrolls too and the visitor loses their place in the brief. */
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Move focus into the panel on open so the keyboard lands inside the dialog
     rather than back at the top of the document. */
  useEffect(() => { panel.current?.focus({ preventScroll: true }); }, []);

  return (
    <div
      className={`${styles.overlay} ${visible ? styles.visible : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Tell us what you need covered"
    >
      <div className={styles.backdrop} onMouseDown={doClose} />

      <div className={styles.dialog} ref={panel} tabIndex={-1}>
        {/* Left: the pitch. No portrait here — the banner that opened this
            dialog is still behind the scrim showing her, and at this panel's
            width a cutout would leave the copy about 200px to wrap in. */}
        <div className={styles.leftCol}>
          <div className={styles.leftContent}>
            <span className={styles.leftEyebrow}>TELL US YOUR NEEDS</span>
            <h2 className={styles.leftHeading}>
              Book the consult,<br />
              or send the brief.
            </h2>
            <div className={styles.accentLine} aria-hidden="true" />

            <div className={styles.pointsList}>
              {POINTS.map((p) => (
                <div className={styles.pointItem} key={p.title}>
                  <div className={styles.pointIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {p.icon}
                    </svg>
                  </div>
                  <div className={styles.pointText}>
                    <strong>{p.title}</strong>
                    <p>{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: the brief */}
        <div className={styles.rightCol}>
          <span className={styles.rightEyebrow}>CONNECT WITH US</span>
          <ContactRailForm />
        </div>

        <button type="button" className={styles.close} aria-label="Close contact form" onClick={doClose}>
          &times;
        </button>
      </div>
    </div>
  );
}
