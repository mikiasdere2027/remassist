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

  <section className={styles['q-section']} style={{ background: "var(--bg-marketing-paper)" }}>
        <div className={styles['q-wrap']}>
          <span className={styles['q-kicker']}>Read the small print</span>
          <h2 className={styles['q-h2']} style={{ marginTop: "14px" }}>What that number <span>does and does not</span> include.</h2>
          <p className={styles['q-lede']} style={{ marginLeft: 0 }}>Most of this industry quotes a range and fills in the gaps
            on a call. Here is the whole basis, in advance.</p>
  
          <div className={styles['q-two']}>
            <div className={styles['q-list'] + ' ' + styles['q-list--in']}>
              <h3>Included in the rate</h3>
              <ul>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>The agent’s working hours at the tier shown.</li>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Recruiting, vetting, and the core training programme.</li>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Process build and SOP writing during onboarding — yours to keep.</li>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>QA, supervision, and replacement if a seat is not working.</li>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Operating under ISO 9001 and ISO 27001 controls.</li>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>The free trial before you sign anything.</li>
              </ul>
            </div>
            <div className={styles['q-list'] + ' ' + styles['q-list--out']}>
              <h3>Not included, and we will say so</h3>
              <ul>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 6l12 12M18 6 6 18' /></svg>Your own software licences and seat costs.</li>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 6l12 12M18 6 6 18' /></svg>Paid media, data credits, or sending infrastructure you already own.</li>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 6l12 12M18 6 6 18' /></svg>Statutory holidays outside the coverage you scope.</li>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 6l12 12M18 6 6 18' /></svg>A guaranteed outcome. We commit to the process and the reporting, not a number we have not earned yet.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
  
  
    
  
    
    <section className={styles['q-section']} style={{ background: "#518de0", backgroundImage: "radial-gradient(ellipse 900px 450px at 85% 0%, rgba(90,155,240,0.20), transparent 65%),linear-gradient(160deg,#518de0,#0047b3 82%)", position: "relative", overflow: "hidden" }}>
        <div className={styles['q-wrap']}>
          <span className={styles['q-kicker']} style={{ color: "rgba(255,255,255,0.92)" }}>After you qualify</span>
          <h2 className={styles['q-h2']} style={{ marginTop: "14px", color: "#fff" }}>Three steps, and the first one is free.</h2>
          <p className={styles['q-lede']} style={{ marginLeft: 0, color: "rgba(255,255,255,0.9)" }}>Nothing about this page commits you
            to anything. Here is what actually happens if you take the next step.</p>
  
          <div className={styles['q-grid3']}>
            <div className={styles['q-panel']} style={{ background: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.22)" }}>
              <span className={styles['q-panel-n']} style={{ color: "rgba(255,255,255,0.72)" }}>STEP 01</span>
              <h3 style={{ color: "#fff" }}>Free consultation</h3>
              <p style={{ color: "rgba(255,255,255,0.88)" }}>We pressure-test the shape this page gave you against
                your real volume, and give you the exact rate for your hours.</p>
            </div>
            <div className={styles['q-panel']} style={{ background: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.22)" }}>
              <span className={styles['q-panel-n']} style={{ color: "rgba(255,255,255,0.72)" }}>STEP 02</span>
              <h3 style={{ color: "#fff" }}>Meet the actual people</h3>
              <p style={{ color: "rgba(255,255,255,0.88)" }}>Real profiles at both tiers. Interview them, or leave the
                shortlist to us and approve it. Nobody is assigned without your sign-off.</p>
            </div>
            <div className={styles['q-panel']} style={{ background: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.22)" }}>
              <span className={styles['q-panel-n']} style={{ color: "rgba(255,255,255,0.72)" }}>STEP 03</span>
              <h3 style={{ color: "#fff" }}>Free trial, then decide</h3>
              <p style={{ color: "rgba(255,255,255,0.88)" }}>We build the process, train against it, and run live work
                under QA. You commit after you have seen output, not before.</p>
            </div>
          </div>
        </div>
      </section>
  
  
    
  
    
    <section className={styles['q-section']} style={{ background: "var(--bg-marketing-paper)" }}>
        <div className={styles['q-wrap'] + ' ' + styles['q-narrow']}>
          <span className={styles['q-kicker']}>Before you ask</span>
          <h2 className={styles['q-h2']} style={{ marginTop: "14px" }}>Questions people have <span>at this exact point.</span></h2>
  
          <div className={styles['q-faq']}>
            <details>
              <summary>Why show me a price at all? Nobody else does.</summary>
              <p>Because the alternative wastes both our time. Our rates are published — $8/hr Pro and
                $11/hr Expert — so there is no reason to make you sit through a discovery call to learn
                whether we are in your range. If the number on this page does not work for you, you have lost
                two minutes instead of forty.</p>
            </details>
            <details>
              <summary>How accurate is the estimate?</summary>
              <p>It is hours multiplied by the published rate for the tier your answers point at, which is why
                we show the arithmetic rather than a range. What it cannot know is your actual volume, holiday
                cover, or whether a mixed-tier pod is cheaper for you — those move the final figure, and
                that is what the consult is for.</p>
            </details>
            <details>
              <summary>Do I have to give you my email to see the result?</summary>
              <p>No. The result appears as soon as you answer the fifth question, and the copy button gives you
                a link that restores it later. The email field exists only if you want the breakdown and
                comparable engagements sent to you.</p>
            </details>
            <details>
              <summary>I picked “all of it” — is a blended pod actually a good idea?</summary>
              <p>Often yes, and it is usually cheaper than it looks: one Expert lead with Pro seats underneath
                buys senior judgment without paying the senior rate across the whole pod. It is the most common
                shape we place. We will tell you on the call if we think you should narrow it instead.</p>
            </details>
            <details>
              <summary>What if the shape you recommend is wrong?</summary>
              <p>Then say so and we will re-scope it. Five questions cannot capture a business. This page is a
                starting position honest enough to argue with, which is more than a “request a quote”
                form gives you.</p>
            </details>
          </div>
        </div>
      </section>
  
  
    
  
    
    <section className={styles['q-close']}>
        <div className={styles['q-wrap']}>
          <h2>You have the number. The next step is free too.</h2>
          <p>Bring the shape this page gave you and we will tell you where it is wrong — then show you
            the people who would actually do the work.</p>
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "13px", marginTop: "28px" }}>
            <a className={styles['q-btn']} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>
              Book a free consult
              <svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={styles['q-btn'] + ' ' + styles['q-btn--ghost']} href='/pricing'>See full pricing</a>
          </div>
        </div>
      </section>
    </main>
  );
}