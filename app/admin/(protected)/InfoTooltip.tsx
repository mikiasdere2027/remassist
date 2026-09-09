'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from '../admin.module.css';

type Position = 'bottom-left' | 'top-right' | 'top' | 'bottom' | 'left' | 'right';
type Side = 'top' | 'bottom' | 'left' | 'right';

export interface InfoTooltipProps {
  /** Tooltip body text. */
  text: string;
  /** Position relative to the trigger. Default: 'bottom-left'. */
  position?: Position;
  /**
   * Auto-show the tooltip this many ms after the component mounts.
   * Set to 0 or omit to disable.
   */
  autoShowMs?: number;
  /** Optional custom max-width in pixels. */
  maxWidth?: number;
}

/** Gap between trigger and bubble, the bubble's inset past the trigger's near
    edge, the arrow's half-width, and the margin the bubble keeps off screen. */
const OFFSET = 10;
const TAIL_INSET = 12;
const TAIL = 7;
const MARGIN = 8;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/**
 * An ⓘ icon that shows a tooltip on hover, on click/tap, and optionally
 * auto-shows once after `autoShowMs` milliseconds.
 *
 * The bubble is `position: fixed` and placed from the trigger's viewport rect
 * rather than absolutely inside the wrapper. Every panel on this surface sets
 * `overflow: hidden` to keep its 22px corners over a table, which clips any
 * absolutely-positioned child that leaves the panel. Fixed positioning escapes
 * that; the costs are re-measuring on scroll and resize, and doing the clamping
 * a browser would otherwise do for free — a panel head's icon sits near the
 * edge of its panel, so the bubble runs off screen unless it is pulled back,
 * and the arrow then has to travel to stay under the icon.
 *
 * Keyboard-accessible: Enter/Space toggle; Escape dismisses.
 */
export default function InfoTooltip({
  text,
  position = 'bottom-left',
  autoShowMs,
  maxWidth,
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties | null>(null);
  const [side, setSide] = useState<Side>('bottom');
  const ref = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const place = useCallback(() => {
    const el = ref.current;
    const tip = tipRef.current;
    if (!el || !tip) return;
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    /* Which way the bubble grows once its side is chosen: 'bottom-left' and
       'top' keep their right edge by the trigger and run leftward. */
    const alignEnd = position === 'bottom-left' || position === 'top' || position === 'bottom';
    let s: Side =
      position === 'bottom-left' ? 'bottom'
      : position === 'top-right' ? 'top'
      : position;

    /* Flip rather than overflow when the chosen side has no room. */
    if (s === 'top' && r.top - OFFSET - h < MARGIN) s = 'bottom';
    else if (s === 'bottom' && r.bottom + OFFSET + h > vh - MARGIN) s = 'top';
    else if (s === 'left' && r.left - OFFSET - w < MARGIN) s = 'right';
    else if (s === 'right' && r.right + OFFSET + w > vw - MARGIN) s = 'left';

    if (s === 'top' || s === 'bottom') {
      const top = s === 'top' ? r.top - OFFSET - h : r.bottom + OFFSET;
      const wanted = alignEnd ? r.right + TAIL_INSET - w : r.left - TAIL_INSET;
      const left = clamp(wanted, MARGIN, vw - w - MARGIN);
      const tailX = clamp(r.left + r.width / 2 - left - TAIL, TAIL + 3, w - TAIL * 3 - 3);
      setStyle({
        top,
        left,
        '--tail-x': `${tailX}px`,
        ...(maxWidth ? { maxWidth: `${maxWidth}px` } : {}),
      } as React.CSSProperties);
    } else {
      const left = s === 'left' ? r.left - OFFSET - w : r.right + OFFSET;
      const top = clamp(r.top + r.height / 2 - h / 2, MARGIN, vh - h - MARGIN);
      const tailY = clamp(r.top + r.height / 2 - top - TAIL, TAIL + 3, h - TAIL * 3 - 3);
      setStyle({
        top,
        left,
        '--tail-y': `${tailY}px`,
        ...(maxWidth ? { maxWidth: `${maxWidth}px` } : {}),
      } as React.CSSProperties);
    }
    setSide(s);
  }, [position, maxWidth]);

  /* Measured off the rendered bubble, so the first paint is the hidden one the
     `style === null` branch renders — never a visible jump from 0,0. */
  useLayoutEffect(() => {
    if (!open) return;
    place();
    /* Capture phase so a scroll in any ancestor re-places it, not just window. */
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  /* Auto-show once on mount after delay, then auto-hide after 3 s. */
  useEffect(() => {
    if (!autoShowMs) return;
    const showTimer = setTimeout(() => {
      setOpen(true);
      autoHideTimer.current = setTimeout(() => {
        setOpen((cur) => (cur && !pinned ? false : cur));
      }, 3000);
    }, autoShowMs);
    return () => {
      clearTimeout(showTimer);
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoShowMs]);

  /* Dismiss when clicking outside. */
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPinned(false);
        setStyle(null);
      }
    }
    document.addEventListener('pointerdown', onPointerDown, { capture: true });
    return () => document.removeEventListener('pointerdown', onPointerDown, { capture: true });
  }, [open]);

  function close() {
    setOpen(false);
    setPinned(false);
    setStyle(null);
  }

  function handleClick() {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
      autoHideTimer.current = null;
    }
    const next = !open;
    if (!next) setStyle(null);
    setOpen(next);
    setPinned(next);
  }

  const sideClass =
    side === 'top' ? styles.tooltipSideTop
    : side === 'bottom' ? styles.tooltipSideBottom
    : side === 'left' ? styles.tooltipSideLeft
    : styles.tooltipSideRight;

  return (
    <span className={styles.infoTooltipWrap}>
      <button
        ref={ref}
        type="button"
        aria-label="More information"
        aria-expanded={open}
        className={styles.infoIconBtn}
        onClick={handleClick}
        onMouseEnter={() => { if (!pinned) setOpen(true); }}
        onMouseLeave={() => {
          if (!pinned) {
            close();
            if (autoHideTimer.current) {
              clearTimeout(autoHideTimer.current);
              autoHideTimer.current = null;
            }
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close();
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
        }}
      >
        {/* ⓘ icon — a filled disc with the glyph knocked out in white, so it
            reads as a control rather than a hairline drawing. */}
        <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.infoIconSvg}>
          <circle cx="10" cy="10" r="9" className={styles.infoIconDisc} />
          <rect x="9" y="8.6" width="2" height="6" rx="1" className={styles.infoIconGlyph} />
          <circle cx="10" cy="5.9" r="1.15" className={styles.infoIconGlyph} />
        </svg>
      </button>

      {open && (
        <span
          ref={tipRef}
          role="tooltip"
          className={`${styles.tooltip} ${sideClass}`}
          /* Before the first measurement the bubble is laid out but not shown —
             it has to be in the document to have a width worth measuring. */
          style={style ?? { top: 0, left: 0, visibility: 'hidden', ...(maxWidth ? { maxWidth: `${maxWidth}px` } : {}) }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
