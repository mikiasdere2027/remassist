import type { Metadata } from 'next';
import QuizLogic from '@/components/quiz/QuizLogic';
import styles from './page.module.css';

export const metadata: Metadata = {
  // The root layout appends ' | Rem Assist'; carrying it here doubled it.
  title: 'Qualify — 2-Minute Price Estimate',
  description:
    'Five questions. Get the service line, the tier, and a monthly estimate with the arithmetic shown — not a range, and not a form wall.',
  alternates: { canonical: '/qualify' },
  openGraph: { url: '/qualify' },
};

export default function Qualify() {
  return (
    <main>
      <section style={{ background: 'linear-gradient(180deg,#f7faff 0%,var(--bg-marketing-paper) 58%)' }}>
        <div className={`${styles.wrap} ${styles.hero}`}>
          <span className={styles.kicker}>Qualify</span>
          <h1 className={styles.h1}>
            Find out what it costs<br />
            <span>before you talk to anyone.</span>
          </h1>
          <p className={styles.lede}>
            Five questions. At the end you get the service line, the tier, and a monthly estimate
            with the arithmetic shown — not a range, and not a form wall.
          </p>
          <div className={styles.chips}>
            <span className={styles.chip}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>About two minutes</span>
            <span className={styles.chip}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>No email required</span>
            <span className={styles.chip}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>Published rates, not “contact us”</span>
            <span className={styles.chip}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>Free trial either way</span>
          </div>
          <QuizLogic />
        </div>
      </section>
    </main>
  );
}