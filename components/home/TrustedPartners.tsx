import Image from 'next/image';
import type { CSSProperties } from 'react';
import shared from './HomeSections.module.css';
import styles from './TrustedPartners.module.css';

/**
 * TrustedPartners — "Teams that run on Rem Assist" (index.html, Phase 02).
 *
 * The artboard laid out seven plates, but five of them were unfilled
 * `image-slot` placeholders — design furniture waiting on real logos, not
 * clients. Only the two real partners are rendered here; empty plates on a
 * live site read as broken, and inventing logos to fill them is not an option.
 * Add entries to PARTNERS as logos arrive and the belt starts drifting on its
 * own once there are enough to loop without repeating on screen.
 */
const PARTNERS = [
  {
    name: 'Tano Group',
    logo: '/images/tano-group-logo.png',
    w: 320,
    h: 128,
    href: 'https://tanogrp.com/',
  },
  {
    name: 'LocateNMove',
    logo: '/images/locate-n-move-logo.png',
    w: 320,
    h: 188,
    href: null,
  },
  // href stays null until someone confirms the sites — a wrong link on a
  // client's name is worse than no link.
  {
    name: 'Fix My Foundation',
    logo: '/images/fix-my-foundation-logo.png',
    w: 320,
    h: 183,
    href: null,
  },
  {
    name: 'Mejia Auto',
    logo: '/images/mejia-auto-logo.png',
    w: 320,
    h: 107,
    href: null,
  },
  {
    name: 'Sprint Real Estate',
    logo: '/images/sprint-real-estate-logo.png',
    w: 320,
    h: 107,
    href: null,
  },
];

/** Below this the belt would show the same logo more than once at a time —
    on a desktop viewport. A phone shows one plate at a time, so the belt
    always drifts there; see the max-width: 767px block in the stylesheet. */
const DRIFT_THRESHOLD = 6;

export default function TrustedPartners() {
  const drift = PARTNERS.length >= DRIFT_THRESHOLD;
  /* The loop needs the list twice so translateX(-50%) lands on a seam. Both
     halves are always rendered because mobile always drifts; CSS drops the
     duplicates on a desktop that is showing a centred static row instead. */
  const plates = [...PARTNERS, ...PARTNERS];

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <span className={shared.eyebrow}>Trusted Partners</span>
        <div className={shared.head}>
          <h2 className={shared.title}>Teams that run on<br /><span>Rem Assist</span></h2>
          <div className={shared.aside}>
            <p className={shared.desc}>
              No matter the industry, organizations trust our teams to take work off their plate and
              keep it moving — quietly, accurately, every day.
            </p>
          </div>
        </div>
      </div>

      <div className={`${styles.belt} ${drift ? styles.beltDrift : ''}`}>
        <div className={`${styles.row} ${drift ? styles.rowDrift : ''}`}>
          {plates.map((p, i) => (
            <div
              key={`${p.name}-${i}`}
              className={`${styles.plateWrap}${i >= PARTNERS.length ? ` ${styles.dup}` : ''}`}
              style={{ '--plate-delay': `${(i % PARTNERS.length) * 0.55}s`, '--sheen-delay': `${(i % PARTNERS.length) * 0.85}s` } as CSSProperties}
              aria-hidden={i >= PARTNERS.length || undefined}
            >
              <div className={styles.plate}>
                <span className={styles.sheen} aria-hidden="true" />
                {p.href ? (
                  <a className={styles.link} href={p.href} target="_blank" rel="noopener">
                    <Image className={styles.logo} src={p.logo} alt={p.name} width={p.w} height={p.h} sizes="150px" />
                  </a>
                ) : (
                  <Image className={styles.logo} src={p.logo} alt={p.name} width={p.w} height={p.h} sizes="150px" />
                )}
              </div>
            </div>
          ))}
        </div>
        {/* Always rendered — the mobile belt drifts even when the desktop one
            does not. CSS hides them on a static desktop row. */}
        <span className={styles.fadeL} aria-hidden="true" />
        <span className={styles.fadeR} aria-hidden="true" />
      </div>
    </section>
  );
}
