import type { ReactNode } from 'react';
import styles from './TalentPool.module.css';

/**
 * "What you get" — managed talent pool section on /services.
 *
 * Replaces the unstyled raw copy block with a high-conversion, executive SaaS layout:
 * - 92% retention metric highlighted as an elevated stat card.
 * - 6 distinct benefit cards featuring custom icons, categorical tags, and bolded lead metrics.
 */

interface Point {
  label: string;
  lead: string;
  rest: string;
  icon: ReactNode;
}

const POINTS: Point[] = [
  {
    label: 'Shortlist',
    lead: '24–48 hours',
    rest: 'to shortlist candidates — you interview before they start',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 15" />
      </svg>
    ),
  },
  {
    label: 'Onboarding',
    lead: '~2 weeks',
    rest: 'to have your team fully onboarded and handling real tasks',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="m9 16 2 2 4-4" />
      </svg>
    ),
  },
  {
    label: 'Vetting',
    lead: 'All candidates verified',
    rest: 'in person for skills, communication, and reliability',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <polyline points="16 11 18 13 22 9" />
      </svg>
    ),
  },
  {
    label: 'QA Oversight',
    lead: 'Dedicated QA oversight',
    rest: ', team leads, and managed performance support',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    label: 'Terms',
    lead: 'Flexible terms',
    rest: ': effortlessly scale, add, or adjust seats as needed',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
  },
  {
    label: 'Seniority',
    lead: '>80% regular or senior',
    rest: 'operators with 5+ years of real business experience',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="7" />
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
      </svg>
    ),
  },
];

export default function TalentPool() {
  return (
    <section className={styles.section} aria-labelledby="talent-heading">
      <div className={styles.wrap}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>What you get</p>
          <h2 className={styles.h2} id="talent-heading">
            Access to a managed talent pool <span>built for your operations.</span>
          </h2>
        </div>

        <div className={styles.grid}>
          <div className={styles.aside}>
            <p className={styles.lede}>
              You don&rsquo;t just get &ldquo;a VA.&rdquo; You get a dedicated virtual professional,
              matched to your workflows and backed by a managed system that handles quality,
              continuity, and performance for you.
            </p>

            <div className={styles.statCard}>
              <div className={styles.statBadge}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
                <span>Why Clients Stay</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statNumber}>92%</span>
                <span className={styles.statHeadline}>of our customers stay with us for years.</span>
              </div>
              <p className={styles.statDesc}>
                Their workload gets lighter, operations run smoother, and they can scale without
                becoming HR managers.
              </p>
            </div>
          </div>

          <ul className={styles.points}>
            {POINTS.map((p) => (
              <li key={p.label} className={styles.point}>
                <div className={styles.pointHeader}>
                  <span className={styles.pointIco}>{p.icon}</span>
                  <span className={styles.pointLabel}>{p.label}</span>
                </div>
                <p className={styles.pointText}>
                  <strong>{p.lead}</strong> {p.rest}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
