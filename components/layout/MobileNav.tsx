'use client';

import Link from 'next/link';
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
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Navigating from inside the drawer must dismiss it — the route changes
  // under a panel that would otherwise stay open over the new page.
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        buttonRef.current?.focus();
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

      {open && (
        <div className={styles.backdrop} onClick={close} aria-hidden="true" />
      )}

      {/* Mounted only while open. Keeping it in the DOM translated off-screen
          added 343px (88vw) of horizontal overflow to every page: a fixed
          element pushed past the right edge still extends the scrollable area.
          Conditional mounting also means no inert/aria-hidden juggling to keep
          a shut menu out of the tab order. */}
      {open && (
      <div
        id="mobile-nav-panel"
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
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

          <a className={styles.cta} href={BOOK_URL} target="_blank" rel="noopener">
            Book a Call
          </a>
        </nav>
      </div>
      )}
    </>
  );
}
