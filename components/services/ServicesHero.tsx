import Image from 'next/image';
import FeaturedCarousel from './FeaturedCarousel';
import styles from './ServicesHero.module.css';

/**
 * The /services opening — headline and the three featured lines in one
 * full-height section.
 *
 * These were two stacked navy sections with a seam between them: a photo hero
 * that spent a whole screen on a title, then a second band repeating the same
 * argument before finally showing the three lines. Merged, the first screen
 * says what the page is and shows where to start, and the photograph runs the
 * whole height behind both.
 *
 * The second section's lede AND its heading both went in the merge rather than
 * being reworded. "Most clients buy a seat, not a service" is what the hero
 * lede already says and what the strip under the directory says a third time;
 * "Where teams start / Three lines, and the bench behind them" was a title for
 * three cards that are visibly three cards. One statement of the argument is
 * enough, and the cards introduce themselves.
 *
 * Server component — no interactivity here.
 *
 * The three featured lines are a carousel now (FeaturedCarousel), not three
 * cards side by side — one at a time gets the width to show its roles two-up
 * beside a photograph. The slides carry the category ids, so /services#finance
 * and the like still land on them; the other six ids live on the tab panels in
 * ServiceDirectory.
 *
 * NOT built from the reference: the floating "Focused on results / More
 * conversations. More pipeline. More growth." callout on the photograph. That
 * is a per-category claim this site does not make anywhere, and inventing
 * three of them to fill a box is how a page ends up asserting things nobody
 * signed off. Say the word and it goes in with real copy.
 */

const TRUST = [
  {
    title: 'Trained & Vetted',
    text: 'You interview before they start',
    icon: <><path d="M12 3l7 3v6c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  },
  {
    title: 'Scalable Teams',
    text: 'Add or adjust seats, flexible terms',
    icon: <><circle cx="9" cy="8" r="3.2" /><path d="M3 19v-1.2A4.8 4.8 0 0 1 7.8 13h2.4" /><path d="M17 5.2a3.2 3.2 0 0 1 0 6.2M21 19v-1.2a4.6 4.6 0 0 0-3.2-4.4" /></>,
  },
  {
    title: 'Backed by Support',
    text: 'QA and oversight on every seat',
    icon: <><path d="M4 17v-5a8 8 0 0 1 16 0v5" /><path d="M20 18a2 2 0 0 1-2 2h-.8a1.8 1.8 0 0 1-1.8-1.8v-2.4A1.8 1.8 0 0 1 17.2 14H20zM4 18a2 2 0 0 0 2 2h.8a1.8 1.8 0 0 0 1.8-1.8v-2.4A1.8 1.8 0 0 0 6.8 14H4z" /></>,
  },
];

export default function ServicesHero() {
  return (
    <section className={styles.hero} aria-labelledby="services-heading">
      {/* Cover photograph. alt is empty on purpose: it is the backdrop the
          headline sits on and carries nothing the copy does not already say,
          so a screen reader should skip it rather than narrate the furniture.
          priority because this is the page's LCP element. */}
      <div className={styles.media}>
        <Image src="/images/Rem-Teams.jpeg" alt="" fill priority sizes="100vw" />
      </div>

      <div className={styles.inner}>
        <div>
          <span className={styles.eyebrow}>All Services</span>
          <h1 className={styles.h1} id="services-heading">
            Every remote role we staff, <span>in one place.</span>
          </h1>
          <p className={styles.lede}>
            One trained seat often covers several of these at once — that is the point. Take a
            single role, or a whole pod.
          </p>

          {/* Three claims, each one the site already makes in its own words —
              the vetting and interview step, the flexible-terms line from the
              FAQ, and the QA commitment from the service pages. Deliberately
              no seat-count figure: nothing on this site says how many seats an
              engagement can reach, and a number here would be the only place
              it was ever stated. */}
          <ul className={styles.trust}>
            {TRUST.map((t) => (
              <li key={t.title}>
                <span className={styles.trustIco}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg>
                </span>
                <span>
                  <b>{t.title}</b>
                  <em>{t.text}</em>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <span className={styles.gap} />

        <div>
          <FeaturedCarousel />
        </div>
      </div>
    </section>
  );
}
