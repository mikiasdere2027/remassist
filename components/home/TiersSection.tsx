import Image from 'next/image';
import styles from './HomeSections.module.css';

/**
 * TiersSection — "One bench, two kinds of depth" (index.html, Phase 02).
 * Pro ($8/hr) + Expert ($11/hr) tiers, each a photo plate with the detail card
 * floating over its lower edge. Both cards share one grid row, so the two plates
 * and the two white cards line up whatever the copy length.
 * The ISO statement lives in the section header; the id below is the link target
 * the blog article uses (/#certifications).
 */
const TIERS = [
  {
    title: 'Pro',
    price: '$8',
    text: 'Fully trained, fit for work from day one. They clear our core program and pick up any software you run — CRM, helpdesk, billing, or your in-house tools.',
    chips: ['Any stack', 'Core certified', 'Best value per seat'],
    img: '/images/Agents/Pro.jpg',
    alt: 'A Rem Assist Pro agent working a support queue across two monitors',
    /* The plate crops the sides off a landscape source, so each tier points the
       crop at its own subject rather than the desk beside them. */
    focus: '62% 34%',
  },
  {
    title: 'Expert',
    price: '$11',
    text: 'More years on the job and a far tougher assessment path. Experts arrive fluent in your motion and need the least direction.',
    chips: ['Client-facing', 'Highest-vetted seat', 'Owns outcomes'],
    img: '/images/Agents/Expert.jpg',
    alt: 'A Rem Assist Expert agent working client-facing from a meeting room',
    focus: '38% 30%',
  },
];

const CHECK =
  <><circle cx="12" cy="12" r="9" /><path d="m8.4 12.2 2.4 2.4 4.8-5" /></>;

export default function TiersSection() {
  return (
    <section
      className={styles.section}
      id="certifications"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 900px 450px at 85% 0%, rgba(90,155,240,0.20), transparent 65%),linear-gradient(160deg,#518de0,#0047b3 82%)',
      }}
    >
      <div className={styles.wrap}>
        <span className={`${styles.eyebrow} ${styles.eyebrowDark}`}>Our Leverage</span>
        <div className={styles.head}>
          <h2 className={`${styles.title} ${styles.titleLight}`}>One bench,<br />two kinds of depth.</h2>
          <div className={styles.aside}>
            <p className={styles.desc} style={{ color: 'rgba(255,255,255,0.82)' }}>
              Every seat — Pro or Expert — operates under ISO 9001 quality management and ISO 27001
              information security.
            </p>
          </div>
        </div>

        <div className={styles.levGrid}>
          {TIERS.map((t) => (
            <article key={t.title} className={styles.tier}>
              <div className={styles.tierMedia}>
                <Image
                  src={t.img}
                  alt={t.alt}
                  fill
                  sizes="(max-width: 1024px) 92vw, 45vw"
                  style={{ objectFit: 'cover', objectPosition: t.focus }}
                />
              </div>
              <div className={styles.tierBody}>
                <div className={styles.tierTop}>
                  <h3 className={styles.tierTitle}>{t.title}</h3>
                  <span className={styles.tierPrice}><small>from</small><b>{t.price}</b><em>/hr</em></span>
                </div>
                <p className={styles.tierText}>{t.text}</p>
                {/* Chips and the arrow share the last row, so the arrow sits on
                    the baseline of the card however many lines the chips take. */}
                <div className={styles.tierFoot}>
                  <div className={styles.tierChips}>
                    {t.chips.map((c) => (
                      <span className={styles.tierChip} key={c}><svg viewBox="0 0 24 24" aria-hidden="true">{CHECK}</svg>{c}</span>
                    ))}
                  </div>
                  <span className={styles.tierGo}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
