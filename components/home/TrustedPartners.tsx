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
    logo: '/uploads/tano-logo-clean.png',
    w: 750,
    h: 745,
    href: 'https://tanogrp.com/',
  },
  {
    name: 'LocateNMove',
    logo: '/uploads/locatenmovebluelogo.png',
    w: 807,
    h: 527,
    href: null,
  },
];

/** Below this the belt would show the same logo more than once at a time. */
const DRIFT_THRESHOLD = 6;

export default function TrustedPartners() {
  const drift = PARTNERS.length >= DRIFT_THRESHOLD;
  // the loop needs the list twice so translateX(-50%) lands on a seam
  const plates = drift ? [...PARTNERS, ...PARTNERS] : PARTNERS;

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

      <div className={styles.belt}>
        <div className={`${styles.row} ${drift ? styles.rowDrift : ''}`}>
          {plates.map((p, i) => (
            <div
              key={`${p.name}-${i}`}
              className={styles.plateWrap}
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
        {drift && <><span className={styles.fadeL} aria-hidden="true" /><span className={styles.fadeR} aria-hidden="true" /></>}
      </div>
    </section>
  );
}
