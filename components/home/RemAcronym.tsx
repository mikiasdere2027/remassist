import shared from './HomeSections.module.css';
import styles from './RemAcronym.module.css';
import { BOOK_URL } from '@/lib/nav';

/**
 * RemAcronym — "REM — It's in the name" (index.html, Phase 02). Six letter
 * cards spelling REMOTE, followed by the blue promise bar. Static markup, so
 * this stays a server component.
 */
/**
 * The RA monogram (public/images/RA Logo.svg), inlined rather than loaded as an
 * <img>: an SVG image cannot see the page's fonts, so "ASSIST" fell back to
 * Arial. Inline, the text is set in Sora, the site's own display face.
 */
function RaLogo() {
  return (
    <svg className={styles.raLogo} viewBox="0 0 772.35 633.08" role="img" aria-label="Rem Assist">
      <g fill="#239ad6">
        <polygon points="224.73 129.53 218.65 142.49 184.2 215.96 108.43 377.61 22.79 377.61 98.69 215.96 139.28 129.53 224.73 129.53" />
        <polygon points="425.24 377.61 339.59 377.61 263.82 215.96 229.38 142.49 223.3 129.53 308.74 129.53 348.4 213.99 425.24 377.61" />
        <path d="M425,107.98c0,52.57-37.57,96.37-87.33,106.01l-39.67-84.46h19.01c11.9,0,21.54-9.65,21.54-21.54,0-5.94-2.41-11.33-6.31-15.24-3.89-3.89-9.28-6.31-15.24-6.31h-157.52L200.09,0h116.93c59.63,0,107.98,48.35,107.98,107.98Z" />
        <path d="M337.67,213.99c-6.68,1.3-13.59,1.97-20.65,1.97H98.69l40.59-86.44h158.73l39.67,84.46Z" />
        <path d="M750.17,375.64c-6.68,1.3-13.59,1.97-20.65,1.97h-218.33l40.59-86.44h158.73l39.67,84.46Z" />
        <polygon points="764.39 377.61 678.75 377.61 568.53 142.49 458.31 377.61 372.67 377.61 549.97 0 587.08 0 764.39 377.61" />
        <text x="386.17" y="573.87" textAnchor="middle" textLength="772" lengthAdjust="spacingAndGlyphs"
          style={{ fontFamily: 'var(--font-display)', fontSize: 208.46, fontWeight: 800 }}>ASSIST</text>
      </g>
    </svg>
  );
}

const BOOK = BOOK_URL;

const LETTERS = [
  {
    letter: 'R',
    title: 'Results-driven',
    note: 'We focus on outcomes that move your business forward.',
    icon: <><circle cx="10.5" cy="13.5" r="7.5" /><circle cx="10.5" cy="13.5" r="3.5" /><path d="M10.5 13.5 21 3" /><path d="M16.5 3H21v4.5" /></>,
  },
  {
    letter: 'E',
    title: 'Efficient',
    note: 'Lean processes, smart systems, and zero idle time.',
    icon: <><circle cx="12" cy="12" r="3.2" /><path d="M18.7 14.6a1.5 1.5 0 0 0 .3 1.7l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.5 1.5 0 0 0-2.6 1.1v.2a1.9 1.9 0 1 1-3.8 0v-.1a1.5 1.5 0 0 0-2.6-1.2l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.5 1.5 0 0 0-1.1-2.6h-.2a1.9 1.9 0 1 1 0-3.8h.1a1.5 1.5 0 0 0 1.2-2.6l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.5 1.5 0 0 0 2.6-1.1v-.2a1.9 1.9 0 1 1 3.8 0v.1a1.5 1.5 0 0 0 2.6 1.2l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.5 1.5 0 0 0 1.1 2.6h.2a1.9 1.9 0 1 1 0 3.8h-.1a1.5 1.5 0 0 0-1.4.9z" /></>,
  },
  {
    letter: 'M',
    title: 'Matching your culture',
    note: 'We adopt your tone, your tools and your way of working.',
    icon: <><path d="M15.5 20.5v-1.8a3.7 3.7 0 0 0-3.7-3.7H6.2a3.7 3.7 0 0 0-3.7 3.7v1.8" /><circle cx="9" cy="7.2" r="3.7" /><path d="M21.5 20.5v-1.8a3.7 3.7 0 0 0-2.8-3.6" /><path d="M15.8 3.7a3.7 3.7 0 0 1 0 7.1" /></>,
  },
  {
    letter: 'O',
    title: 'On target',
    note: 'We stay focused on the goals that actually matter.',
    icon: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.4" /><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" /></>,
  },
  {
    letter: 'T',
    title: 'Thoroughly excellent',
    note: 'We hold ourselves to a high standard in every interaction.',
    icon: <><circle cx="12" cy="9" r="5.8" /><path d="m8.4 14.1-1.1 7.4 4.7-2.8 4.7 2.8-1.1-7.4" /><path d="m12 6.4.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L9.1 8.6l2-.3z" /></>,
  },
  {
    letter: 'E',
    title: 'Every time',
    note: 'You can count on consistent delivery, every time.',
    icon: <><circle cx="12" cy="12" r="8.5" /><path d="M12 6.8V12l3.4 2" /></>,
  },
];

export default function RemAcronym() {
  return (
    <section style={{ background: 'linear-gradient(180deg,#f7faff 0%,#ffffff 58%)', borderBottom: '1px solid var(--border-default)' }}>
      <div className={styles.wrap}>
        <span className={shared.eyebrow}>Rem Assist</span>
        <div className={shared.head}>
          <div className={styles.titleCol}>
            <h2 className={shared.title}><span>REM</span>&#8202;— It&rsquo;s in the name</h2>
            <RaLogo />
          </div>
          <div className={shared.aside}>
            <p className={shared.desc}>
              Our name reflects how we deliver impact. Every engagement is built around our{' '}
              <b style={{ color: 'var(--brand-blue)', fontWeight: 700 }}>REMOTE</b> standard — so you get
              clarity, consistency, and results you can count on.
            </p>
          </div>
        </div>

        <ul className={styles.grid}>
          {LETTERS.map((l) => (
            <li className={styles.card} key={l.title}>
              <span className={styles.cardHead}>
                <span className={styles.letter}>{l.letter}</span>
                <span className={styles.icon}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{l.icon}</svg>
                </span>
              </span>
              <h3 className={styles.cardTitle}>{l.title}</h3>
              <span className={styles.tick} aria-hidden="true" />
              <p className={styles.note}>{l.note}</p>
            </li>
          ))}
        </ul>

        <div className={styles.promise}>
          <span className={styles.promiseL}>
            <span className={styles.promiseI}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>
            </span>
            <span>
              <span className={styles.promiseT}>REMOTE by name. Remarkable by nature.</span>
              <span className={styles.promiseS}>That&rsquo;s the Rem Assist promise.</span>
            </span>
          </span>
          <a className={styles.promiseCta} href={BOOK} target="_blank" rel="noopener">Book a Call</a>
        </div>
      </div>
    </section>
  );
}
