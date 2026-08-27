import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Extra Services',
  description:
    'Everything we staff, in one place. One trained seat often covers several of these at once — take a single role, or a whole pod.',
  alternates: { canonical: '/services/extra-services' },
  openGraph: { url: '/services/extra-services' },
};

export default function Page() {
  return (
    <main>
  
  
    
  
    
  <section style={{ background: "linear-gradient(180deg,#f7faff 0%,var(--bg-marketing-paper) 70%)" }}>
      <div className={styles['xs-wrap']} style={{ paddingTop: "76px", paddingBottom: "48px" }}>
        <p className={styles['xs-eyebrow']}>Services</p>
        <h1 className={styles['xs-h1']}>Everything we staff, <span>in one place.</span></h1>
        <p className={styles['xs-lede']}>One trained seat often covers several of these at once — that is the
          point. Take a single role, or a whole pod.</p>
        <p className={styles['xs-hint']}>Pick a practice area to see what sits inside it.</p>
        <nav className={styles['xs-nav']} aria-label='Service categories'>
          <a href='#sales-revenue'>
            <span className={styles['xs-nav-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m4 17 5-5 4 3 6-7' /><path d='M15 8h4v4' /></svg></span>
            <span className='xs-nav-label'>Sales &amp; Revenue</span>
            <span className={styles['xs-pop']} aria-hidden='true'><span>SDR as a Service</span><span>Lead Generation &amp; List Building</span><span>Cold Calling Teams</span><span>Appointment Setting</span><span>Email Outreach &amp; Campaigns</span><span>Virtual Sales Teams</span></span>
          </a>
          <a href='#customer-experience'>
            <span className={styles['xs-nav-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 17v-5a8 8 0 0 1 16 0v5' /><path d='M20 18a2 2 0 0 1-2 2h-.8a1.8 1.8 0 0 1-1.8-1.8v-2.4A1.8 1.8 0 0 1 17.2 14H20zM4 18a2 2 0 0 0 2 2h.8a1.8 1.8 0 0 0 1.8-1.8v-2.4A1.8 1.8 0 0 0 6.8 14H4z' /></svg></span>
            <span className='xs-nav-label'>Customer Experience</span>
            <span className={styles['xs-pop']} aria-hidden='true'><span>Inbound Customer Support</span><span>Technical Support</span><span>Order &amp; Fulfillment Support</span></span>
          </a>
          <a href='#finance'>
            <span className={styles['xs-nav-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 10h18M6 6h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z' /><path d='M9 15h4' /></svg></span>
            <span className='xs-nav-label'>Finance &amp; Accounting</span>
            <span className={styles['xs-pop']} aria-hidden='true'><span>Bookkeeping &amp; Accounting</span><span>Accounts Payable &amp; Receivable</span><span>Payroll Processing</span></span>
          </a>
          <a href='#back-office'>
            <span className={styles['xs-nav-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 6h16M4 12h16M4 18h10' /></svg></span>
            <span className='xs-nav-label'>Back Office</span>
            <span className={styles['xs-pop']} aria-hidden='true'><span>Data Entry &amp; Processing</span><span>Document Management</span><span>Claims &amp; Application Processing</span><span>Executive &amp; Virtual Assistants</span></span>
          </a>
          <a href='#managed-it'>
            <span className={styles['xs-nav-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='4' width='18' height='7' rx='2' /><rect x='3' y='13' width='18' height='7' rx='2' /><path d='M7 7.5h.01M7 16.5h.01' /></svg></span>
            <span className='xs-nav-label'>Managed IT</span>
            <span className={styles['xs-pop']} aria-hidden='true'><span>Managed IT Services</span><span>IT Help Desk</span><span>Cybersecurity &amp; Compliance</span><span>Cloud &amp; Infrastructure</span></span>
          </a>
          <a href='#hr-recruiting'>
            <span className={styles['xs-nav-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='9' cy='8' r='3.4' /><path d='M3 20v-1.4A4.6 4.6 0 0 1 7.6 14h2.8a4.6 4.6 0 0 1 4.6 4.6V20' /><path d='M16.5 4.6a3.4 3.4 0 0 1 0 6.6M21 20v-1.4a4.6 4.6 0 0 0-3.2-4.4' /></svg></span>
            <span className='xs-nav-label'>HR &amp; Recruiting</span>
            <span className={styles['xs-pop']} aria-hidden='true'><span>Recruiting Support</span><span>HR Administration</span></span>
          </a>
          <a href='#industry'>
            <span className={styles['xs-nav-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='7' width='18' height='13' rx='2' /><path d='M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18' /></svg></span>
            <span className='xs-nav-label'>Industry-Specific</span>
            <span className={styles['xs-pop']} aria-hidden='true'><span>Medical Billing &amp; RCM</span><span>Insurance Back Office</span><span>Legal Process Outsourcing</span><span>Logistics &amp; Dispatch</span></span>
          </a>
          <a href='#marketing'>
            <span className={styles['xs-nav-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 10v4l12 5V5z' /><path d='M16 9a3 3 0 0 1 0 6' /></svg></span>
            <span className='xs-nav-label'>Marketing &amp; Content</span>
            <span className={styles['xs-pop']} aria-hidden='true'><span>GTM Teams</span><span>Marketing Support</span><span>Content &amp; Brand Management</span><span>Research &amp; Analysis</span></span>
          </a>
          <a href='#ai-automation'>
            <span className={styles['xs-nav-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m12 3 1.7 4.4 4.4 1.7-4.4 1.7L12 15.2l-1.7-4.4L5.9 9.1l4.4-1.7z' /><path d='m18.5 15.5.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z' /></svg></span>
            <span className='xs-nav-label'>AI &amp; Automation</span>
            <span className={styles['xs-pop']} aria-hidden='true'><span>AI Automations</span><span>AI Implementation</span><span>AI Agents &amp; Chatbots</span><span>Workflow &amp; Systems Integration</span><span>AI-Assisted Back Office</span></span>
          </a>
        </nav>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['xs-band']}>
      <div className={styles['xs-wrap']}>
        <p className={styles['xs-eyebrow']} style={{ color: "rgba(255,255,255,0.92)" }}>Why the list is not a menu</p>
        <h2 className={styles['xs-h2']} style={{ color: "#fff" }}>Most clients buy a seat, <span style={{ color: "rgba(255,255,255,0.7)" }}>not a service.</span></h2>
        <p className={styles['xs-lede']} style={{ color: "rgba(255,255,255,0.9)" }}>The categories below are how the work is
          organised, not how it is sold. A single trained seat routinely spans three of these lines,
          which is the whole economic argument for a pod over a hire.</p>
        <div className={styles['xs-blends']}>
          <div className={styles['xs-blend']}>
            <span className={styles['xs-blend-tag']}>Ops bottleneck</span>
            <b>Inbox triage + order processing + returns</b>
            <p>One back-office seat absorbing three queues that were each too small to hire for.</p>
          </div>
          <div className={styles['xs-blend']}>
            <span className={styles['xs-blend-tag']}>Finance bottleneck</span>
            <b>Bookkeeping + accounts payable + the monthly report</b>
            <p>One clerk running the cadence, with approval staying on your side of the line.</p>
          </div>
          <div className={styles['xs-blend']}>
            <span className={styles['xs-blend-tag']}>Pipeline bottleneck</span>
            <b>List building + sequencing + booking</b>
            <p>One SDR owning the whole loop rather than three tools nobody has time to run.</p>
          </div>
        </div>
      </div>
    </section>
  
  
    
  <section id='sales-revenue' className={styles['xs-cat']}>
      <div className={styles['xs-wrap']}>
        <a className={styles['xs-cat-head']} href='#sales-revenue'>
          <span className={styles['xs-cat-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m4 17 5-5 4 3 6-7' /><path d='M15 8h4v4' /></svg></span>
          <span className={styles['xs-cat-txt']}>
            <h2>Sales &amp; Revenue</h2>
            <p>Pipeline built and worked by dedicated reps.</p>
          </span>
          <span className={styles['xs-cat-toggle']} aria-hidden='true'><svg viewBox='0 0 24 24'><path d='m6 9 6 6 6-6' /></svg></span>
        </a>
        <div className={styles['xs-rows']}>
            <a className={styles['xs-row']} href='/services/sdr-as-a-service'>
              <b>SDR as a Service</b><small>Outbound reps booking qualified meetings</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <span className={`${styles['xs-row']} ${styles['xs-row--flat']}`}>
              <b>Lead Generation &amp; List Building</b><small>Verified, ICP-matched contact data</small>
            </span>
            <span className={`${styles['xs-row']} ${styles['xs-row--flat']}`}>
              <b>Cold Calling Teams</b><small>Your scripts, dispositions and CRM</small>
            </span>
            <span className={`${styles['xs-row']} ${styles['xs-row--flat']}`}>
              <b>Appointment Setting</b><small>Scheduling with no-show recovery</small>
            </span>
            <span className={`${styles['xs-row']} ${styles['xs-row--flat']}`}>
              <b>Email Outreach &amp; Campaigns</b><small>Sequences, deliverability, replies</small>
            </span>
            <span className={`${styles['xs-row']} ${styles['xs-row--flat']}`}>
              <b>Virtual Sales Teams</b><small>Full-cycle reps, through close</small>
            </span>
        </div>
          <a className={styles['xs-cat-more']} href='/services/sales-and-revenue'>Full Sales and Revenue page →</a>
      </div>
    </section>
  
  
    
  <section id='customer-experience' className={styles['xs-cat']}>
      <div className={styles['xs-wrap']}>
        <a className={styles['xs-cat-head']} href='#customer-experience'>
          <span className={styles['xs-cat-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 17v-5a8 8 0 0 1 16 0v5' /><path d='M20 18a2 2 0 0 1-2 2h-.8a1.8 1.8 0 0 1-1.8-1.8v-2.4A1.8 1.8 0 0 1 17.2 14H20zM4 18a2 2 0 0 0 2 2h.8a1.8 1.8 0 0 0 1.8-1.8v-2.4A1.8 1.8 0 0 0 6.8 14H4z' /></svg></span>
          <span className={styles['xs-cat-txt']}>
            <h2>Customer Experience</h2>
            <p>The front line, covered across your hours.</p>
          </span>
          <span className={styles['xs-cat-toggle']} aria-hidden='true'><svg viewBox='0 0 24 24'><path d='m6 9 6 6 6-6' /></svg></span>
        </a>
        <div className={styles['xs-rows']}>
            <a className={styles['xs-row']} href='/services/customer-service-agents'>
              <b>Inbound Customer Support</b><small>Voice, chat and email coverage</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={styles['xs-row']} href='/services/customer-service-agents'>
              <b>Technical Support</b><small>Product-trained agents who resolve</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <span className={`${styles['xs-row']} ${styles['xs-row--flat']}`}>
              <b>Order &amp; Fulfillment Support</b><small>Order entry, tracking and returns</small>
            </span>
        </div>
          <a className={styles['xs-cat-more']} href='/services/customer-service-agents'>Full Customer Experience page →</a>
      </div>
    </section>
  
  
    
  <section id='finance' className={styles['xs-cat']}>
      <div className={styles['xs-wrap']}>
        <a className={styles['xs-cat-head']} href='#finance'>
          <span className={styles['xs-cat-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 10h18M6 6h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z' /><path d='M9 15h4' /></svg></span>
          <span className={styles['xs-cat-txt']}>
            <h2>Finance &amp; Accounting</h2>
            <p>Clean books, closed on time, with an audit trail.</p>
          </span>
          <span className={styles['xs-cat-toggle']} aria-hidden='true'><svg viewBox='0 0 24 24'><path d='m6 9 6 6 6-6' /></svg></span>
        </a>
        <div className={styles['xs-rows']}>
            <a className={styles['xs-row']} href='/services/finance-and-accounting'>
              <b>Bookkeeping &amp; Accounting</b><small>Reconciliation and month-end close</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={styles['xs-row']} href='/services/finance-and-accounting'>
              <b>Accounts Payable &amp; Receivable</b><small>Invoices, vendors and collections</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={styles['xs-row']} href='/services/finance-and-accounting'>
              <b>Payroll Processing</b><small>Multi-state runs, filings, records</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
        </div>
          <a className={styles['xs-cat-more']} href='/services/finance-and-accounting'>Full Finance and Accounting page →</a>
      </div>
    </section>
  
  
    
  <section id='back-office' className={styles['xs-cat']}>
      <div className={styles['xs-wrap']}>
        <a className={styles['xs-cat-head']} href='#back-office'>
          <span className={styles['xs-cat-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 6h16M4 12h16M4 18h10' /></svg></span>
          <span className={styles['xs-cat-txt']}>
            <h2>Back Office</h2>
            <p>The work that keeps operations running behind the front line.</p>
          </span>
          <span className={styles['xs-cat-toggle']} aria-hidden='true'><svg viewBox='0 0 24 24'><path d='m6 9 6 6 6-6' /></svg></span>
        </a>
        <div className={styles['xs-rows']}>
            <a className={styles['xs-row']} href='/services/virtual-back-office-team'>
              <b>Data Entry &amp; Processing</b><small>High-volume, accuracy-audited work</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <span className={`${styles['xs-row']} ${styles['xs-row--flat']}`}>
              <b>Document Management</b><small>Digitization, indexing, transcription</small>
            </span>
            <span className={`${styles['xs-row']} ${styles['xs-row--flat']}`}>
              <b>Claims &amp; Application Processing</b><small>Intake, verification and routing</small>
            </span>
            <a className={styles['xs-row']} href='/services/virtual-back-office-team'>
              <b>Executive &amp; Virtual Assistants</b><small>Dedicated admin in your workflow</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
        </div>
          <a className={styles['xs-cat-more']} href='/services/virtual-back-office-team'>Full Back Office page →</a>
      </div>
    </section>
  
  
    
  <section id='managed-it' className={styles['xs-cat']}>
      <div className={styles['xs-wrap']}>
        <a className={styles['xs-cat-head']} href='#managed-it'>
          <span className={styles['xs-cat-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='4' width='18' height='7' rx='2' /><rect x='3' y='13' width='18' height='7' rx='2' /><path d='M7 7.5h.01M7 16.5h.01' /></svg></span>
          <span className={styles['xs-cat-txt']}>
            <h2>Managed IT</h2>
            <p>Your digital backbone, monitored and maintained.</p>
          </span>
          <span className={styles['xs-cat-toggle']} aria-hidden='true'><svg viewBox='0 0 24 24'><path d='m6 9 6 6 6-6' /></svg></span>
        </a>
        <div className={styles['xs-rows']}>
            <a className={styles['xs-row']} href='/services/managed-it'>
              <b>Managed IT Services</b><small>Endpoints, networks and monitoring</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <span className={`${styles['xs-row']} ${styles['xs-row--flat']}`}>
              <b>IT Help Desk</b><small>Tier 1 and Tier 2 support</small>
            </span>
            <span className={`${styles['xs-row']} ${styles['xs-row--flat']}`}>
              <b>Cybersecurity &amp; Compliance</b><small>Threat monitoring and access control</small>
            </span>
            <a className={styles['xs-row']} href='/services/managed-it'>
              <b>Cloud &amp; Infrastructure</b><small>Migration, backup and recovery</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
        </div>
          <a className={styles['xs-cat-more']} href='/services/managed-it'>Full Managed IT page →</a>
      </div>
    </section>
  
  
    
  <section id='hr-recruiting' className={styles['xs-cat']}>
      <div className={styles['xs-wrap']}>
        <a className={styles['xs-cat-head']} href='#hr-recruiting'>
          <span className={styles['xs-cat-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='9' cy='8' r='3.4' /><path d='M3 20v-1.4A4.6 4.6 0 0 1 7.6 14h2.8a4.6 4.6 0 0 1 4.6 4.6V20' /><path d='M16.5 4.6a3.4 3.4 0 0 1 0 6.6M21 20v-1.4a4.6 4.6 0 0 0-3.2-4.4' /></svg></span>
          <span className={styles['xs-cat-txt']}>
            <h2>HR &amp; Recruiting</h2>
            <p>An extension of your people team.</p>
          </span>
          <span className={styles['xs-cat-toggle']} aria-hidden='true'><svg viewBox='0 0 24 24'><path d='m6 9 6 6 6-6' /></svg></span>
        </a>
        <div className={styles['xs-rows']}>
            <a className={styles['xs-row']} href='/services/hr-and-recruiting'>
              <b>Recruiting Support</b><small>Sourcing, screening, scheduling</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={styles['xs-row']} href='/services/hr-and-recruiting'>
              <b>HR Administration</b><small>Onboarding, records, benefits admin</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
        </div>
          <a className={styles['xs-cat-more']} href='/services/hr-and-recruiting'>Full HR and Recruiting page →</a>
      </div>
    </section>
  
  
    
  <section id='industry' className={styles['xs-cat']}>
      <div className={styles['xs-wrap']}>
        <a className={styles['xs-cat-head']} href='#industry'>
          <span className={styles['xs-cat-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='7' width='18' height='13' rx='2' /><path d='M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18' /></svg></span>
          <span className={styles['xs-cat-txt']}>
            <h2>Industry-Specific</h2>
            <p>Regulated, specialist work handled by agents trained for it.</p>
          </span>
          <span className={styles['xs-cat-toggle']} aria-hidden='true'><svg viewBox='0 0 24 24'><path d='m6 9 6 6 6-6' /></svg></span>
        </a>
        <div className={styles['xs-rows']}>
            <a className={styles['xs-row']} href='/services/industry-specific'>
              <b>Medical Billing &amp; RCM</b><small>Claims, denials, appeals, A/R recovery</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={styles['xs-row']} href='/services/industry-specific'>
              <b>Insurance Back Office</b><small>Submissions, servicing and renewals</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={styles['xs-row']} href='/services/industry-specific'>
              <b>Legal Process Outsourcing</b><small>Document review, intake, case files</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={styles['xs-row']} href='/services/industry-specific'>
              <b>Logistics &amp; Dispatch Support</b><small>Load ops and freight billing</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
        </div>
          <a className={styles['xs-cat-more']} href='/services/industry-specific'>Full Industry-Specific page →</a>
      </div>
    </section>
  
  
    
  <section id='marketing' className={styles['xs-cat']}>
      <div className={styles['xs-wrap']}>
        <a className={styles['xs-cat-head']} href='#marketing'>
          <span className={styles['xs-cat-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 10v4l12 5V5z' /><path d='M16 9a3 3 0 0 1 0 6' /></svg></span>
          <span className={styles['xs-cat-txt']}>
            <h2>Marketing &amp; Content</h2>
            <p>The go-to-market motion, staffed as one pod.</p>
          </span>
          <span className={styles['xs-cat-toggle']} aria-hidden='true'><svg viewBox='0 0 24 24'><path d='m6 9 6 6 6-6' /></svg></span>
        </a>
        <div className={styles['xs-rows']}>
            <a className={styles['xs-row']} href='/services/gtm-teams'>
              <b>GTM Teams</b><small>A marketing ops pod hired as one unit</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={styles['xs-row']} href='/services/marketing-and-content'>
              <b>Marketing Support</b><small>SEO, social, print and campaigns</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={styles['xs-row']} href='/services/marketing-and-content'>
              <b>Content &amp; Brand Management</b><small>Content and identity across platforms</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={styles['xs-row']} href='/services/marketing-and-content'>
              <b>Research &amp; Analysis</b><small>Market and product research</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
        </div>
          <a className={styles['xs-cat-more']} href='/services/marketing-and-content'>Full Marketing and Content page →</a>
      </div>
    </section>
  
  
    
  <section id='ai-automation' className={styles['xs-cat']}>
      <div className={styles['xs-wrap']}>
        <a className={styles['xs-cat-head']} href='#ai-automation'>
          <span className={styles['xs-cat-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m12 3 1.7 4.4 4.4 1.7-4.4 1.7L12 15.2l-1.7-4.4L5.9 9.1l4.4-1.7z' /><path d='m18.5 15.5.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z' /></svg></span>
          <span className={styles['xs-cat-txt']}>
            <h2>AI &amp; Automation</h2>
            <p>Software does the volume; our agents keep the judgment calls.</p>
          </span>
          <span className={styles['xs-cat-toggle']} aria-hidden='true'><svg viewBox='0 0 24 24'><path d='m6 9 6 6 6-6' /></svg></span>
        </a>
        <div className={styles['xs-rows']}>
            <a className={styles['xs-row']} href='/services/ai-and-automation'>
              <b>AI Automations</b><small>Automate repetitive workflows</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={styles['xs-row']} href='/services/ai-and-automation'>
              <b>AI Implementation</b><small>Guided rollout into your operations</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={styles['xs-row']} href='/services/ai-and-automation'>
              <b>AI Agents &amp; Chatbots</b><small>Inbound chat, FAQs, qualification</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={styles['xs-row']} href='/services/ai-and-automation'>
              <b>Workflow &amp; Systems Integration</b><small>Connect your stack end to end</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={styles['xs-row']} href='/services/ai-and-automation'>
              <b>AI-Assisted Back Office</b><small>AI does volume, agents do judgment</small><svg className={styles['xs-row-go']} viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
        </div>
          <a className={styles['xs-cat-more']} href='/services/ai-and-automation'>Full AI and Automation page →</a>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['xs-plain']}>
      <div className={styles['xs-wrap']}>
        <p className={styles['xs-eyebrow']}>How to choose</p>
        <h2 className={styles['xs-h2']}>Three rules that save <span>a wasted first month.</span></h2>
        <div className={styles['xs-chooses']}>
          <div className={styles['xs-choose']}>
            <span className={styles['xs-choose-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m12 3 1.7 4.4 4.4 1.7-4.4 1.7L12 15.2l-1.7-4.4L5.9 9.1l4.4-1.7z' /></svg></span>
            <h3>Start with the bottleneck</h3>
            <p>Not the easiest thing to hand over. The first seat should absorb whatever is costing your team the most hours, which is usually the thing nobody wants to document.</p>
          </div>
          <div className={styles['xs-choose']}>
            <span className={styles['xs-choose-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 7h16M4 12h10M4 17h13' /></svg></span>
            <h3>One seat, then a pod</h3>
            <p>Most clients start with a single seat and add a second in month two, once the first is running without daily supervision. You are not committing to a department.</p>
          </div>
          <div className={styles['xs-choose']}>
            <span className={styles['xs-choose-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3 4 6.5V12c0 4.4 3.2 8 8 9 4.8-1 8-4.6 8-9V6.5z' /></svg></span>
            <h3>Mix the tiers</h3>
            <p>An Expert lead with Pro seats underneath is the most common shape we place, and the cheapest way to buy senior judgment without paying for it across the whole pod.</p>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['xs-plain']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['xs-wrap']}>
        <div className={styles['xs-incl']}>
          <div>
            <p className={styles['xs-eyebrow']}>Regardless of which service</p>
            <h2 className={styles['xs-h2']}>What every seat <span>comes with.</span></h2>
            <p className={styles['xs-lede']}>The same operating model sits behind all of it, so the thing that differs
              between these lines is the training, not the standard of delivery.</p>
            <ul className={styles['xs-incl-list']}>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Recruiting, vetting and the core training programme</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Process build and SOP writing during onboarding, yours to keep</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>QA, supervision and replacement if a seat is not working</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>Hourly work logs and a daily email report per seat</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>ISO 9001 quality and ISO 27001 information security controls</li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 13 4 4L19 7' /></svg>No setup fee, and seats can be added or dropped</li>
            </ul>
          </div>
          <aside className={styles['xs-rate']}>
            <p className={styles['xs-eyebrow']}>Published rates</p>
            <div className={styles['xs-rate-row']}>
              <span className={styles['xs-rate-name']}>Pro</span>
              <span className={styles['xs-rate-price']}><small>from</small><b>$8</b><em>/hr</em></span>
            </div>
            <div className={styles['xs-rate-row']}>
              <span className={styles['xs-rate-name']}>Expert</span>
              <span className={styles['xs-rate-price']}><small>from</small><b>$11</b><em>/hr</em></span>
            </div>
            <p className={styles['xs-rate-note']}>Same rate whichever service line the seat sits in. Coverage drives
              the cost, not the category.</p>
            <a className={styles['xs-rate-cta']} href='/pricing'>See the full pricing grid →</a>
          </aside>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['xs-plain']}>
      <div className={styles['xs-wrap']} style={{ maxWidth: "900px" }}>
        <p className={styles['xs-eyebrow']}>Before you ask</p>
        <h2 className={styles['xs-h2']}>Questions about <span>the list itself.</span></h2>
        <div className={styles['xs-faq']}>
          <details>
            <summary>Can one person really cover several of these?</summary>
            <p>Within reason, yes, and that is usually the point. A part-time seat covering inbox triage, order entry and returns is one person doing three things that were each too small to hire for. What does not work is stretching one seat across functions that need different training — we will say so rather than sell you the seat.</p>
          </details>
          <details>
            <summary>Do the services have fixed packages?</summary>
            <p>No. Rates are published per seat and per tier, and the scope is assembled from options quoted a la carte. You buy hours at a tier, not a bundle someone else designed.</p>
          </details>
          <details>
            <summary>What if the service we need is not listed?</summary>
            <p>Ask. The list covers what we staff routinely, not the limit of what our agents can be trained to do. If it is genuinely outside what we can deliver well, we would rather tell you on the call than take the engagement.</p>
          </details>
          <details>
            <summary>How do we know which of these we actually need?</summary>
            <p>Answer five questions and the fit finder will name the service line, the tier and a monthly estimate with the arithmetic shown. It takes about two minutes and does not ask for an email.</p>
          </details>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section id='book' style={{ background: "var(--brand-navy)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <h2 style={{ margin: "0 auto 16px", fontFamily: "var(--font-display)", fontSize: "36px", fontWeight: 700, color: "#fff" }}>Build a mixed team</h2>
        <p style={{ margin: "0 auto 32px", fontSize: "16px", lineHeight: 1.6, color: "var(--ink-200)", maxWidth: "52ch" }}>One VA can cover several of these on a single seat — that’s the point. Scope it in a free consultation.</p>
        <a href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener' style={{ display: "inline-block", background: "var(--brand-blue)", color: "#fff", fontSize: "17px", fontWeight: 600, textDecoration: "none", padding: "15px 32px", borderRadius: "6px", transition: "background 150ms" }} className={styles['hv-1']}>Book a Call</a>
      </div>
    </section>
  
  
  
    </main>
  );
}
