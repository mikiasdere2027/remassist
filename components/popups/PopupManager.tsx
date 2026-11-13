'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import type { LivePopup } from '@/lib/api/popups';
import { track } from '@/lib/analytics/events';
import { popupAppliesTo } from '@/lib/popups/placement';
import styles from './PopupManager.module.css';

/**
 * The public popup ad renderer.
 *
 * Mounted once in the root layout, this fetches the currently-live popups
 * (published and inside their schedule — GET /api/v1/public/popups, the
 * backend, does the schedule filtering) and shows the first one
 * that applies to the page the visitor is actually on. "Applies" means the
 * popup's placement matches the pathname, or it is placed "everywhere". The
 * list is fetched rather than the popup rendered into the page so the
 * marketing pages stay prerendered — an ad slot does not make a static page
 * dynamic, and whichever URL the visitor landed on decides the placement, not
 * the page we happened to bake it into.
 *
 * Behaviour an editor controls on the popup itself:
 *  - template — which of the two shapes below it takes;
 *  - delaySeconds — how long after this manager mounts before the popup shows;
 *  - displaySeconds — how long it stays before dismissing itself (null = until
 *    closed);
 *  - the CTA's href, which is an ordinary link, tracked as a popup_click.
 *
 * Everything else is discretion, not content. A popup is shown once per
 * visitor per session — dismissing it, or letting it auto-dismiss, records the
 * tracking key in sessionStorage so a second targeted page does not nag with
 * the same ad. "Shown" means truly seen: a popup whose delay never elapsed
 * (the visitor moved on first) has not been recorded, and will appear again.
 * Without this the delay is useless, because a 5-second popup would re-fire on
 * every navigation.
 *
 * The two templates differ in exactly one thing that matters here — whether
 * the page underneath keeps working:
 *
 *  - 'corner' renders a card in the bottom-right and nothing else. No
 *    backdrop, no scroll lock, no aria-modal: the page behind it is still
 *    read, scrolled and clicked, which is the whole reason to pick this shape.
 *  - 'spotlight' renders the artwork over a dimmed page as a real modal
 *    dialog — backdrop, scroll lock, aria-modal — with the close button above
 *    the image and no copy at all. The image is the ad, so the image is the
 *    link.
 *
 * Escape closes either one. It costs a keystroke to offer and a visitor who
 * presses it wants the thing gone, modal or not.
 */

/** One live popup, as GET /v1/public/popups returns it. */
type ActivePopup = LivePopup;

const SEEN = 'remassist:popup-seen:';

function hasSeen(trackingKey: string): boolean {
  try {
    return sessionStorage.getItem(`${SEEN}${trackingKey}`) === '1';
  } catch {
    /* Storage unavailable (privacy mode, sandboxed iframe): fall back to
       showing the popup once per page load, which is better than never. */
    return false;
  }
}

function markSeen(trackingKey: string): void {
  try {
    sessionStorage.setItem(`${SEEN}${trackingKey}`, '1');
  } catch {
    /* The catch in hasSeen covers the read; a failed write is the same state. */
  }
}

/** The X, drawn once and used by both templates. */
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  );
}

export default function PopupManager() {
  const pathname = usePathname() ?? '';

  /* null = "not fetched yet", so that loading cannot be mistaken for "no
     popups" — a fetch error or an empty list must both render nothing, but a
     pending fetch must not race a navigation into deciding the page is bare. */
  const [loaded, setLoaded] = useState<ActivePopup[] | null>(null);
  const [current, setCurrent] = useState<ActivePopup | null>(null);
  const [visible, setVisible] = useState(false);

  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const cancelTimers = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  }, []);

  /** Shown once: record it, drop it, and let the next in line have its turn. */
  const settle = useCallback(() => {
    if (current) markSeen(current.trackingKey);
    cancelTimers();
    setVisible(false);
    setCurrent(null);
  }, [current, cancelTimers]);

  /* Fetch the live list once, when the component first mounts. The schedule
     filter runs in the backend; the placement filter runs here per path. */
  useEffect(() => {
    let alive = true;
    api
      .get<{ popups: LivePopup[] }>('/public/popups')
      .then((data) => {
        if (alive) setLoaded(data.popups ?? []);
      })
      .catch(() => {
        if (alive) setLoaded([]);
      });
    return () => {
      alive = false;
    };
  }, []);
/* Whenever the page or the list changes and nothing is up, pick the next
     popup that belongs on this page and has not been seen this session. */
  useEffect(() => {
    if (loaded === null || current) return;
    const next = loaded.find(
      (p) => popupAppliesTo(p.placement, pathname) && !hasSeen(p.trackingKey),
    );
    if (next) setCurrent(next);
  }, [pathname, loaded, current]);

  /* The selected popup's timing: wait its delay, show it, count its view, and
     let displaySeconds dismiss it if the editor set one. */
  useEffect(() => {
    if (!current) return;
    setVisible(false);

    const showIn = Math.max(0, current.delaySeconds) * 1000;
    timers.current.push(
      setTimeout(() => {
        setVisible(true);
        track('popup_view', {
          popup_id: current.trackingKey,
          campaign: current.campaign,
          placement: current.placement,
        });
        if (current.displaySeconds) {
          timers.current.push(setTimeout(settle, current.displaySeconds * 1000));
        }
      }, showIn),
    );

    return cancelTimers;
  }, [current, settle, cancelTimers]);

  const spotlight = current?.template === 'spotlight';

  /* Block the page underneath while a spotlight is open. A corner card
     deliberately does not: locking the scroll behind a card the visitor is
     free to ignore would be the worst of both shapes. */
  useEffect(() => {
    if (!current || !visible || !spotlight) return;
    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = previous;
    };
  }, [current, visible, spotlight]);

  /* Escape closes, like every dialog on the site. */
  useEffect(() => {
    if (!current || !visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [current, visible, settle]);

  if (!current || !visible) return null;

  const clickCta = () => {
    track('popup_click', {
      popup_id: current.trackingKey,
      campaign: current.campaign,
      placement: current.placement,
    });
    /* The link navigates normally; this only reports it. */
  };

  /* ── Image spotlight ───────────────────────────────────────────────────
     The artwork, centred over the dimmed page, with the close button above
     its top-right corner and nothing else. The headline is not rendered —
     it is the image's alt text, which is all a screen reader would otherwise
     have. A spotlight without an image cannot be published (see
     lib/popups/completeness.ts), so a missing one here means a row that
     predates its template; render nothing rather than an empty frame. */
  if (spotlight) {
    if (!current.image) return null;
    return (
      <div
        className={styles.overlay}
        onMouseDown={(e) => {
          /* A click on the dimming backdrop (not the image) counts as a close. */
          if (e.target === e.currentTarget) settle();
        }}
      >
        <div
          className={styles.spotlight}
          role="dialog"
          aria-modal="true"
          aria-label={current.title}
        >
          <button
            type="button"
            className={`${styles.closeBtn} ${styles.closeAbove}`}
            onClick={settle}
            aria-label="Close popup"
          >
            <CloseIcon />
          </button>

          <a
            className={styles.spotlightLink}
            href={current.ctaHref}
            onClick={clickCta}
          >
            {/* Plain dimensions with height:auto in CSS: the file's own aspect
                ratio decides the shape once it loads, which is the point of a
                template whose whole content is somebody's artwork. */}
            <Image
              className={styles.spotlightImg}
              src={current.image}
              alt={current.title}
              width={1200}
              height={800}
              sizes="(max-width: 640px) 92vw, 920px"
              unoptimized
              priority
            />
          </a>
        </div>
      </div>
    );
  }

  /* ── Corner card ───────────────────────────────────────────────────────
     Bottom-right, no backdrop. Labelled as a region rather than a dialog,
     because it is not one: nothing is blocked and focus is not trapped, so
     calling it a dialog would tell a screen-reader user the page had stopped. */
  return (
    <aside className={styles.corner} aria-label={`${current.campaign} offer`}>
      <div className={styles.card}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={settle}
          aria-label="Close popup"
        >
          <CloseIcon />
        </button>

        {current.image && (
          <div className={styles.imageWrap}>
            <Image
              src={current.image}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 380px"
              unoptimized
            />
          </div>
        )}

        <div className={styles.body}>
          <p className={styles.campaign}>{current.campaign}</p>
          <h2 className={styles.title}>{current.title}</h2>
          <p className={styles.message}>{current.message}</p>

          <div className={styles.actions}>
            <a className={styles.cta} href={current.ctaHref} onClick={clickCta}>
              {current.ctaLabel}
            </a>
            <button type="button" className={styles.dismiss} onClick={settle}>
              No thanks
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
