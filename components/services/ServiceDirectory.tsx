'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BOOK_URL } from '@/lib/nav';
import { categoryNumber, otherCategories } from './directory';
import styles from './ServiceDirectory.module.css';

/**
 * The /services directory: a vertical tab rail beside a content panel.
 *
 * Replaces nine stacked <details> accordions. The accordions worked, but they
 * put the reader in charge of a nine-item open/close chore to compare two
 * practice areas, and only one could be open at a time anyway (they shared a
 * `name`, so opening one shut the last). A tab rail is the same information
 * with the choice always visible and one click to switch.
 *
 * THREE THINGS THIS DELIBERATELY KEEPS FROM THE ACCORDION:
 *
 * 1. Every panel is rendered, and inactive ones are `hidden` rather than
 *    unmounted. All thirty-five roles stay in the server HTML, so the page is
 *    as crawlable as it was — this is the services directory, and content a
 *    crawler cannot see is the one thing it cannot afford. `hidden` is also
 *    what keeps them out of the tab order and off screen readers.
 *
 * 2. The panel ids are the category ids, unchanged. The hero chips link to
 *    #sales-revenue and eight siblings; those anchors have to keep working, so
 *    the hash is read on mount and on hashchange and selects the matching tab.
 *    A plain browser jump cannot do it alone — the target is `hidden` until its
 *    tab is chosen, so nothing would scroll.
 *
 * 3. A role links out only where it already did. Three categories linked every
 *    row, three linked none; that is not a bug to normalise, it is which roles
 *    have a page that genuinely covers them.
 *
 * Keyboard follows the WAI-ARIA tabs pattern: arrows move and select, Home and
 * End jump to the ends, and the rail is one tab stop via roving tabindex.
 */
/**
 * The three things that hold whichever tab is open, rendered once below the
 * panels rather than nine times inside them.
 *
 * Every line is an argument this page already makes, not a benefit invented to
 * fill a strip. The first is the page's whole thesis — the band above spends a
 * paragraph on it, and it is the reason a directory of thirty-five roles is not
 * a menu. The second and third are the two commitments every service page
 * repeats, and the only two that are true of all nine lines at once.
 *
 * Deliberately three, not four. A fourth ("no recruiting cycle") was the one
 * that could have been said by any staffing company about any service, which
 * is exactly what makes it worth nothing here.
 *
 * Kept short on purpose — three columns on one line each, so the strip reads
 * at a glance instead of being a paragraph in three parts.
 */
const ALWAYS = [
  {
    title: 'One seat, several lines',
    text: 'One seat often spans three of these categories.',
    icon: <><path d="m12 4 8 4-8 4-8-4z" /><path d="m4 12 8 4 8-4" /></>,
  },
  {
    title: 'You approve every seat',
    text: 'You interview and approve every agent first.',
    icon: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></>,
  },
  {
    title: 'Free trial on live work',
    text: 'Judged on your own work, before anything is signed.',
    icon: <><path d="M12 3l7 3v6c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  },
];
/* The six that are not featured above. Read once at module scope — the split
   is static, and recomputing it per render would be work for nothing. */
const TABS = otherCategories();

export default function ServiceDirectory() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  /* Set when a keypress moved the selection, so focus follows it — but not
     when a hash or a click did, where stealing focus would be wrong. */
  const focusWanted = useRef(false);

  /* Deep links. The hero's nine chips are anchors, and /services#managed-it
     from anywhere else has to land on the right panel too. */
  useEffect(() => {
    const fromHash = (smooth: boolean) => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const i = TABS.findIndex((c) => c.id === id);
      if (i < 0) return;
      setActive(i);
      /* After paint, or the panel is still hidden and has nothing to scroll to. */
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
          block: 'start',
        });
      });
    };
    fromHash(false);
    const onHash = () => fromHash(true);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!focusWanted.current) return;
    focusWanted.current = false;
    tabRefs.current[active]?.focus();
  }, [active]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const last = TABS.length - 1;
    let next: number | null = null;
    /* Both axes: the rail is vertical on desktop and a horizontal strip on a
       phone, and the arrow that matches what you see should work. */
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = active === last ? 0 : active + 1;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = active === 0 ? last : active - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    focusWanted.current = true;
    setActive(next);
  }, [active]);

  return (
    <section className={styles.section} aria-label="Service directory">
      <div className={styles.wrap}>
        <div className={styles.grid}>
          <div className={styles.rail}>
            <span className={styles.railLabel} id="directory-label">Other Services</span>

            <div
              className={styles.tabs}
              role="tablist"
              aria-orientation="vertical"
              aria-labelledby="directory-label"
              onKeyDown={onKeyDown}
            >
              {TABS.map((c, i) => (
                <button
                  key={c.id}
                  ref={(el) => { tabRefs.current[i] = el; }}
                  type="button"
                  role="tab"
                  id={`tab-${c.id}`}
                  aria-selected={i === active}
                  aria-controls={c.id}
                  tabIndex={i === active ? 0 : -1}
                  className={`${styles.tab} ${i === active ? styles.tabOn : ''}`}
                  onClick={() => setActive(i)}
                >
                  <span className={styles.tabIco}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">{c.icon}</svg>
                  </span>
                  <span className={styles.tabName}>{c.name}</span>
                </button>
              ))}
            </div>

            {/* Grows to push the helper card to the floor of the rail, but
                never shrinks past its min-height — `margin-top: auto` alone
                collapsed to nothing the moment the six tabs filled the
                column, leaving the card flush against the last tab. */}
            <span className={styles.railGap} />

            <div className={styles.help}>
              <span className={styles.helpTitle}>Not sure where to start?</span>
              <p className={styles.helpText}>
                One trained seat often covers several of these at once. Five questions and we
                will tell you which.
              </p>
              <Link href="/qualify" className={styles.helpLink}>
                Get an estimate
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
              </Link>
            </div>
          </div>

          <div className={styles.panelCard}>
            {/* All six panels share one grid cell, so the card is always the
                height of the tallest and never resizes as you switch. */}
            <div className={styles.panelStack}>
            {TABS.map((c, i) => (
              <div
                key={c.id}
                id={c.id}
                role="tabpanel"
                aria-labelledby={`tab-${c.id}`}
                /* NOT the `hidden` attribute: Tailwind's preflight sets
                   [hidden]{display:none!important}, which collapses the box and
                   defeats the whole point of stacking the panels. `inert` keeps
                   the inactive ones out of focus and the a11y tree, and CSS
                   visibility does the hiding — which still removes them from
                   the tab order and from screen readers, but keeps their
                   height. */
                inert={i !== active}
                className={`${styles.panelBody} ${i === active ? styles.panelOn : ''}`}
              >
                <div className={styles.head}>
                  {/* The number, not the icon. The icon is already the tab's
                      mark in the rail; repeating it here said nothing the row
                      you just clicked had not, where the figure ties the open
                      panel to its 01–09 place in the sequence. */}
                  <span className={styles.headNum} aria-hidden="true">{categoryNumber(c.id)}</span>
                  <div>
                    <h2 className={styles.h2}>{c.name}</h2>
                    <p className={styles.blurb}>{c.blurb}</p>
                  </div>
                </div>

                <div className={styles.cards}>
                  {c.items.map((item) =>
                    item.href ? (
                      <Link key={item.name} href={item.href} className={`${styles.card} ${styles.cardLink}`}>
                        <span className={styles.cardIco}>
                          <svg viewBox="0 0 24 24" aria-hidden="true">{item.icon}</svg>
                        </span>
                        <span className={styles.cardBody}>
                          <span className={styles.cardName}>{item.name}</span>
                          <p className={styles.cardDesc}>{item.desc}</p>
                        </span>
                        {/* Chevron, not the shafted arrow the rest of the site
                            uses for navigation — these cards sit in a grid where
                            the mark is a per-row affordance rather than a call to
                            action, and the lighter glyph stops nine of them
                            competing with the button below. */}
                        <svg className={styles.cardGo} viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m9 6 6 6-6 6" />
                        </svg>
                      </Link>
                    ) : (
                      <div key={item.name} className={styles.card}>
                        <span className={styles.cardIco}>
                          <svg viewBox="0 0 24 24" aria-hidden="true">{item.icon}</svg>
                        </span>
                        <span className={styles.cardBody}>
                          <span className={styles.cardName}>{item.name}</span>
                          <p className={styles.cardDesc}>{item.desc}</p>
                        </span>
                      </div>
                    ),
                  )}
                </div>

              </div>
            ))}
            </div>

            {/* Shared by every tab, so it lives outside the panels: one copy in
                the DOM, no re-entrance animation on switch, and nothing here
                that could contradict the category you happen to be reading. */}
            <div className={styles.always}>
              <ul className={styles.alwaysList}>
                {ALWAYS.map((a) => (
                  <li key={a.title} className={styles.alwaysItem}>
                    <span className={styles.alwaysIco}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">{a.icon}</svg>
                    </span>
                    <span>
                      <b>{a.title}</b>
                      <em>{a.text}</em>
                    </span>
                  </li>
                ))}
              </ul>

              <div className={styles.cta}>
                <span className={styles.ctaIco}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3c3.5 2 5.5 5.4 5.5 9.5L12 18l-5.5-5.5C6.5 8.4 8.5 5 12 3Z" />
                    <circle cx="12" cy="10.5" r="1.8" />
                    <path d="M9 19c-.8 1-1 2-1 2s1.2-.2 2-1M15 19c.8 1 1 2 1 2s-1.2-.2-2-1" />
                  </svg>
                </span>
                <span className={styles.ctaTxt}>
                  <b>Not ready to pick a line?</b>
                  <em>Bring the bottleneck and we will scope the seat on the call.</em>
                </span>
                <a
                  className={styles.ctaBtn}
                  href={BOOK_URL}
                  target="_blank"
                  rel="noopener"
                  data-book-placement="services-directory"
                >
                  Book a free consult
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
