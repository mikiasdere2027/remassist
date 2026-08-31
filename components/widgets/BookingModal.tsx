'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { track } from '@/lib/analytics/events';

/**
 * "Book a Call" modal — ported from RemAssist-Html/assets/booking-modal.js (Phase 02).
 * Intercepts any click on a calendly.com link and opens a branded in-page
 * scheduler dialog instead of navigating away. Progressive enhancement: the
 * anchors keep their real href + target="_blank", so without JS (or on a
 * modified click) they open Calendly natively. The legacy script is untouched.
 *
 * What mounts in the root layout is this file and nothing more: one document
 * click listener and a boolean. The dialog — the mark paths, the ISO artwork,
 * the embed chrome — is a separate chunk that arrives on the first click,
 * because it was being parsed on all 23 routes to serve a listener.
 *
 * The same listener is where `book_click` is emitted. There are around fifteen
 * hard-coded Calendly anchors across the header, the hero, the pricing grid
 * and every service page; instrumenting them individually would mean fifteen
 * chances to forget one, and a funnel that undercounts by however many were
 * missed. Delegation already sees all of them.
 */
const BookingModalDialog = dynamic(() => import('./BookingModalDialog'), { ssr: false });

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
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onClick(e: globalThis.MouseEvent) {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      const a = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || !isCalendly(a.href)) return;

      /* Emitted above the modifier check, not below it. A ctrl- or middle-
         click opens Calendly in a new tab — the visitor reaches the scheduler
         either way, so it is the same intent and belongs in the same count.
         Below the check it would be invisible, which reads as "nobody opens
         links in tabs" rather than "we stopped looking". */
      track('book_click', {
        placement: a.dataset.bookPlacement ?? window.location.pathname,
      });

      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      lastFocus.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  /* Called at the END of the dialog's fade-out, not the start — the dialog
     owns that timing so the animation is not cut short by unmounting. */
  function onClose() {
    setOpen(false);
    lastFocus.current?.focus?.({ preventScroll: true });
  }

  if (!open) return null;
  return <BookingModalDialog onClose={onClose} />;
}
