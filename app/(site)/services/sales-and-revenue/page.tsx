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
  title: 'Sales & Revenue',
  description:
    'Six seats that build the list, work the channels, and put qualified meetings on your calendar — hired as one trained pod, without the recruiting cycle.',
  alternates: { canonical: '/services/sales-and-revenue' },
  openGraph: pageOg('/services/sales-and-revenue'),
};

export default function Page() {
  return (
    <main>
  
  
    
  
    
  <section style={{ background: "linear-gradient(180deg,#f7faff 0%,var(--bg-marketing-paper) 64%)", borderBottom: "1px solid var(--border-default)" }}>
      <div className={`${styles['sr-wrap']} ${styles['sr-hero']}`}>
  
        <div>
          <span className={styles['sr-kicker']}>Sales &amp; Revenue</span>
          <h1 className={styles['sr-h1']}>Sales pipeline you can<br /><span>actually forecast.</span></h1>
          <p className={styles['sr-lede']}>Six seats that build the list, work the channels, and put qualified meetings on
            your calendar — hired as one trained pod, without the recruiting cycle.</p>
  
          <ul className={styles['sr-checks']}>
            <li><span className={styles['sr-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              We report meetings <b>held</b>, not emails sent or dials logged.</li>
            <li><span className={styles['sr-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              Reps are certified in your stack before they touch your pipeline.</li>
            <li><span className={styles['sr-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              You interview and approve every rep, and the trial is free.</li>
          </ul>
  
          <div className={styles['sr-cta-row']}>
            <a className={`${styles['sr-btn']} ${styles['hv-1']}`} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>
              Book a free consult
              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={`${styles['sr-btn']} ${styles['sr-btn--ghost']} ${styles['hv-2']}`} href='/qualify'>Qualify in two minutes</a>
          </div>
  
          
          <div className={styles['sr-proof']}>
            <div><b>2 wks</b><span>Kickoff to first sequences</span></div>
            <div><b>3</b><span>Channels worked in parallel</span></div>
            <div><b>100%</b><span>Contact data verified</span></div>
            <div><b>Held</b><span>The metric we report on</span></div>
          </div>
        </div>
  
        
        <div className={styles['sr-orb']} aria-hidden='true'>
          <svg className={styles['sr-orb-svg']} viewBox='0 0 400 400'>
            <path className={styles['sr-orb-rail']} d='M72 96 Q101 122 127.0 140.7' />
            <path className={styles['sr-orb-rail']} d='M200 40 Q200 78 200.0 106.0' />
            <path className={styles['sr-orb-rail']} d='M328 96 Q299 122 273.0 140.7' />
            <path className={styles['sr-orb-rail']} d='M200 294 L200 336' />
            <path className={`${styles['sr-orb-flow']} sr-orb-flow--a`} pathLength='100' d='M72 96 Q101 122 127.0 140.7' />
            <path className={`${styles['sr-orb-flow']} ${styles['sr-orb-flow--b']}`} pathLength='100' d='M200 40 Q200 78 200.0 106.0' />
            <path className={`${styles['sr-orb-flow']} ${styles['sr-orb-flow--c']}`} pathLength='100' d='M328 96 Q299 122 273.0 140.7' />
            <path className={`${styles['sr-orb-flow']} ${styles['sr-orb-flow--out']}`} pathLength='100' d='M200 294 L200 336' />
          </svg>
  
          <span className={styles['sr-orb-halo']}></span>
  
          <span className={styles['sr-orb-core']}>
            <span className={styles['sr-orb-faces']}><span><Image src='/images/Agents/sdr-1.jpg' alt='' width={128} height={128} sizes="54px" loading="eager" /></span><span><Image src='/images/Agents/sdr-2.jpg' alt='' width={128} height={128} sizes="54px" loading="eager" /></span><span><Image src='/images/Agents/sdr-3.jpg' alt='' width={128} height={128} sizes="54px" loading="eager" /></span></span>
            <b>One dedicated<br />seat</b>
            <small>Owns the loop</small>
          </span>
  
          <span className={`${styles['sr-orb-node']} ${styles['sr-orb-node--email']}`}>
            <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 6h16v12H4z' /><path d='m4 7 8 6 8-6' /></svg></i>
            <span><b>Email</b><em>Warmed, monitored</em></span>
          </span>
          <span className={`${styles['sr-orb-node']} ${styles['sr-orb-node--phone']}`}>
            <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z' /></svg></i>
            <span><b>Phone</b><em>Live conversations</em></span>
          </span>
          <span className={`${styles['sr-orb-node']} ${styles['sr-orb-node--li']}`}>
            <i><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3.5' y='3.5' width='17' height='17' rx='2.4' /><path d='M8 10.5v6M8 7.6v.01M12.2 16.5v-3.4a2 2 0 0 1 4 0v3.4' /></svg></i>
            <span><b>LinkedIn</b><em>Profile-led touches</em></span>
          </span>
  
          <span className={styles['sr-orb-pulse']}></span>
          <span className={styles['sr-orb-out']}>
            <svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>
            <b>Meeting booked</b>
            <span>held, not sent</span>
          </span>
        </div>
  
      </div>
    </section>
  
  
    
  
    
  <section className={styles['sr-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['sr-wrap']}>
        <span className={styles['sr-kicker']}>What you can staff</span>
        <h2 className={styles['sr-h2']} style={{ marginTop: "14px" }}>Six seats, <span>one revenue motion.</span></h2>
        <p className={styles['sr-lede']}>Take the whole pod, or the one seat that is currently the bottleneck.
          Every rep clears the same outbound track before placement.</p>
  
        <div className={styles['sr-grid']}>
          <div className={styles['sr-card']}>
            <span className={styles['sr-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 17v-5a8 8 0 0 1 16 0v5' /><path d='M20 18a2 2 0 0 1-2 2h-.8a1.8 1.8 0 0 1-1.8-1.8v-2.4A1.8 1.8 0 0 1 17.2 14H20zM4 18a2 2 0 0 0 2 2h.8a1.8 1.8 0 0 0 1.8-1.8v-2.4A1.8 1.8 0 0 0 6.8 14H4z' /></svg></span>
            <h3>SDR as a Service</h3>
            <p>Dedicated outbound reps who own targeting through to a booked meeting on your calendar.</p>
            <a className={styles['sr-more']} href='/services/sdr-as-a-service'>See the service
              <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg></a>
          </div>
          <div className={styles['sr-card']}>
            <span className={styles['sr-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='11' cy='11' r='7' /><path d='m16.5 16.5 4 4' /></svg></span>
            <h3>Lead Generation &amp; List Building</h3>
            <p>ICP-matched contact data sourced, enriched, and verified continuously — so reps never work a stale list.</p>
          </div>
          <div className={styles['sr-card']}>
            <span className={styles['sr-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z' /></svg></span>
            <h3>Cold Calling Teams</h3>
            <p>Trained callers working your scripts, dispositions, and CRM in real time — with call notes logged as they go.</p>
          </div>
          <div className={styles['sr-card']}>
            <span className={styles['sr-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='5' width='18' height='16' rx='2' /><path d='M8 3v4M16 3v4M3 10h18' /><path d='m9.5 15.5 1.8 1.8 3.6-3.8' /></svg></span>
            <h3>Appointment Setting</h3>
            <p>Inbound and outbound scheduling, confirmation sequences, and no-show recovery that actually gets run.</p>
          </div>
          <div className={styles['sr-card']}>
            <span className={styles['sr-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 6h16v12H4z' /><path d='m4 7 8 6 8-6' /></svg></span>
            <h3>Email Outreach &amp; Campaigns</h3>
            <p>Sending infrastructure, warm-up, sequences, deliverability monitoring, and reply handling managed end to end.</p>
          </div>
          <div className={styles['sr-card']}>
            <span className={styles['sr-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M15.5 20.5v-1.8a3.7 3.7 0 0 0-3.7-3.7H6.2a3.7 3.7 0 0 0-3.7 3.7v1.8' /><circle cx='9' cy='7.2' r='3.7' /><path d='M21.5 20.5v-1.8a3.7 3.7 0 0 0-2.8-3.6' /></svg></span>
            <h3>Virtual Sales Teams</h3>
            <p>Full-cycle remote reps — beyond SDR work, through close — built to match how your team already sells.</p>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['sr-band']}>
      <div className={styles['sr-wrap']}>
        <span className={styles['sr-kicker']} style={{ color: "rgba(255,255,255,0.92)" }}>How the motion runs</span>
        <h2 className={styles['sr-h2']} style={{ marginTop: "14px", color: "#fff" }}>Three channels, worked together.</h2>
        <p className={styles['sr-lede']} style={{ color: "rgba(255,255,255,0.9)" }}>One prospect, one sequence, three touchpoints.
          Reps work all three rather than living in a single inbox.</p>
  
        <div className={styles['sr-chan']}>
          <div className={styles['sr-chan-card']}>
            <span className={styles['sr-chan-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 6h16v12H4z' /><path d='m4 7 8 6 8-6' /></svg></span>
            <h3>Email</h3>
            <p>Warmed domains, monitored deliverability, and sequences that stop the moment a human replies.</p>
          </div>
          <div className={styles['sr-chan-card']}>
            <span className={styles['sr-chan-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z' /></svg></span>
            <h3>Phone</h3>
            <p>Live conversations with objection handling, dispositions, and notes written into the CRM.</p>
          </div>
          <div className={styles['sr-chan-card']}>
            <span className={styles['sr-chan-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3.5' y='3.5' width='17' height='17' rx='2.4' /><path d='M8 10.5v6M8 7.6v.01M12.2 16.5v-3.4a2 2 0 0 1 4 0v3.4' /></svg></span>
            <h3>LinkedIn</h3>
            <p>Profile-led touches that open replies email cannot, sequenced alongside the rest.</p>
          </div>
        </div>
  
        <div className={styles['sr-stack']}>
          <p>Certified in the tools before placement</p>
          <div className={styles['sr-stack-row']}>
            <span className={styles['sr-pill']}>LinkedIn Sales Navigator</span>
            <span className={styles['sr-pill']}>HubSpot</span>
            <span className={styles['sr-pill']}>GoHighLevel</span>
            <span className={styles['sr-pill']}>RevenueBase</span>
            <span className={styles['sr-pill']}>Apollo</span>
            <span className={styles['sr-pill']}>Your in-house CRM</span>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    

    <InterviewRail
      surface="white"
      eyebrow="Meet the bench"
      title={<>Hear a rep <span>before you meet one.</span></>}
      lede="Clips from our screening interviews — the same recordings that come with a shortlist, so you can judge the English, the tone, and the thinking before a call is booked."
      seats={interviewsFor('sales-and-revenue')}
    />

  <SeatTiersSection />

  <section className={styles['sr-section']}>
      <div className={styles['sr-wrap']}>
        <span className={styles['sr-kicker']}>Before you ask</span>
        <h2 className={styles['sr-h2']} style={{ marginTop: "14px" }}>The questions that decide it.</h2>
  
        <div className={styles['sr-faq']}>
          <details>
            <summary>Do you guarantee a number of meetings?</summary>
            <p>No, and we would be careful with anyone who does before seeing your offer, list, and market.
              What we commit to is the process, the reporting, and a free trial — you see real output
              before anything is signed. We report meetings held rather than activity, so the number in
              front of you is the one that matters.</p>
          </details>
          <details>
            <summary>Whose tools does the team work in?</summary>
            <p>Yours. Reps are certified in Sales Navigator, HubSpot, and GoHighLevel before placement, and
              we train on your in-house CRM during the ramp window if that is what you run. Sequences,
              dispositions, and notes all live in your system, not ours.</p>
          </details>
          <details>
            <summary>Can we start with one rep?</summary>
            <p>Yes, and most engagements do. One seat on one motion, proven, then grown. We build the process
              with you first and staff against it — that part is included rather than billed as setup.</p>
          </details>
          <details>
            <summary>What happens to the data and the domains?</summary>
            <p>Contact data is verified before it is worked, and sending infrastructure is warmed and monitored
              so your primary domain is not put at risk. Access is scoped per client under ISO 27001 controls,
              and everything we build stays with you if the engagement ends.</p>
          </details>
        </div>
      </div>
    </section>
  
  
    
  
    

    <BlogRail
      surface="white"
      eyebrow="From the blog"
      title={<>Reading for whoever <span>owns the number.</span></>}
      lede="Playbooks on scoping the seat, ramping it, and keeping the pipeline honest — written by the people who source and manage these reps."
    />

  <ServiceJsonLd path='/services/sales-and-revenue' />

  <ContactRail />
    </main>
  );
}
