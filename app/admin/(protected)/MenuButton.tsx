'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styles from '../admin.module.css';

/** Gap under the trigger, and the margin the menu keeps off the viewport. */
const OFFSET = 6;
const MARGIN = 8;

/**
 * The three-dot row menu — the trigger and the popup, not the items in it.
 *
 * One component because three screens now want the same control: the rate
 * tables, the FAQ list, and the team directory it was first built for. The
 * items differ every time, so they arrive as children; what does not differ is
 * where the popup goes, and that is the part worth having in one place.
 *
 * It is `position: fixed` and placed from the trigger's viewport rect rather
 * than absolutely inside its wrapper. Every surface this appears on nests it
 * inside something that clips: `.panel` is `overflow: hidden` for its corners,
 * `.tableWrap` is `overflow-x: auto` for narrow screens, and either one cuts
 * the popup off — the first version came out with its right half sliced away.
 * Fixed positioning escapes both; the costs are re-measuring on scroll and
 * resize, and doing the clamping a browser would otherwise do for free.
 *
 * Closes on outside click, on Escape, and on any click inside the menu, since
 * every item either navigates or submits.
 */
export default function MenuButton({
  label,
  children,
}: {
  /** Announced on the trigger, e.g. "Options for option: Part time". */
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  /* Right-aligned under the trigger, pulled back inside the viewport, and
     flipped above the row when the last one would push it off the bottom. */
  const place = useCallback(() => {
    if (!btn.current || !menu.current) return;
    const r = btn.current.getBoundingClientRect();
    const w = menu.current.offsetWidth;
    const h = menu.current.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const below = r.bottom + OFFSET + h <= vh - MARGIN;
    setStyle({
      top: below ? r.bottom + OFFSET : Math.max(MARGIN, r.top - OFFSET - h),
      left: Math.min(Math.max(MARGIN, r.right - w), Math.max(MARGIN, vw - w - MARGIN)),
    });
  }, []);

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

  const close = useCallback(() => {
    setOpen(false);
    setStyle(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (wrap.current?.contains(t) || menu.current?.contains(t)) return;
      close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return (
    <div className={styles.memberMoreWrap} ref={wrap}>
      <button
        ref={btn}
        type="button"
        className={styles.memberMoreBtn}
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={label}
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>

      {open && (
        <div
          ref={menu}
          className={`${styles.memberDropdown} ${styles.memberDropdownFixed}`}
          /* Laid out but not shown until measured — it needs a width before it
             can be right-aligned to the trigger. */
          style={style ?? { top: 0, left: 0, visibility: 'hidden' }}
          onClick={close}
        >
          {children}
        </div>
      )}
    </div>
  );
}
