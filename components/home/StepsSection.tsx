'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import shared from './HomeSections.module.css';
import styles from './StepsSection.module.css';

/**
 * StepsSection — "From consult to coverage in four simple steps".
 *
 * Scroll-progress animation:
 *   • Step 1 reveals the moment the top of the section crosses the bottom of
 *     the viewport (i.e. as soon as you finish scrolling past the tech-stack
 *     section above it).
 *   • Steps 2–4 reveal evenly spaced as you scroll through the section.
 *   • Step 4 finishes animating right as the section's bottom edge reaches the
 *     bottom of the viewport — "when you reach the bottom of How It Works".
 *
 * The scroll handler is passive and self-removes once all four cards are shown.
 * `prefers-reduced-motion` shows all cards instantly without animation.
 */

const STEPS = [
  {
    n: '01',
    step: 'Step 1',
    title: 'Free consultation',
    desc: 'Tell us the services you need and expected interaction volume. Always free.',
    icon: /* lucide message-circle */ <><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></>,
  },
  {
    n: '02',
    step: 'Step 2',
    title: 'Team design',
    desc: 'We scope the personnel mix — generalists, specialists, or both — with pricing and terms.',
    icon: /* lucide users */ <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  },
  {
    n: '03',
    step: 'Step 3',
    title: 'Pick your agents',
    desc: 'Review profiles and run quick interviews — or leave selection to our experts.',
    icon: /* lucide user-check */ <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></>,
  },
  {
    n: '04',
    step: 'Step 4',
    title: 'Monitored delivery',
    desc: 'AI-assisted monitoring, hourly work logs, and daily email reports on every seat.',
    icon: /* lucide activity */ <><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></>,
  },
];

/**
 * Scroll-progress thresholds at which each card should reveal.
 * Progress 0 = section top at viewport bottom (section just entered).
 * Progress 1 = section bottom at viewport bottom (user is at the end).
 *
 * Step 1 fires immediately at 0 so it starts exactly when the section appears.
 * Steps 2–4 are spread across the remaining scroll depth so step 4 finishes
 * when the bottom of the section reaches the viewport bottom.
 */
const THRESHOLDS = [0, 0.32, 0.62, 0.90] as const;

const BOOK = 'https://calendly.com/j-zemene-remassistance/new-meeting';

export default function StepsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState<boolean[]>([false, false, false, false]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    /* Respect reduced-motion — reveal all immediately */
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setRevealed([true, true, true, true]);
      return;
    }

    function onScroll() {
      const rect = section!.getBoundingClientRect();
      const vh = window.innerHeight;

      /*
       * progress = how far the section has scrolled into the viewport,
       * measured from 0 (section top at viewport bottom) to 1 (section bottom
       * at viewport bottom). Clamped so we never go negative or above 1.
       */
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / rect.height));

      setRevealed((prev) => {
        let changed = false;
        const next = prev.map((wasRevealed, i) => {
          if (!wasRevealed && progress >= THRESHOLDS[i]) {
            changed = true;
            return true;
          }
          return wasRevealed;
        });
        return changed ? next : prev;
      });

      /* Self-remove once step 4 is triggered */
      if (progress >= THRESHOLDS[3]) {
        window.removeEventListener('scroll', onScroll);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    /* Check immediately in case the page loaded mid-section */
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      style={{
        backgroundImage:
          'radial-gradient(ellipse 900px 450px at 85% 0%, rgba(90,155,240,0.20), transparent 65%),linear-gradient(160deg,#518de0,#0047b3 82%)',
      }}
    >
      <div className={styles.wrap}>
        <span className={`${shared.eyebrow} ${shared.eyebrowDark}`}>How It Works</span>
        <div className={`${shared.head} ${shared.headDark}`}>
          <h2 className={shared.title}>
            From consult to coverage<br />in four simple steps
          </h2>
          <div className={shared.aside}>
            <p className={shared.desc}>
              Most clients go from first call to a fully onboarded pod inside two weeks — with a
              free trial before you commit.
            </p>
          </div>
        </div>

        <div className={styles.stage}>
          <div className={styles.grid}>
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className={`${styles.card} ${revealed[i] ? styles.cardVisible : ''}`}
              >
                <span className={styles.bignum}>{s.n}</span>
                <span className={styles.icon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {s.icon}
                  </svg>
                </span>
                <div className={styles.steplabel}>{s.step}</div>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.ctaRow}>
          <a href={BOOK} target="_blank" rel="noopener" className={styles.cta}>
            Start with a free consult <span>→</span>
          </a>
          <span className={styles.ctaNote}>
            No commitment. Free trial on every engagement.{' '}
            <Link href="/how-it-works" className={styles.inlineLink}>See the full process</Link>
          </span>
        </div>
      </div>
    </section>
  );
}