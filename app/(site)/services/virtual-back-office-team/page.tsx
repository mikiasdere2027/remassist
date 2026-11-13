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
  title: 'Virtual Back Office Team',
  description:
    'The seats that keep operations running behind the front line, hired as one trained unit — you approve every agent before they start.',
  alternates: { canonical: '/services/virtual-back-office-team' },
  openGraph: pageOg('/services/virtual-back-office-team'),
};

/**
 * What one tile of the hero photo wall actually paints: 2 columns of the wrap
 * below 680px, then a 680px-wide wall, then the hero's right column.
 */
const TILE_SIZES = '(max-width: 680px) 45vw, (max-width: 1024px) 220px, 180px';

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
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG source. next/image needs the dangerouslyAllowSVG flag to touch one, and has nothing to optimise in a vector: no resize, no format conversion. */}
                <img src='/images/ISO_9001-2015.svg' alt='ISO 9001:2015 certified' />
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG source. next/image needs the dangerouslyAllowSVG flag to touch one, and has nothing to optimise in a vector: no resize, no format conversion. */}
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
  
        
        {/* The optimiser hands back the bitmap `sizes` asks for, and these were
            ported carrying the other service pages' 54px avatar-stack figure,
            so /_next/image handed back a 64px bitmap for a 178px tile, a 2.8x
            upscale. That was the mush. TILE_SIZES describes the real box.

            The files in /images/Agents are themselves only ~151px square, which
            is the remaining ceiling: the tile now gets all 151px instead of 64,
            and re-exporting the nine faces at 512px closes the rest. */}
        <div className={styles['vb-wall']} aria-hidden='true'>
          <div className={styles['vb-col']}>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-1.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-2.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-3.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/gtm-1.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-1.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-2.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-3.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/gtm-1.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
          </div>
          <div className={`${styles['vb-col']} ${styles['vb-col--down']} ${styles['vb-col--mid']}`}>
            <div className={styles['vb-tile']}><Image src='/images/Agents/gtm-2.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/gtm-3.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/sdr-1.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/sdr-2.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/gtm-2.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/gtm-3.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/sdr-1.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/sdr-2.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
          </div>
          <div className={`${styles['vb-col']} ${styles['vb-col--slow']}`}>
            <div className={styles['vb-tile']}><Image src='/images/Agents/sdr-3.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-1.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-2.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-3.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/sdr-3.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-1.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-2.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
            <div className={styles['vb-tile']}><Image src='/images/Agents/cs-3.jpg' alt='' width={256} height={256} sizes={TILE_SIZES} /></div>
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
  
  
    
  
    

    <InterviewRail
      surface="white"
      eyebrow="Meet the bench"
      title={<>Hear who would <span>run the queue.</span></>}
      lede="Clips from our screening interviews — the same recordings that come with a shortlist, so you can judge the attention to detail before anyone touches your documents."
      seats={interviewsFor('virtual-back-office-team')}
    />

  <SeatTiersSection />

  <section className={styles['vb-section']}>
      <div className={styles['vb-wrap']}>
        <span className={styles['vb-kicker']}>Before you ask</span>
        <h2 className={styles['vb-h2']} style={{ marginTop: "14px" }}>The questions that decide it.</h2>
  
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
  
  
    
  
    

    <BlogRail
      surface="white"
      eyebrow="From the blog"
      title={<>Reading for whoever <span>owns the backlog.</span></>}
      lede="Playbooks on scoping the seat, ramping it, and keeping throughput steady — written by the people who source and manage these teams."
    />

  <ServiceJsonLd path='/services/virtual-back-office-team' />

  <ContactRail />
    </main>
  );
}
