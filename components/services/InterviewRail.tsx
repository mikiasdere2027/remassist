'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import { track } from '@/lib/analytics/events';
import type { InterviewSeat } from '@/lib/interviews';
import styles from './InterviewRail.module.css';
import { useRail } from './useRail';

/**
 * InterviewRail — sample interviews on a service page.
 *
 * One card per clip: the interviewee's name and seat bottom left, over the
 * poster frame. The clips in /uploads/Interviews are 4–36MB, so a card at
 * rest is one optimised poster image — the <video> is only mounted for the
 * card the visitor clicked, and only one plays at a time.
 *
 * Rail behaviour lives in useRail — and the clip that is playing pauses the
 * auto-advance, so the rail never scrolls out from under someone watching.
 */

interface Props {
  eyebrow: string;
  title: ReactNode;
  lede: string;
  seats: InterviewSeat[];
  /** Which page surface the section sits on — see .section--white/--paper. */
  surface: 'white' | 'paper';
}

export default function InterviewRail({ eyebrow, title, lede, seats, surface }: Props) {
  const [playing, setPlaying] = useState<string | null>(null);
  const { railRef, progressRef, onScroll, nudge, hold } = useRail({ paused: playing !== null });

  return (
    <section className={`${styles.section} ${styles[`section--${surface}`]}`} id="interviews">
      <div className={styles.wrap}>
        <span className={styles.kicker}>{eyebrow}</span>
        <h2 className={styles.h2}>{title}</h2>
        <p className={styles.lede}>{lede}</p>

        <div className={styles.rail} ref={railRef} onScroll={onScroll}>
          {seats.map((s) => {
            const isPlaying = playing === s.slug;
            return (
              <article
                className={`${styles.card}${isPlaying ? ` ${styles['card--playing']}` : ''}`}
                key={s.slug}
              >
                <div className={styles.poster}>
                  {/* 108px is the stacked-row tile below 680px; see the
                      media query in InterviewRail.module.css. */}
                  <Image
                    src={s.poster}
                    alt={`${s.name}, ${s.position}`}
                    fill
                    sizes="(max-width: 680px) 108px, 288px"
                  />
                </div>
                <span className={styles.scrim} aria-hidden="true" />

                <div className={styles.meta}>
                  <h3 className={styles.name}>{s.name}</h3>
                  <p className={styles.position}>{s.position}</p>
                  <span className={styles.length}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>
                    {s.length}
                  </span>
                </div>

                {isPlaying ? (
                  <>
                    {/* Mounted on click, so nothing downloads until then. */}
                    <video
                      className={styles.video}
                      src={s.video}
                      poster={s.poster}
                      controls
                      autoPlay
                      playsInline
                      preload="auto"
                      onEnded={() => setPlaying(null)}
                    />
                    <button
                      type="button"
                      className={styles.close}
                      onClick={() => setPlaying(null)}
                      aria-label={`Close the interview with ${s.name}`}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.trigger}
                      onClick={() => { hold(); setPlaying(s.slug); track('video_play', { video_id: s.slug }); }}
                      aria-label={`Play the ${s.length} interview with ${s.name}, ${s.position}`}
                    />
                    <span className={styles.disc} aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg>
                    </span>
                  </>
                )}
              </article>
            );
          })}
        </div>

        <div className={styles.controls}>
          <div className={styles.progress}>
            <span className={styles.progressFill} ref={progressRef} style={{ width: '8%' }} />
          </div>
          <button type="button" className={styles.arrow} onClick={() => nudge(-1)} aria-label="Scroll interviews left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M19 12H5m6 6-6-6 6-6" /></svg>
          </button>
          <button type="button" className={styles.arrow} onClick={() => nudge(1)} aria-label="Scroll interviews right">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
}
