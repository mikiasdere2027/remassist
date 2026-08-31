'use client';

import { useEffect } from 'react';
import styles from './page.module.css';

/**
 * ArticleChrome — the blog post's interactive extras, ported from the DCLogic
 * `componentDidMount` in Blog Post.dc.html. The codemod strips inline handlers
 * ("interactive behaviour is Phase 02"), which left the reading-progress bar
 * stuck at zero, the mobile TOC toggle inert (its panel is `display: none`
 * until `.open` is set, so the whole contents list was unreachable on a phone)
 * and the three share buttons pointing at `href="#"`.
 *
 * State classes (`open`, `is-active`, `copied`) come from the CSS module, so
 * they carry the same hash the stylesheet uses — adding the literal strings
 * would toggle a class no selector matches.
 *
 * Renders nothing — it wires up the markup ArticleBody already emits, by id.
 * Everything is progressive enhancement: the article reads fine without it,
 * which is why the whole thing stays inside one try/catch like the original.
 */
export default function ArticleChrome() {
  useEffect(() => {
    const cleanups: (() => void)[] = [];
    try {
      const bar = document.getElementById('bpProgress');
      const article = document.querySelector<HTMLElement>('[class*="bp-article"]');
      const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('#bpTocList a'));
      const sections = tocLinks
        .map((a) => document.getElementById(String(a.getAttribute('href')).slice(1)))
        .filter((el): el is HTMLElement => Boolean(el));

      /* Geometry, cached. Every one of these reads forces the browser to flush
         layout, and they were all inside the scroll handler: the article's
         offsetTop and offsetHeight once, plus a getBoundingClientRect per TOC
         section — on every scroll event, for the whole length of a long
         article. None of it changes as you scroll, only as the page is
         re-laid-out, so it is measured then instead.

         Positions are stored document-absolute (rect.top + scrollY) rather
         than as offsetTop, which is relative to the nearest positioned
         ancestor and would be wrong inside the article's own containers. */
      let articleStart = 0;
      let articleSpan = 0;
      let sectionTops: number[] = [];

      const measure = () => {
        if (article) {
          articleStart = article.getBoundingClientRect().top + window.scrollY;
          articleSpan = article.offsetHeight - window.innerHeight;
        }
        sectionTops = sections.map((s) => s.getBoundingClientRect().top + window.scrollY);
      };

      /* Only touch the DOM when the active entry actually changes — the
         handler runs on every scroll event and the answer is the same for
         most of them. */
      let activeId: string | null | undefined;

      const onScroll = () => {
        const y = window.scrollY;
        if (bar && article) {
          const pct = articleSpan > 0 ? (y - articleStart) / articleSpan : 0;
          bar.style.width = `${Math.min(100, Math.max(0, pct * 100))}%`;
        }
        let current: string | null = null;
        for (let i = 0; i < sections.length; i++) {
          if (sectionTops[i] - y <= 130) current = sections[i].id;
        }
        if (current === activeId) return;
        activeId = current;
        for (const a of tocLinks) {
          a.classList.toggle(styles['is-active'], a.getAttribute('href') === `#${current}`);
        }
      };

      const remeasure = () => { measure(); onScroll(); };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', remeasure);
      measure();
      onScroll();
      cleanups.push(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', remeasure);
      });

      /* The cache has to survive the article growing after mount — a late
         image, a webfont settling. A ResizeObserver on the article catches
         both without guessing at which event to listen for. */
      if (article && typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(remeasure);
        ro.observe(article);
        cleanups.push(() => ro.disconnect());
      }

      // Mobile contents drawer. `.bp-toc-panel` is display:none below the
      // breakpoint until `.open` lands on the aside.
      const toc = document.getElementById('bpToc');
      const tocToggle = document.getElementById('bpTocToggle');
      if (toc && tocToggle) {
        const toggle = () => {
          const open = toc.classList.toggle(styles['open']);
          tocToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        };
        const close = () => toc.classList.remove(styles['open']);
        tocToggle.addEventListener('click', toggle);
        tocLinks.forEach((a) => a.addEventListener('click', close));
        cleanups.push(() => {
          tocToggle.removeEventListener('click', toggle);
          tocLinks.forEach((a) => a.removeEventListener('click', close));
        });
      }

      const shareTo = (base: string) => {
        window.open(
          `${base}${encodeURIComponent(window.location.href)}`,
          '_blank',
          'noopener,noreferrer,width=600,height=520',
        );
      };
      const wire = (id: string, handler: (e: Event) => void) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('click', handler);
        cleanups.push(() => el.removeEventListener('click', handler));
      };
      wire('bpShareLinkedIn', (e) => {
        e.preventDefault();
        shareTo('https://www.linkedin.com/sharing/share-offsite/?url=');
      });
      wire('bpShareX', (e) => {
        e.preventDefault();
        shareTo('https://twitter.com/intent/tweet?url=');
      });
      wire('bpCopyLink', (e) => {
        e.preventDefault();
        const btn = e.currentTarget as HTMLElement;
        const done = () => {
          btn.classList.add(styles['copied']);
          setTimeout(() => btn.classList.remove(styles['copied']), 1400);
        };
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(window.location.href).then(done, done);
        } else {
          done();
        }
      });
    } catch {
      /* interactive extras are progressive enhancement — the page reads fine without them */
    }
    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
