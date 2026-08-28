'use client';

import { useEffect } from 'react';

/**
 * Open the <details> an in-page link points at.
 *
 * The services directory is nine `<details name="directory">`, and the hero's
 * category nav links to them by fragment. Browsers scroll to a closed
 * `<details>` addressed that way but do not expand it — verified in Chrome —
 * so without this, clicking "Finance & Accounting" lands the visitor on a
 * collapsed header, which is worse than the page it replaced.
 *
 * Deliberately tiny and generic: it renders nothing, and if the bundle never
 * loads the accordion still works, because `<details>` needs no JavaScript.
 * Only the deep link degrades, to one extra click.
 */
export default function OpenTargetDetails() {
  useEffect(() => {
    const detailsFor = (hash: string): HTMLDetailsElement | null => {
      const id = decodeURIComponent(hash.replace(/^#/, ''));
      if (!id) return null;
      const el = document.getElementById(id);
      return el instanceof HTMLDetailsElement ? el : null;
    };

    /* Re-align after opening: `name` closes whichever panel was open, and if
       that one sat above the target the target slides up out of view. One
       frame later the layout has settled, and scroll-margin-top does the rest. */
    const reveal = (el: HTMLDetailsElement) => {
      const wasOpen = el.open;
      el.open = true;
      if (!wasOpen) {
        requestAnimationFrame(() => el.scrollIntoView({ block: 'start', behavior: 'auto' }));
      }
    };

    const fromHash = () => {
      const el = detailsFor(window.location.hash);
      if (el) reveal(el);
    };

    /* A second click on the same in-page link leaves the hash unchanged, so
       hashchange never fires — catch the click as well, or re-opening a
       category the visitor closed by hand does nothing. */
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
      if (!link) return;
      const el = detailsFor(link.getAttribute('href') ?? '');
      if (el) reveal(el);
    };

    fromHash();
    window.addEventListener('hashchange', fromHash);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('hashchange', fromHash);
      document.removeEventListener('click', onClick);
    };
  }, []);

  return null;
}
