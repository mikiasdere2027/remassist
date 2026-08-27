import Image from 'next/image';
import styles from './HomeSections.module.css';

/**
 * TiersSection — "One bench, two kinds of depth" (index.html, Phase 02).
 * Pro ($8/hr) + Expert ($11/hr) tiers with the ISO 9001/27001 certification card.
 * The left column is a photo plate above that card; both columns are the same
 * height, so the plate flexes rather than carrying a fixed size.
 */
const TIERS = [
  {
    expert: false,
    title: 'Pro',
    price: '$8',
    text: 'Fully trained, fit for work from day one. Pro agents clear our core program and pick up any software you run — CRM, helpdesk, billing, scheduling, or the tool you built in-house.',
    chips: ['Any stack', 'Core program certified', 'Best value per seat'],
    icon:
      <><path d="M4 16v-4a8 8 0 0 1 16 0v4" /><path d="M20 17a2.5 2.5 0 0 1-2.5 2.5H17a1.6 1.6 0 0 1-1.6-1.6v-2.3A1.6 1.6 0 0 1 17 14h3zM4 17a2.5 2.5 0 0 0 2.5 2.5H7a1.6 1.6 0 0 0 1.6-1.6v-2.3A1.6 1.6 0 0 0 7 14H4z" /><path d="M15.4 19.9a2.6 2.6 0 0 1-2.6 2.1h-1" /></>,
  },
  {
    expert: true,
    title: 'Expert',
    price: '$11',
    text: 'More years on the job and a far more rigorous assessment path. Experts arrive already fluent in your motion and need the least direction — we walk through real examples on the call.',
    chips: ['Client-facing', 'Highest-vetted seat', 'Owns outcomes'],
    icon:
      <><circle cx="12" cy="9" r="6" /><path d="m8.2 14.2-1.2 7.6 5-3 5 3-1.2-7.6" /><path d="m12 6.2.95 2 2.15.3-1.55 1.5.37 2.1L12 11.1l-1.92 1-.37-2.1L8.16 8.5l2.15-.3z" /></>,
  },
];

const CHECK =
  <><circle cx="12" cy="12" r="9" /><path d="m8.4 12.2 2.4 2.4 4.8-5" /></>;

export default function TiersSection() {
  return (
    <section
      className={styles.section}
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
          <div className={styles.duoCol}>
            {/* A photograph, not the old agent-duo vector. It fills whatever
                height the ISO card leaves, so this column ends level with the
                two tier cards opposite. */}
            <div className={styles.duo}>
              <Image
                src="/images/Agents/Virtual-assitant.jpg"
                alt="A Rem Assist support agent wearing a headset"
                fill
                sizes="(max-width: 1024px) 92vw, 40vw"
                style={{ objectFit: 'cover', objectPosition: '66% 22%' }}
              />
            </div>
            {/* id is a link target: the blog article links to /#certifications */}
            <div className={styles.isoCard} id="certifications">
              <span className={styles.isoShield}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6 4.5 6v6c0 4.6 3.2 8.4 7.5 9.4 4.3-1 7.5-4.8 7.5-9.4V6z" /><path d="m8.6 12.2 2.4 2.4 4.6-5" /></svg>
              </span>
              <div>
                <span className={styles.isoTop}>Independently certified</span>
                <h3 className={styles.isoTitle}>Quality and security, audited</h3>
                <p className={styles.isoText}>
                  Every seat — Pro or Expert — operates under ISO 9001 quality management and ISO
                  27001 information security.
                </p>
                <div className={styles.isoMarks}>
                  <span className={styles.isoChip}><img src="/images/ISO_9001-2015.svg" alt="ISO 9001:2015 certified" /></span>
                  <span className={styles.isoChip}><img src="/images/ISO_27001-2022.svg" alt="ISO 27001:2022 certified" /></span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.tiers}>
            {TIERS.map((t) => (
              <div key={t.title} className={`${styles.tier} ${t.expert ? styles.tierExpert : ''}`}>
                <span className={styles.tierIcon}><svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg></span>
                <div>
                  <h3 className={styles.tierTitle}>{t.title}</h3>
                  <span className={styles.tierPrice}><small>from</small><b>{t.price}</b><em>/hr</em></span>
                  <p className={styles.tierText}>{t.text}</p>
                  <div className={styles.tierChips}>
                    {t.chips.map((c) => (
                      <span className={styles.tierChip} key={c}><svg viewBox="0 0 24 24" aria-hidden="true">{CHECK}</svg>{c}</span>
                    ))}
                  </div>
                </div>
                <span className={styles.tierGo}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}