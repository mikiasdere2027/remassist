import Image from 'next/image';
import styles from './Hero.module.css';
import { BOOK_URL } from '@/lib/nav';

/**
 * The /how-it-works opening.
 *
 * Built to the reference: the eyebrow pill, the two-tone headline and the lede
 * on the left, the photograph on the right with four markers floating off it,
 * and the four promises spread into cards along the bottom.
 *
 * Two departures from the reference, both deliberate:
 *
 *  - The headline and lede are this page's own, not the reference's. The words
 *    on the reference ("What actually happens, and who does it") are not used
 *    anywhere on the page any more — the hero says where you end up and the
 *    phases section says how, and a page that asked the same question twice in
 *    two screens would have lost the thread of its own argument.
 *
 *  - The markers on the photograph say something. In the reference they are
 *    grey placeholder bars, which is a picture of an interface rather than an
 *    interface — and this page is already about not promising machinery that
 *    does not exist. Each one carries a line that is true and is delivered
 *    further down the page: the mapping in phase one, the named supervisor in
 *    phase two, and the two reporting commitments in the band near the foot.
 *
 * The four cards were the four chips this hero used to carry. They said only
 * their headline, which made them decoration; a card has room for the sentence
 * that makes the claim worth reading, and each sentence here is the summary of
 * a section below rather than a new promise.
 *
 * Server component — nothing here is interactive.
 */

/** Floating markers, in the reading order the reference puts them in: two down
    the left of the photograph, two down the right. */
const MARKERS = [
  {
    side: 'left' as const,
    label: 'Strategy',
    line: 'Seats and coverage mapped',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.4" />
        <circle cx="12" cy="12" r="3.4" />
        <path d="m15.6 8.4 3.7-3.7" />
      </svg>
    ),
  },
  {
    side: 'left' as const,
    label: 'Team',
    line: 'A supervisor by name',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9.4" cy="9" r="3.4" />
        <path d="M3.4 19a6 6 0 0 1 12 0" />
        <path d="M16.2 6.2a3.2 3.2 0 0 1 0 6.1" />
        <path d="M18 14.4a5.7 5.7 0 0 1 3 4.6" />
      </svg>
    ),
  },
  {
    side: 'right' as const,
    label: 'Progress',
    line: 'Hourly work logs',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 19V11" />
        <path d="M12 19V5" />
        <path d="M19 19v-5.5" />
      </svg>
    ),
  },
  {
    side: 'right' as const,
    label: 'Results',
    line: 'A written daily report',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="9.2" r="5.2" />
        <path d="m8.6 13.6-1.4 7 4.8-2.6 4.8 2.6-1.4-7" />
      </svg>
    ),
  },
];

/** The four promises. Each one summarises a section further down this page. */
const PROMISES = [
  {
    title: 'Consultation is always free',
    body: 'Bring the volume and the hours. You leave the call knowing the seats, the tier and the rate.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 12.4a7.4 7.4 0 0 1-7.6 7.4 8.3 8.3 0 0 1-3.4-.7L4 20.5l1.4-4.6A7.2 7.2 0 0 1 4.4 12 7.4 7.4 0 0 1 12 4.6a7.4 7.4 0 0 1 8 7.8Z" />
      </svg>
    ),
  },
  {
    title: 'About two weeks to live',
    body: 'First call to a trained pod, most of the time. Where your process is already written down, sooner.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.4" />
        <path d="M12 7.2V12l3.2 2.1" />
      </svg>
    ),
  },
  {
    title: 'You interview and approve',
    body: 'Interview the shortlist or approve it. Nobody is assigned to your account without your sign-off.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10" cy="8.8" r="3.6" />
        <path d="M3.8 19.2a6.4 6.4 0 0 1 11.2-4.2" />
        <path d="m15.6 18.4 2 2 4-4.2" />
      </svg>
    ),
  },
  {
    title: 'Pilot before a full rollout',
    body: 'Start small, prove the work, then scale. Seats come off again as easily as they went on.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3c2.9 2.5 4.4 5.6 4.4 9.1L12 16.6l-4.4-4.5C7.6 8.6 9.1 5.5 12 3Z" />
        <circle cx="12" cy="10" r="1.7" />
        <path d="M9.2 17.1c-1.3 1.3-1.6 3-1.6 3.9 1.2-.2 2.8-.7 3.8-1.9" />
        <path d="M14.8 17.1c1.3 1.3 1.6 3 1.6 3.9-1.2-.2-2.8-.7-3.8-1.9" />
      </svg>
    ),
  },
];

export default function Hero() {
  return (
    <section className={styles.hero}>
      {/* The pale disc and the dotted arcs behind the photograph. Decorative:
          the reference draws a world map here, and a map is a claim about where
          the agents are — Rem Assist staffs from one place, so a globe with
          nodes scattered over it would be a picture of a different company. */}
      <span className={styles.glow} aria-hidden="true" />
      <svg className={styles.arcs} viewBox="0 0 420 420" aria-hidden="true">
        <circle cx="210" cy="210" r="198" />
        <circle cx="210" cy="210" r="150" />
        <circle cx="210" cy="210" r="102" />
      </svg>

      <div className={styles.wrap}>
        <div className={styles.top}>
          <div className={styles.copy}>
            <span className={styles.pill}>
              <i>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="9" cy="9" r="3.2" />
                  <path d="M3.6 18.4a5.6 5.6 0 0 1 10.8 0" />
                  <path d="M15.4 6.4a3 3 0 0 1 0 5.6" />
                  <path d="M17 13.6a5.3 5.3 0 0 1 3 4.3" />
                </svg>
              </i>
              How it works
            </span>

            <h1 className={styles.h1}>
              From first call to <span>a working pod.</span>
            </h1>
            <p className={styles.lede}>
              Four phases, roughly two weeks, and you approve the people before they start. Here is
              the whole thing written down — including what we need from you, and what happens if it
              does not work out.
            </p>

            <div className={styles.cta}>
              <a
                className={styles.btn}
                href={BOOK_URL}
                target="_blank"
                rel="noopener"
              >
                Book a free consult
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
              </a>
              <a className={`${styles.btn} ${styles.btnGhost}`} href="/qualify">
                Qualify in two minutes
              </a>
            </div>
          </div>

          <div className={styles.media}>
            <div className={styles.shot}>
              {/* The page's LCP element, hence priority. alt is empty: the
                  photograph is the mood of the page, and everything it could be
                  said to show is written beside it. */}
              <Image
                src="/images/Agents/how-it-work-hero.png"
                alt=""
                fill
                priority
                sizes="(max-width: 900px) 94vw, 52vw"
              />
            </div>

            {/* Hidden from assistive tech and from narrow screens alike: the
                lines are repeated in full further down the page, so on a screen
                with no room for them nothing is lost. */}
            <div className={styles.markers} aria-hidden="true">
              {MARKERS.map((m) => (
                <span
                  key={m.label}
                  className={`${styles.marker} ${m.side === 'left' ? styles.markerLeft : styles.markerRight}`}
                >
                  <span className={styles.markerIco}>{m.icon}</span>
                  <span className={styles.markerText}>
                    <b>{m.label}</b>
                    <em>{m.line}</em>
                  </span>
                  <svg className={styles.markerTick} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m7.6 12.4 3 3 5.8-6.4" />
                  </svg>
                </span>
              ))}
            </div>
          </div>
        </div>

        <ul className={styles.cards}>
          {PROMISES.map((p) => (
            <li key={p.title} className={styles.card}>
              <span className={styles.cardIco}>{p.icon}</span>
              <div>
                <b>{p.title}</b>
                <p>{p.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
