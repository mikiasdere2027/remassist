import type { Metadata } from 'next';
import { pageOg } from '@/lib/site';
import Image from 'next/image';
import styles from './page.module.css';
import { ServiceJsonLd } from '@/components/layout/JsonLd';
import ContactRail from '@/components/services/ContactRail';
import SeatTiersSection from '@/components/services/SeatTiers';
import InterviewRail from '@/components/services/InterviewRail';
import { interviewsFor } from '@/lib/interviews';
import BlogRail from '@/components/services/BlogRail';

export const metadata: Metadata = {
  title: 'Customer Service Agents',
  description:
    'Dedicated agents answering by voice, chat and email inside your helpdesk — trained on your product, working your macros, QA-scored on every contact.',
  alternates: { canonical: '/services/customer-service-agents' },
  openGraph: pageOg('/services/customer-service-agents'),
};

export default function Page() {
  return (
    <main>
  
  
    
  
    
  <section style={{ background: "linear-gradient(180deg,#f7faff 0%,var(--bg-marketing-paper) 62%)", borderBottom: "1px solid var(--border-default)" }}>
      <div className={`${styles['cx-wrap']} ${styles['cx-hero']}`}>
  
        <div>
          <span className={styles['cx-kicker']}>Customer Service</span>
          <h1 className={styles['cx-h1']}>Customer support,<br /><span>never unattended.</span></h1>
          <p className={styles['cx-lede']}>Dedicated agents answering by voice, chat and email inside your helpdesk
            — trained on your product, working your macros, and QA-scored on every contact.</p>
  
          <ul className={styles['cx-checks']}>
            <li><span className={styles['cx-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              Agents work in <b>your</b> helpdesk, so the audit trail never leaves your systems.</li>
            <li><span className={styles['cx-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              Product training finishes <b>before</b> the first ticket, not on your customers.</li>
            <li><span className={styles['cx-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              Every interaction scored against criteria you agree, by a named supervisor.</li>
          </ul>
  
          <div className={styles['cx-cta-row']}>
            <a className={`${styles['cx-btn']} ${styles['hv-1']}`} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>
              Book a free consult
              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={`${styles['cx-btn']} ${styles['cx-btn--ghost']} ${styles['hv-2']}`} href='/qualify'>Qualify in two minutes</a>
          </div>
  
          <div className={styles['cx-proof']}>
            <div><b>&lt;60s</b><span>Avg. first response, chat</span></div>
            <div><b>24/7</b><span>Coverage, any timezone</span></div>
            <div><b>95%+</b><span>CSAT target per agent</span></div>
            <div><b>100%</b><span>Interactions QA-reviewed</span></div>
          </div>
        </div>
  
        <div className={styles['cx-art']}>
          <div className={styles['cx-faces']} aria-hidden='true'>
            <span><Image src='/images/Agents/cs-1.jpg' alt='' width={128} height={128} sizes="54px" /></span>
            <span><Image src='/images/Agents/cs-2.jpg' alt='' width={128} height={128} sizes="54px" /></span>
            <span><Image src='/images/Agents/cs-3.jpg' alt='' width={128} height={128} sizes="54px" /></span>
            <i>The same faces on your<br />queue every day</i>
          </div>
          <h3>One named pod, not a shift pool</h3>
          <p>You approve every agent before they answer a single customer, and a named supervisor owns
            the account.</p>
          <div className={styles['cx-art-rows']}>
            <div className={styles['cx-art-row']}>
              <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z' /></svg></i>
              <span><b>Voice</b><small>Answered as your team</small></span>
              <em><s></s>Covered</em>
            </div>
            <div className={styles['cx-art-row']}>
              <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 5h16v11H8l-4 3z' /><path d='M8 9h8M8 12h5' /></svg></i>
              <span><b>Live chat</b><small>Under 60s to first reply</small></span>
              <em><s></s>Covered</em>
            </div>
            <div className={styles['cx-art-row']}>
              <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 6h16v12H4z' /><path d='m4 7 8 6 8-6' /></svg></i>
              <span><b>Email &amp; tickets</b><small>Closed, not just queued</small></span>
              <em><s></s>Covered</em>
            </div>
          </div>
        </div>
  
      </div>
    </section>
  
  
    
  
    
  <section className={styles['cx-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['cx-wrap']}>
        <span className={styles['cx-kicker']}>Every channel</span>
        <h2 className={styles['cx-h2']} style={{ marginTop: "14px" }}>One queue discipline, <span>three ways in.</span></h2>
        <p className={styles['cx-lede']}>Agents flex across channels during quiet hours, so you are never paying for
          idle seats. Take one channel or all three.</p>
  
        <div className={styles['cx-grid']}>
          <div className={styles['cx-card']}>
            <span className={styles['cx-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z' /></svg></span>
            <h3>Voice support</h3>
            <p>Agents pick up as your team, not as a call centre. Call notes land straight in your CRM while the caller is still on the line.</p>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Your greeting, your escalation thresholds</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Notes and dispositions logged as they go</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Warm transfer to your staff when it needs one</span></li>
            </ul>
          </div>
          <div className={styles['cx-card']}>
            <span className={styles['cx-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 5h16v11H8l-4 3z' /><path d='M8 9h8M8 12h5' /></svg></span>
            <h3>Live chat</h3>
            <p>Agents pick up where the bot gives up. Concurrent chats handled without the canned-reply feel, inside the widget you already run.</p>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Under 60 seconds to first response, on average</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Several chats at once without copy-paste answers</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Handover notes when a chat becomes a ticket</span></li>
            </ul>
          </div>
          <div className={styles['cx-card']}>
            <span className={styles['cx-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 6h16v12H4z' /><path d='m4 7 8 6 8-6' /></svg></span>
            <h3>Email &amp; ticketing</h3>
            <p>Full queue ownership, not queue watching. Tickets triaged, tagged, answered and closed against your SLA rather than left to age.</p>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Your macros and tags, your ticket hygiene</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Backlogs worked down, not just held steady</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Daily report on what moved and what stalled</span></li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['cx-band']}>
      <div className={styles['cx-wrap']}>
        <span className={styles['cx-kicker']}>Coverage</span>
        <h2 className={styles['cx-h2']} style={{ marginTop: "14px" }}>A rota, not a longer day.</h2>
        <p className={styles['cx-lede']}>Extended hours means two or more seats sharing it. True 24/7 means a pod
          across timezones — which is how nights and weekends get covered without overtime.</p>
  
        <div className={styles['cx-shifts']}>
          <div className={styles['cx-shift']}>
            <em>00:00 – 08:00</em>
            <h3>APAC shift</h3>
            <p>Voice, chat and email covered while your own office is dark.</p>
          </div>
          <div className={styles['cx-shift']}>
            <em>08:00 – 16:00</em>
            <h3>EMEA shift</h3>
            <p>The busiest stretch for most queues, staffed to the volume you actually see.</p>
          </div>
          <div className={styles['cx-shift']}>
            <em>16:00 – 24:00</em>
            <h3>Americas shift</h3>
            <p>Evenings and weekend cover without paying anyone overtime.</p>
          </div>
        </div>
        <p className={styles['cx-band-note']}>Coverage drives the cost of a customer-experience pod far more than
          seniority does. A single seat on business hours and a three-to-six seat pod on true 24/7 are
          very different numbers, and we quote the second one honestly.</p>
      </div>
    </section>
  
  
    
  
    

    <InterviewRail
      surface="paper"
      eyebrow="Meet the bench"
      title={<>Hear an agent <span>before a customer does.</span></>}
      lede="Clips from our screening interviews — the same recordings that come with a shortlist, so you can judge tone, clarity, and listening before anyone joins your queue."
      seats={interviewsFor('customer-service-agents')}
    />

  <section className={styles['cx-section']}>
      <div className={styles['cx-wrap']}>
        <span className={styles['cx-kicker']}>Quality</span>
        <h2 className={styles['cx-h2']} style={{ marginTop: "14px" }}>Scored against your criteria, <span>not a generic rubric.</span></h2>
  
        <div className={styles['cx-qual']}>
          <div>
            <div className={styles['cx-qual-list']}>
              <div className={styles['cx-qual-row']}><b>Interactions QA-reviewed</b><span>100%</span></div>
              <div className={styles['cx-qual-row']}><b>CSAT target per agent</b><span>95%+</span></div>
              <div className={styles['cx-qual-row']}><b>Avg. first response, chat</b><span>&lt;60s</span></div>
              <div className={styles['cx-qual-row']}><b>Work report</b><span>Daily</span></div>
              <div className={styles['cx-qual-row']}><b>Quality summary</b><span>Weekly</span></div>
              <div className={styles['cx-qual-row']}><b>Named supervisor</b><span>Per account</span></div>
            </div>
          </div>
          <div>
            <p className={styles['cx-qual-note']}><b>The rubric is agreed during onboarding</b> and the scoring stays
              visible to you, rather than averaged into a single number on a dashboard nobody trusts.</p>
            <p className={styles['cx-qual-note']}>Product training is completed before the first ticket, so your
              customers are not the training set. Where an account needs deeper knowledge we place from a
              niche track rather than the generalist bench.</p>
            <p className={styles['cx-qual-note']}>Data is handled under independently audited ISO 9001 and ISO 27001
              controls, with access scoped per client.</p>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <SeatTiersSection />
  
  
    
  
    
  <section className={styles['cx-section']}>
      <div className={styles['cx-wrap']}>
        <span className={styles['cx-kicker']}>Before you ask</span>
        <h2 className={styles['cx-h2']} style={{ marginTop: "14px" }}>The questions that decide it.</h2>
        <div className={styles['cx-faq']}>
          <details>
            <summary>Do the agents work in our helpdesk or yours?</summary>
            <p>Yours — Zendesk, Intercom, GoHighLevel, HubSpot or an in-house tool, using your macros and tags. The audit trail stays in your system, so nothing has to be migrated back if the engagement ends.</p>
          </details>
          <details>
            <summary>How do you cover nights and weekends without overtime?</summary>
            <p>With a rota rather than a longer day. Extended hours means two or more seats sharing coverage; true 24/7 means a pod of three to six across timezones. That is why coverage drives cost far more than seniority does.</p>
          </details>
          <details>
            <summary>What does “QA-reviewed” actually mean?</summary>
            <p>Every interaction is scored against criteria you agree, by a person who owns your account. You get a daily work report and a weekly quality summary, and the scoring is visible to you rather than summarised into one number.</p>
          </details>
          <details>
            <summary>Can agents learn a technical product?</summary>
            <p>Yes, and product training is completed before the first ticket. For accounts that need deeper knowledge we place from a dedicated niche track rather than the generalist bench, and we will tell you on the call which one fits.</p>
          </details>
        </div>
      </div>
    </section>
  
  
    
  
    

    <BlogRail
      surface="paper"
      eyebrow="From the blog"
      title={<>Reading for whoever <span>owns the queue.</span></>}
      lede="Playbooks on scoping the seat, ramping it, and holding service quality steady — written by the people who source and manage these agents."
    />

  <ServiceJsonLd path='/services/customer-service-agents' />

  <ContactRail />
    </main>
  );
}
