import Link from 'next/link';
import shared from './HomeSections.module.css';
import styles from './StepsSection.module.css';

/**
 * StepsSection — "From consult to coverage in four simple steps" (index.html,
 * Phase 02). Uses the same steps data the home DCLogic defined.
 */

const STEPS = [
  {
    n: '01',
    step: 'Step 1',
    title: 'Free consultation',
    desc: 'Tell us the services you need and expected interaction volume. Always free.',
    icon:
      <path d="M8 10h8M8 14h5M21 12a8 8 0 0 1-8 8H7l-4 3v-6.5A8 8 0 0 1 11 4h2a8 8 0 0 1 8 8Z"></path>,
  },
  {
    n: '02',
    step: 'Step 2',
    title: 'Team design',
    desc: 'We scope the personnel mix — generalists, specialists, or both — with pricing and terms.',
    icon: <path d="M16 20v-1.8a3.7 3.7 0 0 0-3.7-3.7H6.7A3.7 3.7 0 0 0 3 18.2V20M12 7.5a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4ZM21 20v-1.8a3.7 3.7 0 0 0-2.8-3.6"></path>,
  },
  {
    n: '03',
    step: 'Step 3',
    title: 'Pick your agents',
    desc: 'Review profiles and run quick interviews — or leave selection to our experts.',
    icon: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>,
  },
  {
    n: '04',
    step: 'Step 4',
    title: 'Monitored delivery',
    desc: 'AI-assisted monitoring, hourly work logs, and daily email reports on every seat.',
    icon: <path d="M9 19c-4.3 1.4-6.5-.4-6.5-.4C5 13 9 4.5 12 4.5s7 8.5 9.5 13.1c0 0-2.2 1.8-6.5.4M14 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"></path>,
  },
];

const BOOK = 'https://calendly.com/j-zemene-remassistance/new-meeting';

export default function StepsSection() {
  return (
    <section
      className={styles.section}
      style={{
        backgroundImage:
          'radial-gradient(ellipse 900px 450px at 85% 0%, rgba(90,155,240,0.20), transparent 65%),linear-gradient(160deg,#518de0,#0047b3 82%)',
      }}
    >
      <div className={styles.wrap}>
        <span className={`${shared.eyebrow} ${shared.eyebrowDark}`}>How It Works</span>
        {/* the artboard uses the shared header here with its dark modifier */}
        <div className={`${shared.head} ${shared.headDark}`}>
          <h2 className={shared.title}>
            From consult to coverage<br />in four simple steps
          </h2>
          <div className={shared.aside}>
            <p className={shared.desc}>
              Most clients go from first call to a fully onboarded pod inside two weeks — with a
              free trial before you commit.
            </p>
          </div>
        </div>

        <div className={styles.stage}>
          <div className={styles.line} />
          <div className={styles.grid}>
            {STEPS.map((s) => (
              <div key={s.n} className={styles.card}>
                <span className={styles.bignum}>{s.n}</span>
                <span className={styles.icon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {s.icon}
                  </svg>
                </span>
                <div className={styles.steplabel}>{s.step}</div>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.ctaRow}>
          <a href={BOOK} target="_blank" rel="noopener" className={styles.cta}>
            Start with a free consult <span>→</span>
          </a>
          <span className={styles.ctaNote}>
            No commitment. Free trial on every engagement.{' '}
            <Link href="/how-it-works" className={styles.inlineLink}>See the full process</Link>
          </span>
        </div>
      </div>
    </section>
  );
}