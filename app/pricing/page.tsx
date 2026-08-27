import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Two rates, published. Most of this industry makes you book a call to find out whether they are in your range — here are the numbers.',
  alternates: { canonical: '/pricing' },
  openGraph: { url: '/pricing' },
};

export default function Page() {
  return (
    <main>
  
  
    
  
    
  <section style={{ background: "linear-gradient(180deg,#f7faff 0%,var(--bg-marketing-paper) 60%)" }}>
      <div className={`${styles['pr-wrap']} ${styles['pr-hero']}`}>
        <span className={styles['pr-kicker']}>Pricing</span>
        <h1 className={styles['pr-h1']}>Two rates, <span>published.</span></h1>
        <p className={styles['pr-lede']}>Most of this industry makes you book a call to find out whether they are in
          your range. Here are the numbers. What we scope on the call is the shape, not the secret.</p>
  
        <div className={styles['pr-chips']}>
          <span className={styles['pr-chip']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Hourly, per seat</span>
          <span className={styles['pr-chip']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>No setup fee</span>
          <span className={styles['pr-chip']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Add or drop seats any time</span>
          <span className={styles['pr-chip']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>ISO 9001 &amp; 27001 audited</span>
        </div>
  
        <div className={styles['pr-tiers']}>
          <div className={styles['pr-tier']}>
            <span className={styles['pr-tier-tag']}>Best value</span>
            <h3>Pro</h3>
            <span className={styles['pr-price']}><small>from</small><b>$8</b><em>/hr</em></span>
            <p>Fully trained and fit for work from day one. Pro seats clear our core programme and pick
              up whatever software you run — CRM, helpdesk, billing, scheduling, or a tool you built
              in-house.</p>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Works on any stack</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Core programme certified before placement</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Best rate per seat</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Suited to repeatable, rules-based work</li>
            </ul>
          </div>
  
          <div className={`${styles['pr-tier']} ${styles['pr-tier--expert']}`}>
            <span className={styles['pr-tier-tag']}>Most judgment</span>
            <h3>Expert</h3>
            <span className={styles['pr-price']}><small>from</small><b>$11</b><em>/hr</em></span>
            <p>More years on the job and a far more rigorous assessment path. Experts arrive already
              fluent in your kind of operation and need the least direction to get moving.</p>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Senior experience</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Rigorous assessment path</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Least supervision needed</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Suited to client-facing, high-stakes work</li>
            </ul>
          </div>
        </div>
  
        <p className={styles['pr-lede']} style={{ marginTop: "26px", fontSize: "15px" }}>A pod can mix tiers — an Expert lead
          with Pro seats underneath is the most common shape we place, and the cheapest way to buy senior
          judgment. <a href='/qualify'>Qualify in two minutes</a> to see which shape fits you.</p>
        <div style={{ height: "84px" }}></div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['pr-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['pr-wrap']}>
        <span className={styles['pr-kicker']}>Compare plans</span>
        <h2 className={styles['pr-h2']} style={{ marginTop: "14px" }}>Pick the shape, <span>then we scope it.</span></h2>
        <p className={styles['pr-lede']}>Every plan runs on the two published rates above. What changes is how the seats
          are grouped — a single agent, a pod, or a mix layered into what you already have.</p>
  
        <div className={styles['pr-plans']}>
          <div className={styles['pr-plan']}>
            <h3>Customer Service Agents</h3>
            <span className={styles['pr-plan-price']}>From $8</span>
            <span className={styles['pr-plan-unit']}>Per agent per hour,<br />customized in consultation</span>
            <a className={styles['pr-btn']} href='mailto:support@remassistance.com'>Get started</a>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Voice, chat &amp; email coverage</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>24/7 or business-hours shifts</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>QA scoring + daily reports</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>30–60-day pilot program</li>
            </ul>
            <a className={styles['pr-plan-more']} href='/services/customer-service-agents'>Learn more →</a>
          </div>
  
          <div className={`${styles['pr-plan']} ${styles['pr-plan--featured']}`}>
            <span className={styles['pr-plan-tag']}>Most popular</span>
            <h3>GTM Team</h3>
            <span className={styles['pr-plan-price']}>Custom</span>
            <span className={styles['pr-plan-unit']}>Per pod of 2–6 seats,<br />scoped to your motion</span>
            <a className={styles['pr-btn']} href='mailto:support@remassistance.com'>Get started</a>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Lead + SDRs + marketing + RevOps</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>GHL / HubSpot builds included</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Weekly pipeline reporting</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>30–60-day pilot program</li>
            </ul>
            <a className={styles['pr-plan-more']} href='/services/gtm-teams'>Learn more →</a>
          </div>
  
          <div className={styles['pr-plan']}>
            <h3>SDR as a Service</h3>
            <span className={styles['pr-plan-price']}>From $8</span>
            <span className={styles['pr-plan-unit']}>Per SDR per hour,<br />customized in consultation</span>
            <a className={styles['pr-btn']} href='mailto:support@remassistance.com'>Get started</a>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Lists, sequences &amp; booking</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Sales Navigator + RevenueBase data</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Reported on meetings held</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>30–60-day pilot program</li>
            </ul>
            <a className={styles['pr-plan-more']} href='/services/sdr-as-a-service'>Learn more →</a>
          </div>
  
          <div className={styles['pr-plan']}>
            <h3>Extra Services</h3>
            <span className={styles['pr-plan-price']}>Custom</span>
            <span className={styles['pr-plan-unit']}>Per seat or per project,<br />mix into any plan</span>
            <a className={styles['pr-btn']} href='mailto:support@remassistance.com'>Get started</a>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>IT helpdesk, marketing, AI, research</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>One VA can cover several tasks</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Add or remove plans anytime</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Custom software available</li>
            </ul>
            <a className={styles['pr-plan-more']} href='/services/extra-services'>Learn more →</a>
          </div>
        </div>
        <p className={styles['pr-plans-note']}>Figures are floors, not quotes — your exact rate depends on hours,
          start date and whether a mixed-tier pod suits you better. Extras are quoted a la carte and
          confirmed in writing before anything starts.</p>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['pr-section']} style={{ background: "#fff", borderTop: "1px solid var(--border-default)" }}>
      <div className={styles['pr-wrap']}>
        <span className={styles['pr-kicker']}>Read the small print</span>
        <h2 className={styles['pr-h2']} style={{ marginTop: "14px" }}>What the rate <span>does and does not</span> include.</h2>
  
        <div className={styles['pr-two']}>
          <div className={`${styles['pr-list']} ${styles['pr-list--in']}`}>
            <h3>Included in the hourly rate</h3>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>The agent's working hours at the tier shown.</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Recruiting, vetting and the core training programme.</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Process build and SOP writing during onboarding — yours to keep.</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>QA, supervision and replacement if a seat is not working.</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Operating under ISO 9001 and ISO 27001 controls.</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>No setup fee, and seats can be added or dropped.</li>
            </ul>
          </div>
          <div className={`${styles['pr-list']} ${styles['pr-list--out']}`}>
            <h3>Quoted separately, and we will say so</h3>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 6l12 12M18 6 6 18' /></svg>Your own software licences and seat costs.</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 6l12 12M18 6 6 18' /></svg>Paid media, data credits and sending infrastructure.</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 6l12 12M18 6 6 18' /></svg>A la carte extras beyond the staffed seat.</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 6l12 12M18 6 6 18' /></svg>Optional time-tracking client — provided on request only, never imposed.</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 6l12 12M18 6 6 18' /></svg>A guaranteed outcome. We commit to the process and the reporting, not a number we have not earned yet.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['pr-band']}>
      <div className={styles['pr-wrap']}>
        <span className={styles['pr-kicker']}>Before a full rollout</span>
        <h2 className={styles['pr-h2']} style={{ marginTop: "14px" }}>Start with a pilot, not a contract.</h2>
        <p className={styles['pr-lede']}>Training and security setup for your specific processes is real work, so we do
          not pretend it is free. What we do instead is keep the first phase small enough to measure.</p>
  
        <div className={styles['pr-steps']}>
          <div className={styles['pr-step']}>
            <span className={styles['pr-step-n']}>STEP 01</span>
            <h3>Free consultation</h3>
            <p>We scope the seats, the coverage and the rate for your hours. No charge and no obligation
              — if the numbers above do not work for you, you have lost half an hour.</p>
          </div>
          <div className={styles['pr-step']}>
            <span className={styles['pr-step-n']}>STEP 02</span>
            <h3>30–60 day pilot</h3>
            <p>A dedicated team stood up on a smaller scale, so you can measure our SLAs and quality
              firsthand before committing to a full-scale rollout.</p>
          </div>
          <div className={styles['pr-step']}>
            <span className={styles['pr-step-n']}>STEP 03</span>
            <h3>Scale on what you saw</h3>
            <p>You extend the shape that worked and drop what did not. Seasonal discounted pricing can
              apply to a pilot or an initial contract phase — ask on the call.</p>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['pr-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['pr-wrap']}>
        <span className={styles['pr-kicker']}>Where your team sits</span>
        <h2 className={styles['pr-h2']} style={{ marginTop: "14px" }}>Two delivery centres, <span>three working setups.</span></h2>
        <p className={styles['pr-lede']}>Worth knowing before you compare rates: these are staffed offices, not a
          marketplace of freelancers bidding on your task.</p>
  
        <div className={styles['pr-where']}>
          <div className={styles['pr-place']}>
            <span className={styles['pr-place-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11z' /><circle cx='12' cy='10' r='2.6' /></svg></span>
            <h3>Addis Ababa, Ethiopia</h3>
            <p>Our primary delivery centre, covering EMEA hours comfortably and extending into the
              Americas and APAC on a rota.</p>
          </div>
          <div className={styles['pr-place']}>
            <span className={styles['pr-place-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11z' /><circle cx='12' cy='10' r='2.6' /></svg></span>
            <h3>Cassino, Italy</h3>
            <p>European presence for accounts that need it, in the same operating model and under the
              same audited controls.</p>
          </div>
          <div className={styles['pr-place']}>
            <span className={styles['pr-place-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 20v-1.4A4.6 4.6 0 0 1 8.6 14h6.8a4.6 4.6 0 0 1 4.6 4.6V20' /><circle cx='12' cy='8' r='3.6' /></svg></span>
            <h3>Remote, hybrid or in-office</h3>
            <p>All three setups are available for every agent. Where a client's security posture requires
              in-office only, we staff it that way.</p>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['pr-section']} style={{ background: "#fff", borderTop: "1px solid var(--border-default)" }}>
      <div className={`${styles['pr-wrap']} ${styles['pr-narrow']}`}>
        <span className={styles['pr-kicker']}>Before you ask</span>
        <h2 className={styles['pr-h2']} style={{ marginTop: "14px" }}>Pricing questions, <span>answered plainly.</span></h2>
  
        <div className={styles['pr-faq']}>
          <details>
            <summary>Why publish rates when nobody else does?</summary>
            <p>Because the alternative wastes both our time. If $8 or $11 an hour is outside your range,
              you should find that out in two minutes rather than after a discovery call. What genuinely
              needs a conversation is the shape — how many seats, what coverage, which tier —
              and that is what the consult is for.</p>
          </details>
          <details>
            <summary>Do you have set pricing?</summary>
            <p>Rates start at $8 an hour and the tiers above are real, but the total is assembled from
              options we quote a la carte, so every client gets the customisation benefit. The rate is
              fixed; the scope is yours to choose.</p>
          </details>
          <details>
            <summary>Is there a free trial?</summary>
            <p>Not a traditional free trial — the training and security setup for your specific
              processes is substantial work, and we would rather be straight about that than dress it up.
              Instead there is a 30–60 day pilot: a dedicated team at smaller scale so you can
              measure our SLAs and quality before a full rollout. Seasonal discounted pricing can apply
              to the pilot or an initial contract phase.</p>
          </details>
          <details>
            <summary>Can I change plans once I have signed up?</summary>
            <p>You can add or remove seats at any time, and your service rep handles the change rather
              than sending you into a queue. There is no setup fee to re-pay when a pod grows.</p>
          </details>
          <details>
            <summary>Where are your agents based?</summary>
            <p>Addis Ababa, Ethiopia and Cassino, Italy. Remote, hybrid and in-office setups are available
              for all agents — useful if your own security posture rules one of them out.</p>
          </details>
          <details>
            <summary>How do we train the agents we hire?</summary>
            <p>Agents arrive having cleared several rigorous assessments, so client training starts from a
              working baseline rather than from scratch. If your process is not documented we write the
              SOP during onboarding and hand it to you — you keep it either way.</p>
          </details>
          <details>
            <summary>Do we have to use your software?</summary>
            <p>No. Agents work in whatever you already run, and the audit trail stays in your system. The
              time-tracking client we can provide is on request only — it is never a condition of
              the engagement.</p>
          </details>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section id='book' className={styles['pr-close']}>
      <div className={styles['pr-wrap']}>
        <h2>You have the rates. Bring us the shape.</h2>
        <p>Tell us the hours and the work and we will give you the exact figure for your engagement,
          plus the profiles of the people who would do it.</p>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "13px", marginTop: "30px" }}>
          <a className={styles['pr-btn']} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>
            Book a free consult
            <svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
          </a>
          <a className={styles['pr-ghost-dark']} href='/qualify'>Qualify in two minutes</a>
        </div>
      </div>
    </section>
  
  
  
    </main>
  );
}
