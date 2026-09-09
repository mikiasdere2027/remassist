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
        </div>

        <span className={styles.gap} />

        <div>
          <FeaturedCarousel />
        </div>
      </div>
    </section>
  );
}
