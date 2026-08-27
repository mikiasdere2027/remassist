import type { Metadata } from 'next';
import Image from 'next/image';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Virtual Back Office Team',
  description:
    'The seats that keep operations running behind the front line, hired as one trained unit — you approve every agent before they start.',
  alternates: { canonical: '/services/virtual-back-office-team' },
  openGraph: { url: '/services/virtual-back-office-team' },
};

export default function Page() {
  return (
    <main>
  
  
    
  
    
  <section style={{ background: "linear-gradient(180deg,#f7faff 0%,var(--bg-marketing-paper) 62%)", borderBottom: "1px solid var(--border-default)" }}>
      <div className={`${styles['vb-wrap']} ${styles['vb-hero']}`}>
  
        <div>
          <h1 className={styles['vb-h1']}>Your back office,<br /><span>fully staffed.</span></h1>
          <p className={styles['vb-lede']}>The seats that keep operations running behind the front line — hired as one
            trained unit, not a queue of freelancers. You approve every agent before they start.</p>
  
          <ul className={styles['vb-checks']}>
            <li><span className={styles['vb-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              Agents trained on your tools — CRM, helpdesk, billing, or the system you built in-house.</li>
            <li><span className={styles['vb-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              You review real profiles and interview before anyone is assigned to your account.</li>
            <li><span className={styles['vb-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              Every engagement starts with a free trial. Nothing is signed until it works.</li>
          </ul>
  
          <div className={styles['vb-cta-row']}>
            <a className={`${styles['vb-btn']} ${styles['hv-1']}`} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>
              Book a free consult
              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={`${styles['vb-btn']} ${styles['vb-btn--ghost']} ${styles['hv-2']}`} href='#how-it-works'>How it works</a>
          </div>
  
          <div className={styles['vb-proof']}>
            <div className={styles['vb-proof-top']}>
              <span className={styles['vb-proof-iso']}>
                <img src='/images/ISO_9001-2015.svg' alt='ISO 9001:2015 certified' />
                <img src='/images/ISO_27001-2022.svg' alt='ISO 27001:2022 certified' />
              </span>
              <span className={styles['vb-proof-label']}>Quality and security, independently audited</span>
            </div>
            <div className={styles['vb-proof-rule']}></div>
            <div className={styles['vb-proof-bottom']}>
              Seats from <b>$8/hr</b> (Pro) or <b>$11/hr</b> (Expert)  •  <b>Free trial</b> on every engagement
            </div>
          </div>
        </div>
  
        
        <div className={styles['vb-wall']} aria-hidden='true'>
          <div className={styles['vb-col']}>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-1.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-2.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-3.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/gtm-1.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-1.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-2.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-3.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/gtm-1.jpg' alt='' width={128} height={128} sizes="54px" /></div>
          </div>
          <div className={`${styles['vb-col']} ${styles['vb-col--down']} ${styles['vb-col--mid']}`}>
            <div className={styles['vb-tile']}><Image src='/images/Agents/gtm-2.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/gtm-3.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/sdr-1.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/sdr-2.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/gtm-2.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/gtm-3.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/sdr-1.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/sdr-2.jpg' alt='' width={128} height={128} sizes="54px" /></div>
          </div>
          <div className={`${styles['vb-col']} ${styles['vb-col--slow']}`}>
            <div className={styles['vb-tile']}><Image src='/images/Agents/sdr-3.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-1.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-2.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-3.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/sdr-3.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-1.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-2.jpg' alt='' width={128} height={128} sizes="54px" /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-3.jpg' alt='' width={128} height={128} sizes="54px" /></div>
          </div>
  
          <span className={styles['vb-wall-badge']}>
            <span className={styles['vb-wall-dot']}><svg viewBox='0 0 24 24'><path d='M12 3 4 6.5V12c0 4.4 3.2 8 8 9 4.8-1 8-4.6 8-9V6.5z' /><path d='m8.7 12.2 2.3 2.3 4.4-4.7' /></svg></span>
            <span><b>Pro &amp; Expert seats</b><small>from $8/hr</small></span>
          </span>
        </div>
  
      </div>
    </section>
  
  
    
  
    
  <section className={styles['vb-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['vb-wrap']}>
        <span className={styles['vb-kicker']}>What the team covers</span>
        <h2 className={styles['vb-h2']} style={{ marginTop: "14px" }}>The work that never <span>reaches the front line.</span></h2>
        <p className={styles['vb-lede']}>Product experts, software experts, account admins, email and chat admins, bookkeepers,
          data-entry and order-processing clerks. Take one seat or the whole pod.</p>
  
        <div className={styles['vb-roles']}>
          <div className={`${styles['vb-role']} ${styles['hv-3']}`}>
            <span className={styles['vb-role-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='7' width='18' height='13' rx='2' /><path d='M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18' /></svg></span>
            <h3>Order processing</h3>
            <p>Orders keyed, exceptions chased, refunds and returns closed out — with your rules applied the same way every time.</p>
          </div>
          <div className={`${styles['vb-role']} ${styles['hv-4']}`}>
            <span className={styles['vb-role-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 10h18M6 6h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z' /><path d='M9 15h4' /></svg></span>
            <h3>Bookkeeping &amp; AP/AR</h3>
            <p>Invoices raised and reconciled, receipts filed, payment runs prepared and flagged for your sign-off.</p>
          </div>
          <div className={`${styles['vb-role']} ${styles['hv-5']}`}>
            <span className={styles['vb-role-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 5h16v11H8l-4 3z' /><path d='M8 9h8M8 12h5' /></svg></span>
            <h3>Inbox &amp; chat admin</h3>
            <p>Shared inboxes and live chat kept at zero — triaged, tagged, answered, escalated on your thresholds.</p>
          </div>
          <div className={`${styles['vb-role']} ${styles['hv-6']}`}>
            <span className={styles['vb-role-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='8' r='4' /><path d='M4 21v-1.5A5.5 5.5 0 0 1 9.5 14h5a5.5 5.5 0 0 1 5.5 5.5V21' /></svg></span>
            <h3>Account administration</h3>
            <p>Records created and corrected, renewals tracked, onboarding packets sent — your CRM kept honest.</p>
          </div>
          <div className={`${styles['vb-role']} ${styles['hv-7']}`}>
            <span className={styles['vb-role-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 6h16M4 12h16M4 18h10' /></svg></span>
            <h3>Data entry &amp; cleanup</h3>
            <p>Migrations, de-duplication, enrichment and the long backlog nobody on your team has time to finish.</p>
          </div>
          <div className={`${styles['vb-role']} ${styles['hv-8']}`}>
            <span className={styles['vb-role-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3 4 6.5V12c0 4.4 3.2 8 8 9 4.8-1 8-4.6 8-9V6.5z' /><path d='m8.7 12.2 2.3 2.3 4.4-4.7' /></svg></span>
            <h3>Product &amp; software support</h3>
            <p>Agents who actually learn your product, so internal questions stop landing on your engineers.</p>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section id='how-it-works' className={styles['vb-section']} style={{ background: "#518de0", backgroundImage: "radial-gradient(ellipse 900px 450px at 85% 0%, rgba(90,155,240,0.20), transparent 65%),linear-gradient(160deg,#518de0,#0047b3 82%)", position: "relative", overflow: "hidden" }}>
      <div className={styles['vb-wrap']}>
        <span className={styles['vb-kicker']} style={{ color: "rgba(255,255,255,0.92)" }}>How it works</span>
        <h2 className={styles['vb-h2']} style={{ marginTop: "14px", color: "#fff" }}>From consult to coverage.</h2>
        <p className={styles['vb-lede']} style={{ color: "rgba(255,255,255,0.9)" }}>No commitment before you have seen the people
          and the process. Three steps, and the first one is free.</p>
  
        <div className={styles['vb-steps']}>
          <div className={styles['vb-step']}>
            <span className={styles['vb-step-n']}>STEP 01</span>
            <h3>Free consultation</h3>
            <p>Tell us the work you need covered and the volume behind it. We map the seats and the process — no charge, no obligation.</p>
          </div>
          <div className={styles['vb-step']}>
            <span className={styles['vb-step-n']}>STEP 02</span>
            <h3>Pick your agents</h3>
            <p>Review real profiles at both tiers and run quick interviews — or leave the selection to our team and approve the shortlist.</p>
          </div>
          <div className={styles['vb-step']}>
            <span className={styles['vb-step-n']}>STEP 03</span>
            <h3>Monitored training and delivery</h3>
            <p>We build the process with you, train against it, then run a free trial with QA and oversight before anything is signed.</p>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['vb-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['vb-wrap']}>
        <span className={styles['vb-kicker']}>Two ways to staff it</span>
        <h2 className={styles['vb-h2']} style={{ marginTop: "14px" }}>One bench, <span>two kinds of depth.</span></h2>
        <p className={styles['vb-lede']}>Every seat clears the same core program and operates under the same ISO controls.
          The difference is experience and how much direction they need.</p>
  
        <div className={styles['vb-tiers']}>
          <div className={styles['vb-tier']}>
            <div className={styles['vb-tier-head']}><h3>Pro</h3><span className={styles['vb-tier-price']}><small>from</small><b>$8</b><em>/hr</em></span></div>
            <p>Fully trained and fit for work from day one. Pro agents clear our core program and pick up whatever
              software you run — CRM, helpdesk, billing, scheduling, or an internal tool.</p>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='9' /><path d='m8.4 12.2 2.4 2.4 4.8-5' /></svg>Works on any stack</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='9' /><path d='m8.4 12.2 2.4 2.4 4.8-5' /></svg>Core program certified</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='9' /><path d='m8.4 12.2 2.4 2.4 4.8-5' /></svg>Best value per seat</li>
            </ul>
          </div>
          <div className={`${styles['vb-tier']} ${styles['vb-tier--expert']}`}>
            <div className={styles['vb-tier-head']}><h3>Expert</h3><span className={styles['vb-tier-price']}><small>from</small><b>$11</b><em>/hr</em></span></div>
            <p>More years on the job and a far more rigorous assessment path. Experts arrive already fluent in
              your kind of operation and need the least direction to get moving.</p>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='9' /><path d='m8.4 12.2 2.4 2.4 4.8-5' /></svg>Senior experience</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='9' /><path d='m8.4 12.2 2.4 2.4 4.8-5' /></svg>Rigorous assessments</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='9' /><path d='m8.4 12.2 2.4 2.4 4.8-5' /></svg>Least supervision needed</li>
            </ul>
          </div>
        </div>
  
        <div className={styles['vb-faq']}>
          <details>
            <summary>Can we start with a single seat?</summary>
            <p>Yes. Most engagements start with one seat on a single process, then grow once the handover is
              proven. We build the process with you first and staff against it — that part is included.</p>
          </details>
          <details>
            <summary>Do we have to use your software?</summary>
            <p>No. Agents are trained on whatever you already run. If the tool is internal, we learn it during
              the training window before the trial starts.</p>
          </details>
          <details>
            <summary>What happens if an agent is not the right fit?</summary>
            <p>You interview and approve before anyone starts, and the trial exists so a mismatch costs you
              nothing. If it is not working we replace the seat rather than ask you to manage around it.</p>
          </details>
          <details>
            <summary>How is our data protected?</summary>
            <p>Every seat operates under ISO 9001 quality management and ISO 27001 information security controls,
              independently audited rather than self-declared. Access is scoped per client.</p>
          </details>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section id='contact' className={styles['vb-contact']}>
      <div className={styles['vb-wrap']}>
        <div style={{ textAlign: "center", marginBottom: "38px" }}>
          <h2 className={styles['vb-h2']} style={{ color: "#fff" }}>Let’s Talk Outcomes</h2>
          <p style={{ margin: "12px 0 0", fontSize: "16.5px", lineHeight: 1.7, color: "rgba(255,255,255,0.82)" }}>
            Connect with us — tell us what needs covering and we will come back with the seats, the rate, and a trial plan.</p>
        </div>
  
        <div className={styles['vb-contact-card']}>
          <div className={styles['vb-contact-photo']}>
            <Image src='/images/Agents/Virtual-assitant.jpg' alt='A Rem Assist virtual back office agent at work' width={1152} height={922} sizes="(max-width: 860px) 100vw, 472px" />
          </div>
  
          <div className={styles['vb-contact-body']}>
            <span className={styles['vb-kicker']}>Connect with us</span>
            <h3 style={{ margin: "12px 0 0", fontFamily: "var(--font-display)", fontSize: "clamp(23px,2.3vw,30px)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--brand-navy)", lineHeight: 1.2 }}>
              Book the consult, or send the brief.</h3>
  
            
            <form className={styles['vb-form-grid']} method='post' action=''>
              <div>
                <label className={styles['vb-label']} htmlFor='vb-first'>First name</label>
                <input className={styles['vb-input']} id='vb-first' name='first_name' type='text' autoComplete='given-name' required={true} />
              </div>
              <div>
                <label className={styles['vb-label']} htmlFor='vb-last'>Last name</label>
                <input className={styles['vb-input']} id='vb-last' name='last_name' type='text' autoComplete='family-name' required={true} />
              </div>
              <div>
                <label className={styles['vb-label']} htmlFor='vb-company'>Company</label>
                <input className={styles['vb-input']} id='vb-company' name='company' type='text' autoComplete='organization' />
              </div>
              <div>
                <label className={styles['vb-label']} htmlFor='vb-phone'>Phone</label>
                <input className={styles['vb-input']} id='vb-phone' name='phone' type='tel' autoComplete='tel' />
              </div>
              <div>
                <label className={styles['vb-label']} htmlFor='vb-email'>Business email</label>
                <input className={styles['vb-input']} id='vb-email' name='email' type='email' autoComplete='email' required={true} />
              </div>
              <div>
                <label className={styles['vb-label']} htmlFor='vb-country'>Country</label>
                <input className={styles['vb-input']} id='vb-country' name='country' type='text' autoComplete='country-name' list='vb-countries' />
                <datalist id='vb-countries'>
                  <option>United States</option><option>Canada</option><option>United Kingdom</option>
                  <option>Ireland</option><option>Australia</option><option>New Zealand</option>
                  <option>United Arab Emirates</option><option>Saudi Arabia</option><option>Germany</option>
                  <option>Netherlands</option><option>Sweden</option><option>South Africa</option>
                  <option>Kenya</option><option>Nigeria</option><option>Ethiopia</option>
                  <option>India</option><option>Singapore</option><option>Philippines</option>
                </datalist>
              </div>
              <div className={styles['vb-field--full']}>
                <label className={styles['vb-label']} htmlFor='vb-service'>What do you need covered?</label>
                <select className={styles['vb-input']} id='vb-service' name='service'>
                  <option value=''>Select the closest fit</option>
                  <option>Order processing</option>
                  <option>Bookkeeping, AP / AR</option>
                  <option>Inbox &amp; chat administration</option>
                  <option>Account administration</option>
                  <option>Data entry &amp; cleanup</option>
                  <option>Product &amp; software support</option>
                  <option>A mix — let us scope it</option>
                </select>
              </div>
              <div className={styles['vb-field--full']}>
                <label className={styles['vb-label']} htmlFor='vb-message'>How can we help?</label>
                <textarea className={styles['vb-input']} id='vb-message' name='message' placeholder='Volume, the tools you run, and when you would want coverage to start.'></textarea>
              </div>
  
              <div className={styles['vb-consent']}>
                <input id='vb-consent' name='consent' type='checkbox' required={true} />
                <label htmlFor='vb-consent'>I agree that Rem Assist may use the details above to contact me about this
                  enquiry, as described in the <a href='/privacy-policy'>Privacy Policy</a>.</label>
              </div>
  
              <div className={styles['vb-form-foot']}>
                <button className={`${styles['vb-btn']} ${styles['hv-9']}`} type='submit'>
                  Send it over
                  <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
                </button>
                <span className={styles['vb-form-note']}>Prefer to talk?
                  <a href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener' style={{ fontWeight: 600 }}>Book a free consult</a>.</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  
  
  
    </main>
  );
}
