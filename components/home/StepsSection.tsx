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
      /* lucide message-circle */ <><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></>,
  },
  {
    n: '02',
    step: 'Step 2',
    title: 'Team design',
    desc: 'We scope the personnel mix — generalists, specialists, or both — with pricing and terms.',
    icon: /* lucide users */ <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  },
  {
    n: '03',
    step: 'Step 3',
    title: 'Pick your agents',
    desc: 'Review profiles and run quick interviews — or leave selection to our experts.',
    icon: /* lucide user-check */ <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></>,
  },
  {
    n: '04',
    step: 'Step 4',
    title: 'Monitored delivery',
    desc: 'AI-assisted monitoring, hourly work logs, and daily email reports on every seat.',
    icon: /* lucide activity */ <><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></>,
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