import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './not-found.module.css';

/**
 * 404. Deliberately signposted rather than decorative: the redirect map (§11.3)
 * cannot cover every legacy WordPress URL, so real visitors will land here from
 * old links and need somewhere to go. `noindex` keeps it out of the index.
 */
export const metadata: Metadata = {
  title: 'Page not found',
  description: 'That page has moved or no longer exists.',
  robots: { index: false, follow: true },
};

const LINKS = [
  { href: '/services/extra-services', label: 'All services', note: 'Every seat we staff' },
  { href: '/pricing', label: 'Pricing', note: 'Two published rates' },
  { href: '/how-it-works', label: 'How it works', note: 'First call to working pod' },
  { href: '/qualify', label: 'Get an estimate', note: 'Five questions, two minutes' },
];

export default function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <span className={styles.code}>404</span>
        <h1 className={styles.h1}>That page has moved.</h1>
        <p className={styles.lede}>
          The link you followed points at a page that no longer exists. Everything below is still
          here — or start from the <Link href="/">home page</Link>.
        </p>
        <ul className={styles.links}>
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link className={styles.card} href={l.href}>
                <span className={styles.cardLabel}>{l.label}</span>
                <span className={styles.cardNote}>{l.note}</span>
                <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
