import type { Metadata } from 'next';
import { pageOg } from '@/lib/site';
import Hero from '@/components/how-it-works/Hero';
import PhaseScroller from '@/components/how-it-works/PhaseScroller';
import styles from './page.module.css';
import { BOOK_URL } from '@/lib/nav';

export const metadata: Metadata = {
  title: 'How It Works',
  description:
    'From first call to a working pod: four phases, roughly two weeks, and you approve the people before they start.',
  alternates: { canonical: '/how-it-works' },
  openGraph: pageOg('/how-it-works'),
};

export default function Page() {
  return (
    <main>
  
  
    
  
    
  <Hero />
  
  
    
  
    
  <PhaseScroller />
  
  
    
  
    
  <section className={styles['hw-section']} style={{ background: "#fff", borderTop: "1px solid var(--border-default)" }}>
      <div className={styles['hw-wrap']}>
        <span className={styles['hw-kicker']}>The usual shape of it</span>
        <h2 className={styles['hw-h2']} style={{ marginTop: "14px" }}>Two weeks, <span>laid out day by day.</span></h2>
        <p className={styles['hw-lede']}>Most clients go from first call to a fully onboarded pod inside two weeks. Where
          your process is already documented we can compress it further; where nothing is written down, the
          second week gets longer.</p>
  
        <div className={styles['hw-weeks']}>
          <div className={styles['hw-week']}>
            <div className={styles['hw-week-label']}><b>Week 1</b><span>Scope and select</span></div>
            <div className={styles['hw-days']}>
              <div className={`${styles['hw-day']} ${styles['hw-day--on']}`}><em>Day 1</em><b>Free consult</b></div>
              <div className={`${styles['hw-day']} ${styles['hw-day--on']}`}><em>Day 2</em><b>Pod designed</b></div>
              <div className={`${styles['hw-day']} ${styles['hw-day--on']}`}><em>Day 3</em><b>Terms in writing</b></div>
              <div className={styles['hw-day']}><em>Day 4</em><b>Profiles sent</b></div>
              <div className={styles['hw-day']}><em>Day 5</em><b>You approve</b></div>
            </div>
          </div>
          <div className={styles['hw-week']}>
            <div className={styles['hw-week-label']}><b>Week 2</b><span>Train and go live</span></div>
            <div className={styles['hw-days']}>
              <div className={styles['hw-day']}><em>Day 6</em><b>Tool access</b></div>
              <div className={styles['hw-day']}><em>Day 7</em><b>Product training</b></div>
              <div className={styles['hw-day']}><em>Day 8</em><b>SOP written</b></div>
              <div className={`${styles['hw-day']} ${styles['hw-day--on']}`}><em>Day 9</em><b>Supervised live work</b></div>
              <div className={`${styles['hw-day']} ${styles['hw-day--on']}`}><em>Day 10</em><b>Reporting starts</b></div>
            </div>
          </div>
        </div>
        <p className={styles['hw-weeks-note']}>Working days, not calendar days, and a guide rather than a contract. The
          consult is free and the pilot comes before any full rollout, so booking early costs you nothing
          even if your start date is months out.</p>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['hw-band']}>
      <div className={styles['hw-wrap']}>
        <span className={styles['hw-kicker']}>Once it is running</span>
        <h2 className={styles['hw-h2']} style={{ marginTop: "14px" }}>You should not have to ask how it is going.</h2>
        <p className={styles['hw-lede']}>Oversight is part of the rate, not an upsell. This is what arrives without you
          chasing anyone for it.</p>
  
        <div className={styles['hw-grid3']}>
          <div className={styles['hw-bcard']}>
            <span className={styles['hw-bico']}><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='9' /><path d='M12 7.5V12l3 2' /></svg></span>
            <h3>Hourly work logs</h3>
            <p>What each seat worked on, logged as it happens rather than reconstructed at the end of the
              month.</p>
            <em>Continuous</em>
          </div>
          <div className={styles['hw-bcard']}>
            <span className={styles['hw-bico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 6h16v12H4z' /><path d='m4 7 8 6 8-6' /></svg></span>
            <h3>Daily email report</h3>
            <p>A short written summary per seat — volume handled, anything stuck, anything that needs
              a decision from you.</p>
            <em>Every working day</em>
          </div>
          <div className={styles['hw-bcard']}>
            <span className={styles['hw-bico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3 4 6.5V12c0 4.4 3.2 8 8 9 4.8-1 8-4.6 8-9V6.5z' /><path d='m8.7 12.2 2.3 2.3 4.4-4.7' /></svg></span>
            <h3>QA and a named supervisor</h3>
            <p>Work scored against your criteria by a person who owns the account, not a dashboard that
              averages it into one number.</p>
            <em>Ongoing</em>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['hw-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['hw-wrap']}>
        <span className={styles['hw-kicker']}>The uncomfortable question</span>
        <h2 className={styles['hw-h2']} style={{ marginTop: "14px" }}>And if it <span>does not work out?</span></h2>
        <p className={styles['hw-lede']}>Worth knowing before you start, not after. None of this is buried in a contract
          you have to ask for.</p>
  
        <div className={styles['hw-safety']}>
          <div className={styles['hw-safe']}>
            <span className={styles['hw-safe-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M15.5 20.5v-1.8a3.7 3.7 0 0 0-3.7-3.7H6.2a3.7 3.7 0 0 0-3.7 3.7v1.8' /><circle cx='9' cy='7.2' r='3.7' /><path d='m17 8 2 2 3.5-3.5' /></svg></span>
            <h3>We replace the seat</h3>
            <p>If an agent is not right for the account we swap them rather than asking you to manage
              around it. Replacement is inside the rate.</p>
          </div>
          <div className={styles['hw-safe']}>
            <span className={styles['hw-safe-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 12h16' /><path d='M4 7h10M4 17h10' /></svg></span>
            <h3>Seats come off as easily as they go on</h3>
            <p>Add or remove seats at any time, and there is no setup fee to re-pay when a pod grows back
              again later.</p>
          </div>
          <div className={styles['hw-safe']}>
            <span className={styles['hw-safe-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 3h9l4 4v14H6z' /><path d='M15 3v4h4' /><path d='M9 12h7M9 16h5' /></svg></span>
            <h3>The documentation stays yours</h3>
            <p>Any SOP we write during onboarding is yours to keep. If you walk away, you walk away with
              your process written down — which is more than you had.</p>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['hw-section']} style={{ background: "#fff", borderTop: "1px solid var(--border-default)" }}>
      <div className={`${styles['hw-wrap']} ${styles['hw-narrow']}`}>
        <span className={styles['hw-kicker']}>Before you book</span>
        <h2 className={styles['hw-h2']} style={{ marginTop: "14px" }}>Questions about the process.</h2>
  
        <div className={styles['hw-faq']}>
          <details>
            <summary>What if we have nothing documented?</summary>
            <p>That is the most common starting point and it does not block anything — it changes who
              we send first. We build the process with you during onboarding, write the SOP, and hand it
              back. That work is included rather than billed as a setup project.</p>
          </details>
          <details>
            <summary>Do we have to interview the agents?</summary>
            <p>No, but you always get the option. Some clients interview every candidate, others review
              profiles and approve a shortlist, and a few leave selection to us entirely. What does not
              happen is someone being assigned to your account without your sign-off.</p>
          </details>
          <details>
            <summary>How much of our time does onboarding actually take?</summary>
            <p>Realistically a few hours across two weeks: the consult, a look at the shortlist, tool
              access, and feedback on the first days of output. The training itself is ours to run, and
              week one is where your input matters most.</p>
          </details>
          <details>
            <summary>Can we start faster than two weeks?</summary>
            <p>Sometimes. Where your SOPs already exist we can compress onboarding to under a week. Where
              nothing is written down, rushing it just moves the problem into month one, and we will tell
              you that rather than agree to a date we cannot hold.</p>
          </details>
          <details>
            <summary>Who do we actually talk to day to day?</summary>
            <p>A named supervisor who owns your account, not a shared inbox. They are named during team
              design in phase two, before anything goes live.</p>
          </details>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['hw-close']}>
      <div className={styles['hw-wrap']}>
        <h2>Phase one is a conversation, and it is free.</h2>
        <p>Bring the volume and the hours. You will leave the call knowing the seats, the tier and the
          rate — or that we are not the right fit, which is also useful.</p>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "13px", marginTop: "30px" }}>
          <a className={styles['hw-btn']} href={BOOK_URL} target='_blank' rel='noopener'>
            Book a free consult
            <svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
          </a>
          <a className={styles['hw-ghost-dark']} href='/pricing'>See pricing</a>
        </div>
      </div>
    </section>
  
  
  
    </main>
  );
}
