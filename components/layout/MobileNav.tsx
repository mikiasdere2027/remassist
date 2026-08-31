'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BOOK_URL, PRIMARY_LINKS, RESOURCE_LINKS, SERVICE_LINKS } from '@/lib/nav';
import styles from './MobileNav.module.css';

/**
 * MobileNav — the phone/tablet navigation.
 *
 * The artboards were authored desktop-only and never had a mobile nav: the
 * header's breakpoints stop at 820px and only hide the mega panels, so the
 * service directory was unreachable on a phone and the nav row pushed the
 * document wider than the viewport. That was contained by letting the row
 * scroll sideways; this replaces the containment with an actual menu.
 *
 * Kept separate from Header so Header stays a server component and the desktop
 * mega-menus stay pure CSS — they work with JavaScript disabled, and that
 * should not change because the phone needed a drawer.
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Navigating from inside the drawer must dismiss it — the route changes
  // under a panel that would otherwise stay open over the new page.
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        buttonRef.current?.focus();
        return;
      }
      /* Trap Tab inside the drawer. aria-modal tells a screen reader the rest
         of the page is inert, but it does not stop the Tab key — without this
         the third Tab lands on a link behind the panel that the visitor cannot
         see, and focus is lost off-screen for the rest of the page. */
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)]
        .filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    /* Hold the page still behind the drawer. Both elements: locking only body
       leaves documentElement scrollable, so the page can still be dragged
       sideways behind an open menu. */
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Move focus in, so the next Tab is inside the menu rather than back in
    // the page behind it.
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`${styles.bars} ${open ? styles.barsOpen : ''}`} aria-hidden="true">
          <i /><i /><i />
        </span>
      </button>

      {/* Portalled to <body>. The header carries backdrop-filter: blur(8px),
          which makes it the containing block for any position: fixed
          descendant — so the drawer resolved top/bottom against the 73px
          header and rendered as a 72px scrolling sliver instead of a
          full-height panel. Same escape hatch QuizLogic.tsx uses for its
          result modal. */}
      {open && mounted && createPortal(
        <>
        <div className={styles.backdrop} onClick={close} aria-hidden="true" />

      {/* Mounted only while open. Keeping it in the DOM translated off-screen
          added 343px (88vw) of horizontal overflow to every page: a fixed
          element pushed past the right edge still extends the scrollable area.
          Conditional mounting also means no inert/aria-hidden juggling to keep
          a shut menu out of the tab order. */}
      <div
        id="mobile-nav-panel"
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        {/* The panel is fixed to the top-right and paints over the header, so
            the hamburger that opened it is unreachable while it is open. The
            backdrop closes on tap, but a drawer needs a control the visitor
            can see. */}
        <button type="button" className={styles.close} onClick={() => { close(); buttonRef.current?.focus(); }} aria-label="Close menu">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>

        <nav className={styles.inner} aria-label="Mobile">
          <span className={styles.group}>Services</span>
          <ul className={styles.list}>
            {SERVICE_LINKS.map((l) => (
              <li key={l.href}>
                <Link className={styles.item} href={l.href} prefetch={false}>
                  <b>{l.label}</b>
                  {l.blurb && <small>{l.blurb}</small>}
                </Link>
              </li>
            ))}
          </ul>

          <span className={styles.group}>Resources</span>
          <ul className={styles.list}>
            {RESOURCE_LINKS.map((l) => (
              <li key={l.href}>
                <Link className={styles.item} href={l.href} prefetch={false}>
                  <b>{l.label}</b>
                  {l.blurb && <small>{l.blurb}</small>}
                </Link>
              </li>
            ))}
          </ul>

          <ul className={`${styles.list} ${styles.plain}`}>
            {PRIMARY_LINKS.map((l) => (
              <li key={l.href}>
                <Link className={styles.item} href={l.href} prefetch={false}>
                  <b>{l.label}</b>
                </Link>
              </li>
            ))}
          </ul>

          <a className={styles.cta} data-book-placement="mobile_nav" href={BOOK_URL} target="_blank" rel="noopener">
            Book a Call
          </a>
        </nav>
      </div>
        </>,
        document.body,
      )}
    </>
  );
}
