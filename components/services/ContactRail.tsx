import Image from 'next/image';
import ContactRailCta from './ContactRailCta';
import styles from './ContactRail.module.css';

/**
 * The "Let's Talk Outcomes" booking band.
 *
 * Shared across /services and individual service pages (including
 * /services/virtual-back-office-team).
 *
 * This is a banner, not a form. The brief intake used to sit inline in a split
 * card here — eight fields and a consent checkbox, on twelve pages, below the
 * fold on all of them. It now lives in a dialog behind one CTA: the band states
 * what the visitor gets and asks for a single click, and the fields only load
 * for the people who take it. `ContactRailCta` is the one client component in
 * the band; everything else on this page stays server-rendered.
 */

/** What the visitor actually gets back, in the order they get it. */
const PROMISES = [
  'A 30-minute review-and-plan call',
  'Seats, the rate, and a trial plan',
  'A reply within one business day',
];

export default function ContactRail() {
  return (
    <section id="contact" className={styles.rail}>
      <div className={styles.wrap}>
        <div className={styles.banner}>
          <div className={styles.bannerMain}>
            <div className={styles.bannerPhoto}>
              <Image
                src="/images/Agents/Virtual-assitant.png"
                alt="Rem Assist support specialist with headset"
                width={500}
                height={650}
                className={styles.bannerImg}
              />
            </div>

            <div className={styles.bannerCopy}>
              <h2 className={styles.bannerTitle}>
                Let&rsquo;s Talk <span>Outcomes</span>
              </h2>
              <p className={styles.bannerLede}>
                Tell us what needs covering — the work you want off your team&rsquo;s plate, the
                hours it eats, the tools it runs in. We come back with the seats, the rate, and a
                trial plan.
              </p>
            </div>

            <ContactRailCta />
          </div>

          <div className={styles.bannerRule} aria-hidden="true" />

          <div className={styles.bannerFoot}>
            <div className={styles.trustBadge}>
              <div className={styles.avatarStack}>
                <Image src="/images/Agents/cs-1.jpg" alt="" width={26} height={26} className={styles.avatarImg} />
                <Image src="/images/Agents/cs-2.jpg" alt="" width={26} height={26} className={styles.avatarImg} />
                <Image src="/images/Agents/cs-3.jpg" alt="" width={26} height={26} className={styles.avatarImg} />
                <Image src="/images/Agents/sdr-1.jpg" alt="" width={26} height={26} className={styles.avatarImg} />
              </div>
              <div className={styles.trustText}>
                <strong>Trusted by 100+ businesses</strong>
                <span>to build high-performing remote teams.</span>
              </div>
            </div>

            <ul className={styles.promises}>
              {PROMISES.map((p) => (
                <li className={styles.promise} key={p}>
                  <span className={styles.promiseTick} aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
