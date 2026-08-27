import styles from './HomeTrustBar.module.css';

/**
 * HomeTrustBar — the hero's trust strip. Static, not a ticker: the cells
 * spread across a rounded card at the bottom of the hero.
 *
 * Six cells, not the artboard's nine. The Trustpilot rating is split across
 * two of them the way the badge itself reads — the word and the stars, then
 * the wordmark and the review count — and the two ISO certifications share a
 * cell rather than repeating "Certified" twice.
 */
type Cell =
  | { kind: 'stars'; title: string }
  | { kind: 'logo'; src: string; alt: string; sub: string }
  | { kind: 'iso'; title: string; sub: string }
  | { kind: 'icon'; title: string; sub: string; icon: React.ReactNode };

const STAR = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

const CELLS: Cell[] = [
  { kind: 'stars', title: 'Excellent' },
  { kind: 'logo', src: '/images/trustpilot-logo.svg', alt: 'Trustpilot', sub: 'Based on 3 Reviews' },
  { kind: 'iso', title: 'ISO 9001/27001', sub: 'Certified' },
  {
    kind: 'icon',
    title: '2-week cycle',
    sub: 'Fully onboarded',
    icon: <><path d="M8 2v4M16 2v4M3 10h18" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="m9 16 2 2 4-4" /></>,
  },
  {
    kind: 'icon',
    title: '24/7 coverage',
    sub: 'any timezone',
    icon: <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />,
  },
  {
    kind: 'icon',
    title: 'Highest ranked agents',
    sub: 'vetted every seat',
    icon: <><circle cx="12" cy="9" r="5" /><path d="m8.5 13.5-1 7.5 4.5-2.7 4.5 2.7-1-7.5" /></>,
  },
];

function Stars() {
  return (
    <span className={styles.stars} aria-hidden="true">
      {[...Array(5)].map((_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d={STAR} /></svg>
      ))}
    </span>
  );
}

function CellBody({ cell }: { cell: Cell }) {
  switch (cell.kind) {
    case 'stars':
      // the word over the stars, the way the Trustpilot badge reads
      return (
        <span className={styles.text}>
          <span className={styles.title}>{cell.title}</span>
          <Stars />
        </span>
      );
    case 'logo':
      return (
        <span className={styles.text}>
          <img src={cell.src} alt={cell.alt} className={styles.trustpilot} />
          <span className={styles.sub}>{cell.sub}</span>
        </span>
      );
    case 'iso':
      return (
        <>
          <span className={styles.icon}>
            {/* one badge, not both — the label already names both standards */}
            <img src="/images/ISO_9001-2015.svg" alt="" className={styles.iso} />
          </span>
          <span className={styles.text}>
            <span className={styles.title}>{cell.title}</span>
            <span className={styles.sub}>{cell.sub}</span>
          </span>
        </>
      );
    default:
      return (
        <>
          <span className={styles.icon}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {cell.icon}
            </svg>
          </span>
          <span className={styles.text}>
            <span className={styles.title}>{cell.title}</span>
            <span className={styles.sub}>{cell.sub}</span>
          </span>
        </>
      );
  }
}

export default function HomeTrustBar() {
  return (
    <div className={styles.bar}>
      <div className={styles.card}>
        <div className={styles.row}>
          {CELLS.map((cell, i) => (
            <div className={styles.cell} key={i}>
              <CellBody cell={cell} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
