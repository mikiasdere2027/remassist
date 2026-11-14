'use client';

import { useEffect } from 'react';

/**
 * Sets `data-scrolled` on <html> so CSS can tell "at the top of the page" from
 * "scrolled down".
 *
 * Exists for one rule: the mobile header goes transparent over a dark hero
 * (Header.module.css), and a sticky transparent bar has to become solid again
 * the moment real content passes beneath it — otherwise a cyan logo and white
 * hamburger bars end up on top of white cards.
 *
 * A component rather than a prop on Header, because Header is a server
 * component whose whole mega-menu markup would have to ship to the client to
 * hold one boolean. This is the only part that needs to run in the browser.
 *
 * The attribute is written as "1"/"0" and the stylesheet matches
 * `:not([data-scrolled="1"])`, so the transparent state is what an unstyled
 * first paint already gives — no flash of a white bar before hydration.
 */
export default function HeaderScrollState() {
  useEffect(() => {
    const root = document.documentElement;
    /* 8px rather than 0: a rubber-band scroll or a 1px sub-pixel offset at
       rest would otherwise flicker the bar on and off. */
    const apply = () => { root.dataset.scrolled = window.scrollY > 8 ? '1' : '0'; };
    apply();
    window.addEventListener('scroll', apply, { passive: true });
    return () => {
      window.removeEventListener('scroll', apply);
      delete root.dataset.scrolled;
    };
  }, []);

  return null;
}
