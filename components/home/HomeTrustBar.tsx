import styles from './HomeTrustBar.module.css';

/**
 * HomeTrustBar — the hero's trust strip, ported from the DCLogic
 * `heroMarqueeItems` array in index.html. Static: the cells spread across a
 * white pill at the bottom of the hero rather than scrolling past. No state,
 * no animation, so it stays a plain server-rendered component.
 */
const ITEMS: { title: string; sub: string }[] = [
  { title: 'Excellent', sub: 'Based on 3 reviews' },
  { title: 'Trustpilot', sub: 'Rated Excellent' },
  { title: 'ISO 9001', sub: 'Certified' },
  { title: 'ISO 27001', sub: 'Certified' },
  { title: '2-week cycle', sub: 'Fully onboarded' },
  { title: '24/7 coverage', sub: 'any timezone' },
  { title: 'Highest ranked agents', sub: 'vetted every seat' },
];

/** Icon glyph per item — the template engine escaped SVG, so it's keyed here. */
function itemIcon(title: string) {
  switch (title) {
    case 'Excellent':
      return (
        <span className={styles.stars} aria-hidden="true">
          {[...Array(5)].map((_, i) => (
            <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          ))}
        </span>
      );
    case 'Trustpilot':
      return <img src="/images/trustpilot-logo.svg" alt="Trustpilot" className={styles.trustpilot} />;
    case 'ISO 9001':
    case 'ISO 27001':
      return <img src={`/images/${title === 'ISO 9001' ? 'ISO_9001-2015' : 'ISO_27001-2022'}.svg`} alt="" className={styles.iso} />;
    case '24/7 coverage':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>;
    default:
      return null;
  }
}

export default function HomeTrustBar() {
  return (
    <div className={styles.bar}>
      <div className={styles.card}>
        <div className={styles.row}>
          {ITEMS.map((item) => (
            <div className={styles.cell} key={item.title}>
              <span className={styles.icon}>{itemIcon(item.title)}</span>
              <span className={styles.text}>
                <span className={styles.title}>{item.title}</span>
                <span className={styles.sub}>{item.sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
