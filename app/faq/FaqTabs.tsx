'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FaqGroup } from '@/lib/faq/content';
import styles from './page.module.css';

/**
 * The /faq groups as a vertical tab rail beside a content panel.
 *
 * Ported from the ServiceDirectory pattern (components/services/ServiceDirectory.tsx).
 * The page it replaced had the same disease that one did: six groups stacked end
 * to end, each a heading above its own accordion, so reading one answer meant a
 * long scroll past the groups you chose not to read. A rail keeps every group
 * title on screen with one click between them, and the <details> accordion rows
 * inside a panel are untouched — they were the part that worked.
 *
 * THREE THINGS THIS DELIBERATELY KEEPS FROM THE STACKED PAGE:
 *
 * 1. Every panel is rendered, and inactive ones are `inert` rather than
 *    unmounted. All thirty-three answers stay in the server HTML, so the page
 *    is as crawlable as it was. `inert` also keeps them out of the tab order and
 *    off screen readers, and the CSS hides them with visibility rather than
 *    display so the panel card keeps the height of its tallest panel.
 *
 * 2. The panel ids are the group slugs, unchanged. The old jump nav linked to
 *    #pricing and five siblings; those anchors have to keep working, so the hash
 *    is read on mount and on hashchange and selects the matching tab — a plain
 *    browser jump cannot do it alone, because the target is hidden until its tab
 *    is chosen and there would be nothing to scroll to.
 *
 * 3. Answers arrive as HTML that getFaq has already cleaned against the
 *    allowlist in lib/content/sanitize.ts. Nothing here should ever pass
 *    dangerouslySetInnerHTML a string from anywhere else.
 *
 * Keyboard follows the WAI-ARIA tabs pattern: arrows move and select, Home and
 * End jump to the ends, and the rail is one tab stop via roving tabindex.
 */
export default function FaqTabs({ groups }: { groups: FaqGroup[] }) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  /* Set when a keypress moved the selection, so focus follows it — but not when
     a hash or a click did, where stealing focus would be wrong. */
  const focusWanted = useRef(false);

  /* Deep links. The old jump nav's anchors have to keep working, so
     /faq#pricing from anywhere else has to land on the right panel too. */
  useEffect(() => {
    const fromHash = (smooth: boolean) => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const i = groups.findIndex((g) => g.slug === id);
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
  }, [groups]);

  useEffect(() => {
    if (!focusWanted.current) return;
    focusWanted.current = false;
    tabRefs.current[active]?.focus();
  }, [active]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const last = groups.length - 1;
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
    },
    [active, groups.length],
  );

  return (
<section className={styles['rs-tabs-section']} aria-label="Frequently asked questions">
      <div className={styles['rs-wrap']}>
        <div className={styles['rs-tabs-grid']}>
          <div className={styles['rs-rail']}>
            <span className={styles['rs-rail-label']} id="faq-rail-label">Topics</span>

            <div
              className={styles['rs-tabs']}
              role="tablist"
              aria-orientation="vertical"
              aria-labelledby="faq-rail-label"
              onKeyDown={onKeyDown}
            >
              {groups.map((g, i) => (
                <button
                  key={g.slug}
                  ref={(el) => { tabRefs.current[i] = el; }}
                  type="button"
                  role="tab"
                  id={`faq-tab-${g.slug}`}
                  aria-selected={i === active}
                  aria-controls={g.slug}
                  tabIndex={i === active ? 0 : -1}
                  className={`${styles['rs-tab']} ${i === active ? styles['rs-tab-on'] : ''}`}
                  onClick={() => setActive(i)}
                >
                  {/* The figure, not an icon: groups have no glyph of their own,
                      and the number ties the open panel to its 01–06 place in
                      the sequence the way the services directory does. */}
                  <span className={styles['rs-tab-count']} aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={styles['rs-tab-name']}>{g.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles['rs-panel-card']}>
            {/* All six panels share one grid cell, so the card is always the
                height of the tallest panel and never resizes on switch. */}
            <div className={styles['rs-panel-stack']}>
              {groups.map((g, i) => (
                <div
                  key={g.slug}
                  id={g.slug}
                  role="tabpanel"
                  aria-labelledby={`faq-tab-${g.slug}`}
                  /* NOT the `hidden` attribute: it collapses the box and defeats
                     the whole point of stacking the panels. `inert` keeps the
                     inactive ones out of focus and the a11y tree, and CSS
                     visibility does the hiding — which still removes them from
                     the tab order and from screen readers, but keeps their
                     height. */
                  inert={i !== active}
                  className={`${styles['rs-panel']} ${i === active ? styles['rs-panel-on'] : ''}`}
                >
                  <div className={styles['rs-group-head']}>
                    <div>
                      <h2 className={styles['rs-h2']}>{g.title}</h2>
                      {g.blurb && <p>{g.blurb}</p>}
                    </div>
                    {g.linkHref && g.linkLabel && (
                      <a className={styles['rs-source']} href={g.linkHref}>{g.linkLabel}</a>
                    )}
                  </div>
                  <div className={styles['rs-faq']}>
                    {g.items.map((it) => (
                      <details key={it.question}>
                        <summary>{it.question}</summary>
                        {/* Answers are stored as rich text and cleaned against an
                            allowlist on every write *and* again on the way out of
                            getFaq — see lib/content/sanitize.ts. Nothing reaches
                            this line that did not survive both passes. */}
                        <div
                          className={styles['rs-answer']}
                          dangerouslySetInnerHTML={{ __html: it.answer }}
                        />
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}