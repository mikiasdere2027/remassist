import type { Metadata } from 'next';
import { pageOg } from '@/lib/site';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'The questions from every service page, collected and answered in one place — including the ones with awkward answers.',
  alternates: { canonical: '/faq' },
  openGraph: pageOg('/faq'),
};

export default function Page() {
  return (
    <main>
  
    
  <section style={{ background: "linear-gradient(180deg,#f7faff 0%,var(--bg-marketing-paper) 72%)" }}>
      <div className={styles['rs-wrap']} style={{ paddingTop: "76px", paddingBottom: "52px" }}>
        <p className={styles['rs-eyebrow']}>FAQ</p>
        <h1 className={styles['rs-h1']}>Everything we get <span>asked, in one place.</span></h1>
        <p className={styles['rs-lede']}>The questions from every service page, collected and answered here —
          including the ones with awkward answers. Each group links back to the page it came from.</p>
        <nav className={styles['rs-jump']} aria-label='Question groups'>
          <a href='#pricing'>Pricing and terms</a>
          <a href='#starting'>Getting started</a>
          <a href='#people'>The agents</a>
          <a href='#tools-data'>Tools and data</a>
          <a href='#scope'>Services and scope</a>
          <a href='#oversight'>Oversight and reporting</a>
        </nav>
      </div>
    </section>
  
  
    
  <section id='pricing' className={styles['rs-group']}>
      <div className={`${styles['rs-wrap']} ${styles['rs-narrow']}`}>
        <div className={styles['rs-group-head']}>
          <div>
            <h2 className={styles['rs-h2']}>Pricing and terms</h2>
            <p>What a seat costs, what moves the number, and what is quoted separately.</p>
          </div>
          <a className={styles['rs-source']} href='/pricing'>Pricing page →</a>
        </div>
        <div className={styles['rs-faq']}>
            <details>
              <summary>Why publish rates when nobody else does?</summary>
              <p>Because the alternative wastes both our time. If $8 or $11 an hour is outside your range you should find that out in two minutes rather than after a discovery call. What genuinely needs a conversation is the shape — how many seats, what coverage, which tier.</p>
            </details>
            <details>
              <summary>Do you have set pricing?</summary>
              <p>Rates start at $8 an hour and the two tiers are real, but the total is assembled from options quoted a la carte. The rate is fixed; the scope is yours to choose.</p>
            </details>
            <details>
              <summary>Is there a free trial?</summary>
              <p>Not a traditional free trial — the training and security setup for your specific processes is substantial work and we would rather be straight about that. Instead there is a 30—60 day pilot: a dedicated team at smaller scale so you can measure our SLAs and quality before a full rollout.</p>
            </details>
            <details>
              <summary>What drives the cost more, coverage or seniority?</summary>
              <p>Coverage, by a long way. Part-time seats are real, and you do not have to buy 160 hours to start. Anything past 40 hours a week means more than one person, which is where a pod beats a single hire — two agents can cover nights and weekends without overtime.</p>
            </details>
            <details>
              <summary>Can I change plans once I have signed up?</summary>
              <p>You can add or remove seats at any time and your service rep handles the change. There is no setup fee to re-pay when a pod grows back later.</p>
            </details>
        </div>
      </div>
    </section>
  
  
    
  <section id='starting' className={styles['rs-group']}>
      <div className={`${styles['rs-wrap']} ${styles['rs-narrow']}`}>
        <div className={styles['rs-group-head']}>
          <div>
            <h2 className={styles['rs-h2']}>Getting started</h2>
            <p>What the two weeks actually involve, and how much of your time it takes.</p>
          </div>
          <a className={styles['rs-source']} href='/how-it-works'>How it Works page →</a>
        </div>
        <div className={styles['rs-faq']}>
            <details>
              <summary>What if we have nothing documented?</summary>
              <p>The most common starting point, and it does not block anything — it changes who we send first. We build the process with you during onboarding, write the SOP, and hand it back. That work is included rather than billed as a setup project.</p>
            </details>
            <details>
              <summary>How much of our time does onboarding take?</summary>
              <p>Realistically a few hours across two weeks: the consult, a look at the shortlist, tool access, and feedback on the first days of output. The training itself is ours to run.</p>
            </details>
            <details>
              <summary>Can we start faster than two weeks?</summary>
              <p>Sometimes. Where your SOPs already exist we can compress onboarding to under a week. Where nothing is written down, rushing it just moves the problem into month one, and we will say so rather than agree to a date we cannot hold.</p>
            </details>
            <details>
              <summary>Can we start with a single seat?</summary>
              <p>Yes, and most engagements do. One seat on one process, proven, then grown. We build the process with you first and staff against it.</p>
            </details>
            <details>
              <summary>Who do we actually talk to day to day?</summary>
              <p>A named supervisor who owns your account, not a shared inbox. They are named during team design, before anything goes live.</p>
            </details>
        </div>
      </div>
    </section>
  
  
    
  <section id='people' className={styles['rs-group']}>
      <div className={`${styles['rs-wrap']} ${styles['rs-narrow']}`}>
        <div className={styles['rs-group-head']}>
          <div>
            <h2 className={styles['rs-h2']}>The agents</h2>
            <p>Who they are, how they are trained, and what happens when one is not right.</p>
          </div>
          <a className={styles['rs-source']} href='/services/virtual-back-office-team'>Virtual Back Office Team page →</a>
        </div>
        <div className={styles['rs-faq']}>
            <details>
              <summary>Do we have to interview the agents?</summary>
              <p>No, but you always get the option. Some clients interview every candidate, others approve a shortlist, a few leave selection to us. What does not happen is someone being assigned to your account without your sign-off.</p>
            </details>
            <details>
              <summary>Where are your agents based?</summary>
              <p>Addis Ababa, Ethiopia and Cassino, Italy. Remote, hybrid and in-office setups are available for all agents — useful if your own security posture rules one of them out.</p>
            </details>
            <details>
              <summary>How do we train the agents we hire?</summary>
              <p>They arrive having cleared several rigorous assessments, so client training starts from a working baseline. Product training is completed before the first piece of live work, not learned on your customers.</p>
            </details>
            <details>
              <summary>What happens if an agent is not the right fit?</summary>
              <p>You interview and approve before anyone starts, and if it is still not working we replace the seat rather than ask you to manage around it. Replacement is inside the rate.</p>
            </details>
            <details>
              <summary>Can agents learn a technical product?</summary>
              <p>Yes. For accounts that need deeper knowledge we place from a niche track rather than the generalist bench, and we will tell you on the call which one fits.</p>
            </details>
        </div>
      </div>
    </section>
  
  
    
  <section id='tools-data' className={styles['rs-group']}>
      <div className={`${styles['rs-wrap']} ${styles['rs-narrow']}`}>
        <div className={styles['rs-group-head']}>
          <div>
            <h2 className={styles['rs-h2']}>Tools and data</h2>
            <p>Whose systems the work happens in, and how access is controlled.</p>
          </div>
          <a className={styles['rs-source']} href='/services/customer-service-agents'>Customer Service page →</a>
        </div>
        <div className={styles['rs-faq']}>
            <details>
              <summary>Do we have to use your software?</summary>
              <p>No. Agents work in whatever you already run and the audit trail stays in your system, so nothing has to be migrated back if the engagement ends. The time-tracking client we can provide is on request only.</p>
            </details>
            <details>
              <summary>Do the agents work in our helpdesk or yours?</summary>
              <p>Yours — Zendesk, Intercom, GoHighLevel, HubSpot or an in-house tool, using your macros and tags.</p>
            </details>
            <details>
              <summary>How is our data protected?</summary>
              <p>Under ISO 27001 information security controls, independently audited rather than self-declared, with least-privilege access scoped per client. ISO 9001 covers the quality side.</p>
            </details>
            <details>
              <summary>Will you have access to move our money?</summary>
              <p>No. On finance engagements we prepare and queue payment runs; releasing them stays with you. Preparer and approver are deliberately separate roles.</p>
            </details>
            <details>
              <summary>What happens to sending domains on outbound work?</summary>
              <p>Infrastructure is warmed and monitored so your primary domain is not put at risk, and everything we build stays with you if the engagement ends.</p>
            </details>
        </div>
      </div>
    </section>
  
  
    
  <section id='scope' className={styles['rs-group']}>
      <div className={`${styles['rs-wrap']} ${styles['rs-narrow']}`}>
        <div className={styles['rs-group-head']}>
          <div>
            <h2 className={styles['rs-h2']}>Services and scope</h2>
            <p>What one seat can realistically cover, and what we will turn down.</p>
          </div>
          <a className={styles['rs-source']} href='/services'>All services page →</a>
        </div>
        <div className={styles['rs-faq']}>
            <details>
              <summary>Can one person really cover several services?</summary>
              <p>Within reason, and that is usually the point — a part-time seat covering inbox triage, order entry and returns is one person doing three things that were each too small to hire for. What does not work is stretching one seat across functions needing different training, and we will say so rather than sell you the seat.</p>
            </details>
            <details>
              <summary>What if the service we need is not listed?</summary>
              <p>Ask. The list covers what we staff routinely, not the limit of what our agents can be trained to do. If it is genuinely outside what we can deliver well we would rather tell you on the call.</p>
            </details>
            <details>
              <summary>Do you guarantee a number of meetings, or an outcome?</summary>
              <p>No, and be careful with anyone who does before seeing your offer, list and market. We commit to the process and the reporting, and we report meetings held rather than activity.</p>
            </details>
            <details>
              <summary>Do you replace our accountant?</summary>
              <p>No. Finance seats do the bookkeeping and transaction work that has to happen before an accountant or controller can do theirs. The close pack is built to hand straight to them.</p>
            </details>
            <details>
              <summary>How do we know which service we actually need?</summary>
              <p>Answer five questions and the fit finder names the service line, the tier and a monthly estimate with the arithmetic shown. About two minutes, and it does not ask for an email.</p>
            </details>
        </div>
      </div>
    </section>
  
  
    
  <section id='oversight' className={styles['rs-group']}>
      <div className={`${styles['rs-wrap']} ${styles['rs-narrow']}`}>
        <div className={styles['rs-group-head']}>
          <div>
            <h2 className={styles['rs-h2']}>Oversight and reporting</h2>
            <p>What arrives without you chasing anyone for it.</p>
          </div>
          <a className={styles['rs-source']} href='/how-it-works'>How it Works page →</a>
        </div>
        <div className={styles['rs-faq']}>
            <details>
              <summary>What does "QA-reviewed" actually mean?</summary>
              <p>Work is scored against criteria you agree, not a generic rubric, by a person who owns the account. You get a daily work report and a weekly quality summary, and the scoring is visible to you rather than averaged into a single number.</p>
            </details>
            <details>
              <summary>What reporting do we get?</summary>
              <p>Hourly work logs per seat, a short daily email report covering volume handled and anything stuck, and ongoing QA against your criteria. Oversight is part of the rate, not an upsell.</p>
            </details>
            <details>
              <summary>How do you handle nights and weekends without overtime?</summary>
              <p>With a rota rather than a longer day. Extended hours mean two or more seats sharing coverage; true 24/7 means a pod of three to six across timezones.</p>
            </details>
            <details>
              <summary>What do we keep if we leave?</summary>
              <p>Any SOP written during onboarding is yours. If you walk away you walk away with your process documented, which is more than you had.</p>
            </details>
        </div>
      </div>
    </section>
  
  
    
  <section className={styles['rs-close']}>
      <div className={styles['rs-wrap']}>
        <h2>Still not answered?</h2>
        <p>Ask it on the consult. It is free, and if the answer is that we are not the right fit we
          will say so on the call rather than three weeks later.</p>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "13px", marginTop: "28px" }}>
          <a className={styles['rs-btn']} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>Book a free consult <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg></a>
          <a className={styles['rs-ghost-dark']} href='/qualify'>Qualify in two minutes</a>
        </div>
      </div>
    </section>
  
  
    </main>
  );
}
