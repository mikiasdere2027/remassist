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

      const onScroll = () => {
        if (bar && article) {
          const start = article.offsetTop;
          const span = article.offsetHeight - window.innerHeight;
          const pct = span > 0 ? (window.scrollY - start) / span : 0;
          bar.style.width = `${Math.min(100, Math.max(0, pct * 100))}%`;
        }
        let current: string | null = null;
        for (const s of sections) {
          if (s.getBoundingClientRect().top <= 130) current = s.id;
        }
        for (const a of tocLinks) {
          a.classList.toggle(styles['is-active'], a.getAttribute('href') === `#${current}`);
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
      cleanups.push(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      });

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
