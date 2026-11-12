import type { Metadata } from 'next';
import { pageOg } from '@/lib/site';
import styles from './page.module.css';
import { ServiceJsonLd } from '@/components/layout/JsonLd';
import ContactRail from '@/components/services/ContactRail';
import InterviewRail from '@/components/services/InterviewRail';
import { interviewsFor } from '@/lib/interviews';
import BlogRail from '@/components/services/BlogRail';

export const metadata: Metadata = {
  title: 'Managed IT',
  description:
    'A dedicated IT team for help desk, devices, network, cloud, cybersecurity and backup — co-managed with your IT lead or fully managed, under independently audited ISO 9001 and ISO 27001 controls.',
  alternates: { canonical: '/services/managed-it' },
  openGraph: pageOg('/services/managed-it'),
};

export default function Page() {
  return (
    <main>
  
  
    
  
    
  <section style={{ background: "linear-gradient(180deg,#f7faff 0%,var(--bg-marketing-paper) 62%)", borderBottom: "1px solid var(--border-default)" }}>
      <div className={`${styles['it-wrap']} ${styles['it-hero']}`}>
  
        <div>
          <span className={styles['it-kicker']}>Managed IT</span>
          <h1 className={styles['it-h1']}>Managed IT for the backbone you run on,<br /><span>monitored and maintained.</span></h1>
          <p className={styles['it-lede']}>From everyday employee support to network monitoring, cloud administration,
            cybersecurity and backup — we provide the people, processes and oversight that keep your IT
            environment working, with the same discipline we bring to your sales, support and back office.</p>
  
          <ul className={styles['it-checks']}>
            <li><span className={styles['it-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              Continuously monitored endpoints and network, not a black box you check once a quarter.</li>
            <li><span className={styles['it-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              Structured Tier 1 → Tier 2 escalation — a ticket queue with a system behind it.</li>
            <li><span className={styles['it-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              Independently audited ISO 9001 &amp; ISO 27001 controls on every engagement, the same as the rest of REM.</li>
          </ul>
  
          <div className={styles['it-cta-row']}>
            <a className={`${styles['it-btn']} ${styles['hv-1']}`} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>
              Book a free consult
              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={`${styles['it-btn']} ${styles['it-btn--ghost']} ${styles['hv-2']}`} href='#it-how'>See how it works</a>
          </div>
  
          <div className={styles['it-proof']}>
            <div><b>6</b><span>Coordinated service areas</span></div>
            <div><b>Tier 1→2</b><span>Structured escalation path</span></div>
            <div><b>You</b><span>Approve every person on your team</span></div>
            <div><b>ISO</b><span>9001 &amp; 27001, independently audited</span></div>
          </div>
        </div>
  
        
        <div className={styles['it-lattice']} aria-hidden='true'>
          <svg className={styles['it-lattice-svg']} viewBox='0 0 400 400'>
            <path className={styles['it-rail']} d='M200 200 L200 60' />
            <path className={styles['it-rail']} d='M200 200 L340 200' />
            <path className={styles['it-rail']} d='M200 200 L200 340' />
            <path className={styles['it-rail']} d='M200 200 L60 200' />
  
            <path className={styles['it-flow']} pathLength='100' d='M200 200 L200 60' />
            <path className={`${styles['it-flow']} ${styles['it-flow--b']}`} pathLength='100' d='M200 200 L340 200' />
            <path className={`${styles['it-flow']} ${styles['it-flow--c']}`} pathLength='100' d='M200 200 L200 340' />
            <path className={`${styles['it-flow']} ${styles['it-flow--d']}`} pathLength='100' d='M200 200 L60 200' />
  
            <path className={`${styles['it-resp']} it-resp--top`} pathLength='100' d='M200 200 L200 60' />
            <path className={`${styles['it-resp']} ${styles['it-resp--right']}`} pathLength='100' d='M200 200 L340 200' />
            <path className={`${styles['it-resp']} ${styles['it-resp--bottom']}`} pathLength='100' d='M200 200 L200 340' />
            <path className={`${styles['it-resp']} ${styles['it-resp--left']}`} pathLength='100' d='M200 200 L60 200' />
          </svg>
  
          <span className={styles['it-lattice-halo']}></span>
  
          <span className={styles['it-lattice-core']}>
            <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 12h4l2 7 4-14 2 7h6' /></svg></i>
            <b>Monitored<br />continuously</b>
            <small>One layer</small>
          </span>
  
          <span className={`${styles['it-node']} ${styles['it-node--top']}`}>
            <i><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='4' width='18' height='12' rx='2' /><path d='M8 20h8M12 16v4' /></svg></i>
            <span><b>Endpoints</b><em>Devices &amp; network</em></span>
          </span>
          <span className={`${styles['it-node']} ${styles['it-node--right']}`}>
            <i><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M9.3 15.3c0-2 1.3-2.6 2.7-2.6s2.7.6 2.7 2.6M12 8.5v.01' /></svg></i>
            <span><b>Help Desk</b><em>Tier 1 &amp; 2</em></span>
          </span>
          <span className={`${styles['it-node']} ${styles['it-node--bottom']}`}>
            <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M7 18a4 4 0 0 1-1-7.9A5 5 0 0 1 16 8a4.5 4.5 0 0 1 1 8.9' /></svg></i>
            <span><b>Cloud</b><em>Backup &amp; recovery</em></span>
          </span>
          <span className={`${styles['it-node']} ${styles['it-node--left']}`}>
            <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3 4 6.5V12c0 4.4 3.2 8 8 9 4.8-1 8-4.6 8-9V6.5z' /></svg></i>
            <span><b>Security</b><em>Access &amp; threats</em></span>
          </span>
        </div>
  
      </div>
    </section>
  
  
    
  
    
  <section className={styles['it-section']}>
      <div className={styles['it-wrap']}>
        <span className={styles['it-kicker']}>Why a managed team</span>
        <h2 className={styles['it-h2']} style={{ marginTop: "14px" }}>Your IT team, <span>without the overhead.</span></h2>
        <p className={styles['it-lede']}>You shouldn't have to choose between building a large internal IT department and
          leaving critical technology unmanaged. We work as an extension of your business — with structured
          support, proactive monitoring, clear escalation and ongoing management.</p>

        <div className={styles['it-chan']}>
          <div className={`${styles['it-chan-card']} ${styles['it-chan-card--light']}`}>
            <em>Monitoring</em>
            <h3>Proactive, not reactive</h3>
            <p>Issues are identified before they turn into business disruptions.</p>
          </div>
          <div className={`${styles['it-chan-card']} ${styles['it-chan-card--light']}`}>
            <em>People</em>
            <h3>Dedicated IT specialists</h3>
            <p>Trained professionals matched to your technology environment — and you approve every one.</p>
          </div>
          <div className={`${styles['it-chan-card']} ${styles['it-chan-card--light']}`}>
            <em>Operations</em>
            <h3>Secure and structured</h3>
            <p>Every engagement follows documented processes, quality controls and security practices.</p>
          </div>
          <div className={`${styles['it-chan-card']} ${styles['it-chan-card--light']}`}>
            <em>Coverage</em>
            <h3>Across your hours</h3>
            <p>Business hours or around the clock — true 24/7 is a small pod sharing the shift, sized to your team.</p>
          </div>
        </div>
      </div>
    </section>

  <section className={styles['it-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['it-wrap']}>
        <span className={styles['it-kicker']}>What we manage</span>
        <h2 className={styles['it-h2']} style={{ marginTop: "14px" }}>Six areas, <span>one coordinated team.</span></h2>
        <p className={styles['it-lede']}>The areas most businesses already think of as "IT" — run together instead of
          as six disconnected vendors.</p>

        <div className={`${styles['it-grid']} ${styles['it-grid--3']}`}>
          <div className={styles['it-card']}>
            <span className={styles['it-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M9.3 15.3c0-2 1.3-2.6 2.7-2.6s2.7.6 2.7 2.6M12 8.5v.01' /></svg></span>
            <h3>IT Help Desk</h3>
            <p>A reliable place your employees go when technology gets in the way — triaged and resolved
              through a structured Tier 1 to Tier 2 path.</p>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Tier 1 &amp; Tier 2 technical support</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Ticket management and troubleshooting</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Password, access, hardware and software help</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Employee onboarding and offboarding</span></li>
            </ul>
            <div className={styles['it-outcome']}><em>Business outcome</em><p>Employees get unblocked without waiting on one overloaded internal contact.</p></div>
          </div>
          <div className={styles['it-card']}>
            <span className={styles['it-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='4' width='18' height='12' rx='2' /><path d='M8 20h8M12 16v4' /></svg></span>
            <h3>Endpoint &amp; Device Management</h3>
            <p>Computers and employee devices kept secure, updated and ready for work.</p>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Device setup and configuration</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Software installation and patching</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Device health monitoring</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Endpoint troubleshooting</span></li>
            </ul>
            <div className={styles['it-outcome']}><em>Business outcome</em><p>Healthier devices, and fewer problems that keep coming back.</p></div>
          </div>
          <div className={styles['it-card']}>
            <span className={styles['it-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='4' width='18' height='7' rx='2' /><rect x='3' y='13' width='18' height='7' rx='2' /><path d='M7 7.5h.01M7 16.5h.01' /></svg></span>
            <h3>Network &amp; Infrastructure</h3>
            <p>Your business kept connected, and the core of your IT environment running reliably.</p>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Network and infrastructure monitoring</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Connectivity troubleshooting</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Router, switch and Wi-Fi support</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Performance and availability checks</span></li>
            </ul>
            <div className={styles['it-outcome']}><em>Business outcome</em><p>Problems are caught before they interrupt work, not after.</p></div>
          </div>
          <div className={styles['it-card']}>
            <span className={styles['it-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M7 18a4 4 0 0 1-1-7.9A5 5 0 0 1 16 8a4.5 4.5 0 0 1 1 8.9' /></svg></span>
            <h3>Cloud &amp; Microsoft 365</h3>
            <p>The cloud platforms your team relies on every day, administered properly.</p>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Microsoft 365 / Google Workspace administration</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>User and license management</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Cloud configuration</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Migration and deployment support</span></li>
            </ul>
            <div className={styles['it-outcome']}><em>Business outcome</em><p>Well-run cloud systems without adding another full-time administrator.</p></div>
          </div>
          <div className={styles['it-card']}>
            <span className={styles['it-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3 4 6.5V12c0 4.4 3.2 8 8 9 4.8-1 8-4.6 8-9V6.5z' /><path d='m8.7 12.2 2.3 2.3 4.4-4.7' /></svg></span>
            <h3>Cybersecurity</h3>
            <p>Your users, devices, accounts and business data protected against the most common threats.</p>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Access and permission management</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Endpoint security and threat monitoring</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Vulnerability and patch management</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Security policy support and incident escalation</span></li>
            </ul>
            <div className={styles['it-outcome']}><em>Business outcome</em><p>Security gaps get closed before they become an incident, not after.</p></div>
          </div>
          <div className={styles['it-card']}>
            <span className={styles['it-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Z' /><path d='M4 7v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5' /></svg></span>
            <h3>Backup &amp; Disaster Recovery</h3>
            <p>Making sure your business can recover when something goes wrong.</p>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Backup configuration and monitoring</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Recovery planning</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Data restoration support</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Disaster recovery assistance</span></li>
            </ul>
            <div className={styles['it-outcome']}><em>Business outcome</em><p>Business data has a defined, known path back if something goes wrong.</p></div>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['it-section']}>
      <div className={styles['it-wrap']}>
        <span className={styles['it-kicker']}>How the layer connects</span>
        <h2 className={styles['it-h2']} style={{ marginTop: "14px" }}>Not six services. <span>One IT layer.</span></h2>
        <p className={styles['it-lede']}>Your help desk, devices, network, security and cloud shouldn't operate as
          separate pieces. Our team works across all of them, so an issue is identified, escalated, resolved and
          documented without falling between departments or vendors.</p>
  
        <div className={styles['it-flowrow']}>
          <div className={styles['it-step']}>
            <span className={styles['it-step-num']}>1</span>
            <h3>Endpoint flagged</h3>
            <p>A device or connection is flagged the moment something looks off.</p>
          </div>
          <div className={styles['it-step']}>
            <span className={styles['it-step-num']}>2</span>
            <h3>Help Desk notified</h3>
            <p>The right ticket routes to Tier 1, or straight to Tier 2 if it's already clear what's needed.</p>
          </div>
          <div className={styles['it-step']}>
            <span className={styles['it-step-num']}>3</span>
            <h3>Security verifies</h3>
            <p>Access and device compliance are checked before the ticket is closed.</p>
          </div>
          <div className={styles['it-step']}>
            <span className={styles['it-step-num']}>4</span>
            <h3>Cloud confirms</h3>
            <p>The resolved state is backed up, so the fix sticks.</p>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['it-band']}>
      <div className={styles['it-wrap']}>
        <span className={styles['it-kicker']}>The daily cycle</span>
        <h2 className={styles['it-h2']} style={{ marginTop: "14px" }}>Monitor. Detect. Respond. Resolve. Prevent.</h2>
        <p className={styles['it-lede']}>The cycle every part of the layer runs on, every day — not just when
          something has already gone wrong.</p>
  
        <div className={`${styles['it-chan']} ${styles['it-chan--5']}`}>
          <div className={styles['it-chan-card']}>
            <em>Monitor</em>
            <h3>Always checking</h3>
            <p>Endpoints and network health are checked continuously, not just when something is already broken.</p>
          </div>
          <div className={styles['it-chan-card']}>
            <em>Detect</em>
            <h3>Caught early</h3>
            <p>Anomalies and access issues are flagged as they appear, not discovered during an audit.</p>
          </div>
          <div className={styles['it-chan-card']}>
            <em>Respond</em>
            <h3>Structured escalation</h3>
            <p>Tickets move through a Tier 1 → Tier 2 → specialist path, so nothing sits in a queue.</p>
          </div>
          <div className={styles['it-chan-card']}>
            <em>Resolve</em>
            <h3>Back to steady state</h3>
            <p>Once it's fixed, the resolution is documented and the system returns to steady monitoring.</p>
          </div>
          <div className={styles['it-chan-card']}>
            <em>Prevent</em>
            <h3>Fixed for good</h3>
            <p>Recurring issues are traced to their cause and patched, configured or retired so they stop coming back.</p>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    

    <InterviewRail
      surface="white"
      eyebrow="Meet the bench"
      title={<>Hear who would <span>pick up the ticket.</span></>}
      lede="Clips from our screening interviews — the same recordings that come with a shortlist, so you can judge how they explain a fix before anyone touches your systems."
      seats={interviewsFor('managed-it')}
    />

  <section className={styles['it-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['it-wrap']}>
        <span className={styles['it-kicker']}>Engagement</span>
        <h2 className={styles['it-h2']} style={{ marginTop: "14px" }}>Two ways to work with us.</h2>
        <p className={styles['it-lede']}>Augment the team you have, or hand us the whole function. Same controls either way.</p>
  
        <div className={styles['it-tiers']}>
          <div className={styles['it-tier']}>
            <div className={styles['it-tier-head']}>
              <h3>Co-Managed IT</h3>
              <span className={styles['it-tier-tag']}>For teams with existing IT</span>
            </div>
            <p>Your internal IT team stays in control while we take the recurring work that consumes their
              time — Tier 1 noise, monitoring and routine security — so they can focus on direction instead of tickets.</p>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Tier 1 &amp; Tier 2 support</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Monitoring and alert management</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Routine maintenance and endpoint support</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Security operations support</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Clear escalation to your internal IT team</span></li>
            </ul>
            <p className={styles['it-bestfor']}><b>Best for:</b> businesses with an existing IT department that need more capacity.</p>
          </div>
          <div className={`${styles['it-tier']} ${styles['it-tier--full']}`}>
            <div className={styles['it-tier-head']}>
              <h3>Fully Managed IT</h3>
              <span className={styles['it-tier-tag']}>For teams without dedicated IT</span>
            </div>
            <p>No internal IT function yet? We become it — the people and the operating structure to run your
              day-to-day IT environment, end to end.</p>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Service desk and endpoint management</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Network monitoring and cloud administration</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Cybersecurity support, backup and recovery</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Reporting and ongoing management</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>You approve every person on your team</span></li>
            </ul>
            <p className={styles['it-bestfor']}><b>Best for:</b> growing businesses that need reliable IT without building a large internal department.</p>
          </div>
        </div>
        <p className={styles['it-tier-note']}>Every engagement starts with a technology conversation, not a quote you
          can't verify — see the <a href='/pricing'>full pricing approach</a> or book a
          consult to scope yours.</p>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['it-section']} id='it-how'>
      <div className={styles['it-wrap']}>
        <span className={styles['it-kicker']}>How it works</span>
        <h2 className={styles['it-h2']} style={{ marginTop: "14px" }}>From onboarding <span>to ongoing support.</span></h2>
        <p className={styles['it-lede']}>A defined path from the first conversation to a team that runs your IT every day.</p>

        <div className={`${styles['it-flowrow']} ${styles['it-flowrow--5']}`}>
          <div className={styles['it-step']}>
            <span className={styles['it-step-num']}>1</span>
            <h3>Understand</h3>
            <p>We learn your business, users, systems, applications and current IT environment.</p>
          </div>
          <div className={styles['it-step']}>
            <span className={styles['it-step-num']}>2</span>
            <h3>Build</h3>
            <p>We define the team structure, responsibilities, tools and escalation paths.</p>
          </div>
          <div className={styles['it-step']}>
            <span className={styles['it-step-num']}>3</span>
            <h3>Transition</h3>
            <p>Our specialists document your environment and set up your support workflows.</p>
          </div>
          <div className={styles['it-step']}>
            <span className={styles['it-step-num']}>4</span>
            <h3>Manage</h3>
            <p>We monitor, support, maintain and secure your IT environment every day.</p>
          </div>
          <div className={styles['it-step']}>
            <span className={styles['it-step-num']}>5</span>
            <h3>Improve</h3>
            <p>Reporting and recurring reviews show where reliability, security and efficiency can improve.</p>
          </div>
        </div>
      </div>
    </section>

  <section className={styles['it-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['it-wrap']}>
        <span className={styles['it-kicker']}>Why Rem Assist</span>
        <h2 className={styles['it-h2']} style={{ marginTop: "14px" }}>Not just a technician. <span>A managed team.</span></h2>
        <p className={styles['it-lede']}>IT expertise backed by the same managed operations model behind every REM seat.</p>

        <div className={`${styles['it-grid']} ${styles['it-grid--3']}`}>
          <div className={`${styles['it-card']} ${styles['it-card--why']}`}>
            <h3>Dedicated specialists</h3>
            <p>Professionals selected for your environment and requirements, and approved by you.</p>
          </div>
          <div className={`${styles['it-card']} ${styles['it-card--why']}`}>
            <h3>Quality oversight</h3>
            <p>Structured supervision and quality management on every engagement.</p>
          </div>
          <div className={`${styles['it-card']} ${styles['it-card--why']}`}>
            <h3>Documented processes</h3>
            <p>Clear workflows, escalation paths and operating procedures you can read.</p>
          </div>
          <div className={`${styles['it-card']} ${styles['it-card--why']}`}>
            <h3>Scalable support</h3>
            <p>Add coverage as your business and your IT needs grow.</p>
          </div>
          <div className={`${styles['it-card']} ${styles['it-card--why']}`}>
            <h3>Coverage across your hours</h3>
            <p>Business hours or true 24/7, staffed as a pod so the shift is always covered.</p>
          </div>
          <div className={`${styles['it-card']} ${styles['it-card--why']}`}>
            <h3>Security &amp; quality controls</h3>
            <p>Independently audited <a href='/#certifications'>ISO 9001 and ISO 27001</a> controls, the same as the rest of REM.</p>
          </div>
        </div>
      </div>
    </section>

  <section className={styles['it-section']}>
      <div className={styles['it-wrap']}>
        <span className={styles['it-kicker']}>Before you ask</span>
        <h2 className={styles['it-h2']} style={{ marginTop: "14px" }}>The questions worth asking <span>before anyone touches your systems.</span></h2>
        <div className={styles['it-faq']}>
          <details>
            <summary>Will our team get an anonymous ticket queue?</summary>
            <p>No. Every ticket moves through a structured Tier 1 → Tier 2 → specialist path, so
              you always know where an issue stands and who owns it next — not a queue with no
              visibility into what happens after you submit it.</p>
          </details>
          <details>
            <summary>Is remote IT support actually secure?</summary>
            <p>Access is scoped to what a given ticket or task actually needs, logged, and revocable at any
              time. Remote support does not mean unrestricted access — it means the same controls a
              security review would expect, applied consistently.</p>
          </details>
          <details>
            <summary>What happens to our existing IT person?</summary>
            <p>Nothing changes about their role except what's on their plate. Co-Managed IT is built to take
              Tier 1 noise, monitoring, and routine work off an existing IT lead, not to replace them —
              your team gets stronger, not smaller.</p>
          </details>
          <details>
            <summary>What's your response time?</summary>
            <p>We're not going to hand you a minute-based number we can't stand behind. What we commit to
              instead is the structure: a clear escalation path, and a specialist engaged as soon as a ticket
              needs one, rather than sitting in a general queue.</p>
          </details>
          <details>
            <summary>Are you secure and compliant enough for our industry?</summary>
            <p>Every engagement operates under the same ISO 9001 quality and ISO 27001 security controls the
              rest of REM operates under, independently audited rather than self-declared. If your industry
              requires a specific framework beyond that, tell us on the call and we'll be direct about what
              we can and can't yet support.</p>
          </details>
          <details>
            <summary>What if we want to change providers later?</summary>
            <p>That's a fair question to ask before signing anything. We can walk through exactly how
              engagements start, scale, and end during a consult, so there are no surprises either way.</p>
          </details>
        </div>
      </div>
    </section>

  <section className={`${styles['it-band']} ${styles['it-close']}`}>
      <div className={styles['it-wrap']}>
        <span className={styles['it-kicker']}>Let's talk about your IT</span>
        <h2 className={styles['it-h2']} style={{ marginTop: "14px" }}>Built for businesses that can't afford IT downtime.</h2>
        <p className={styles['it-lede']}>Whether you need an extension of your IT department or an entire external IT
          function, tell us what you need managed — we'll help define the right team, scope and support model.</p>
        <div className={styles['it-cta-row']}>
          <a className={`${styles['it-btn']} ${styles['it-btn--light']}`} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>
            Book a free consult
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
          </a>
        </div>
      </div>
    </section>
  
  
    
  
    

    <BlogRail
      surface="paper"
      eyebrow="From the blog"
      title={<>Reading for whoever <span>owns the tickets.</span></>}
      lede="Playbooks on scoping the seat, ramping it, and keeping response times honest — written by the people who source and manage these technicians."
    />

  <ServiceJsonLd path='/services/managed-it' />

  <ContactRail />
    </main>
  );
}
