import type { Metadata } from 'next';
import { pageOg } from '@/lib/site';
import styles from './page.module.css';
import { ServiceJsonLd } from '@/components/layout/JsonLd';
import ContactRail from '@/components/services/ContactRail';
import BlogRail from '@/components/services/BlogRail';
import SeatTiersSection from '@/components/services/SeatTiers';

export const metadata: Metadata = {
  title: 'HR & Recruiting',
  description:
    'Sourcing, screening, interview coordination and onboarding administration, run inside your ATS and HRIS by a seat you interviewed.',
  alternates: { canonical: '/services/hr-and-recruiting' },
  openGraph: pageOg('/services/hr-and-recruiting'),
};

export default function Page() {
  return (
    <main>
  
  
    
  
    
  <section style={{ background: "linear-gradient(180deg,#f7faff 0%,var(--bg-marketing-paper) 62%)", borderBottom: "1px solid var(--border-default)" }}>
      <div className={`${styles['hr-wrap']} ${styles['hr-hero']}`}>
  
        <div>
          <span className={styles['hr-kicker']}>HR &amp; Recruiting</span>
          <h1 className={styles['hr-h1']}>Recruiting that moves,<br /><span>without the chase.</span></h1>
          <p className={styles['hr-lede']}>Sourcing, screening, interview coordination and onboarding administration —
            run inside your ATS and HRIS by a seat you interviewed. Every hiring decision still lands
            with you.</p>
  
          <ul className={styles['hr-checks']}>
            <li><span className={styles['hr-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              We advance and reject against <b>your written scorecard</b>, and show the reasoning on every candidate.</li>
            <li><span className={styles['hr-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              Work happens in your systems — Greenhouse, Lever, Workable, BambooHR or in-house. Nothing to migrate back.</li>
            <li><span className={styles['hr-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              We never make a hiring decision or attest to anyone's eligibility. <b>Those stay yours by design.</b></li>
          </ul>
  
          <div className={styles['hr-cta-row']}>
            <a className={`${styles['hr-btn']} ${styles['hv-1']}`} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>
              Talk to a talent specialist
              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={`${styles['hr-btn']} ${styles['hr-btn--ghost']} ${styles['hv-2']}`} href='/qualify'>Qualify in two minutes</a>
          </div>
  
          <div className={styles['hr-proof']}>
            <div><b>Your ATS</b><span>Where the pipeline lives</span></div>
            <div><b>2 wks</b><span>Consult to a working pipeline</span></div>
            <div><b>You</b><span>Approve shortlist and hire</span></div>
            <div><b>ISO 27001</b><span>Independently audited controls</span></div>
          </div>
        </div>
  
        
        <div className={styles['hr-relay']} aria-hidden='true'>
          <div className={styles['hr-relay-head']}>
            <span>Rem Assist runs it</span>
            <span>You decide it</span>
          </div>
  
          <div className={styles['hr-relay-body']}>
            <span className={styles['hr-relay-spine']}></span>
            <span className={styles['hr-relay-beam']}></span>
  
            <ol className={styles['hr-relay-list']}>
              <li className={`${styles['hr-relay-step']} ${styles['hr-relay-step--both']}`}>
                <span className={styles['hr-relay-chip']}><b>01</b><i>Intake &amp; scorecard</i></span>
              </li>
              <li className={`${styles['hr-relay-step']} ${styles['hr-relay-step--us']}`}>
                <span className={styles['hr-relay-chip']}><b>02</b><i>Sourcing</i></span>
              </li>
              <li className={`${styles['hr-relay-step']} ${styles['hr-relay-step--us']}`}>
                <span className={styles['hr-relay-chip']}><b>03</b><i>Screening</i></span>
              </li>
              <li className={`${styles['hr-relay-step']} ${styles['hr-relay-step--you']}`}>
                <span className={styles['hr-relay-chip']}><b>04</b><i>Shortlist review</i></span>
              </li>
              <li className={`${styles['hr-relay-step']} ${styles['hr-relay-step--us']}`}>
                <span className={styles['hr-relay-chip']}><b>05</b><i>Coordination</i></span>
              </li>
              <li className={`${styles['hr-relay-step']} ${styles['hr-relay-step--you']} ${styles['hr-relay-step--gate']}`}>
                <span className={styles['hr-relay-chip']}><b>06</b><i>Hiring decision</i></span>
              </li>
              <li className={`${styles['hr-relay-step']} ${styles['hr-relay-step--us']}`}>
                <span className={styles['hr-relay-chip']}><b>07</b><i>Onboarding</i></span>
              </li>
            </ol>
          </div>
  
          <div className={styles['hr-relay-foot']}>
            <span className={styles['hr-relay-out']}>
              <svg viewBox='0 0 24 24'><path d='m5 13 4 4L19 7' /></svg>
              <b>Started, not just hired</b><em>day one ready</em>
            </span>
          </div>
        </div>
  
      </div>
    </section>
  
  
    
  
    
  <section className={`${styles['hr-section']} ${styles['hr-section--paper']}`} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['hr-wrap']}>
        <span className={styles['hr-kicker']}>Where it breaks</span>
        <h2 className={styles['hr-h2']} style={{ marginTop: "14px" }}>The hiring plan was never the problem. <span>The operations were.</span></h2>
        <p className={styles['hr-lede']}>Nothing below is a strategy failure. It is the volume of coordination sitting
          between a decision and the thing actually happening.</p>
  
        <div className={styles['hr-grid']}>
          <div className={styles['hr-card']}>
            <span className={styles['hr-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 20V10M10 20V4M16 20v-7M22 20H2' /></svg></span>
            <h3>The requisition list outgrew the recruiter</h3>
            <p>One person cannot source, screen, schedule and chase feedback across a dozen open roles and
              still have a thought left over for how you hire.</p>
          </div>
          <div className={styles['hr-card']}>
            <span className={styles['hr-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='5' width='18' height='16' rx='2' /><path d='M8 3v4M16 3v4M3 10h18' /><path d='m9.5 15.5 1.8 1.8 3.6-3.8' /></svg></span>
            <h3>Coordination quietly eats the week</h3>
            <p>A four-person panel across two time zones, one reschedule, and a follow-up nobody sent.
              Hiring managers end up administering the process instead of assessing people.</p>
          </div>
          <div className={styles['hr-card']}>
            <span className={styles['hr-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3 4 6.5V12c0 4.4 3.2 8 8 9 4.8-1 8-4.6 8-9V6.5z' /><path d='M12 8.5v4M12 15.5h.01' /></svg></span>
            <h3>The offer is not the finish line</h3>
            <p>Paperwork, accounts, equipment, a day-one schedule, records that have to be complete and
              correct. It lands on whoever is least busy, which is nobody.</p>
          </div>
        </div>
  
        <p className={styles['hr-note']}>Candidates feel all three. <b>A week of silence is a week they spend answering
          somebody else's email</b> — and that cost only shows up later, as a declined offer nobody
          can quite explain.</p>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['hr-section']}>
      <div className={styles['hr-wrap']}>
        <span className={styles['hr-kicker']}>What you can staff</span>
        <h2 className={styles['hr-h2']} style={{ marginTop: "14px" }}>Two systems, <span>one people operation.</span></h2>
        <p className={styles['hr-lede']}>Recruiting operations and HR administration run on different clocks. We staff
          them separately, and you can take either one on its own.</p>
  
        <div className={styles['hr-systems']}>
  
          <div className={styles['hr-sys']}>
            <div className={styles['hr-sys-head']}>
              <i><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='11' cy='11' r='7' /><path d='m16.5 16.5 4 4' /></svg></i>
              <span>
                <h3>Recruiting Support</h3>
                <em>Before you can choose</em>
              </span>
            </div>
            <p>Everything that has to happen before a hiring manager has a real decision in front of
              them.</p>
  
            <ul className={styles['hr-caps']}>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg>
                <span><b>Candidate sourcing</b><span>Boolean and profile-led search against your scorecard
                — not one posting pushed to more boards.</span></span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg>
                <span><b>Resume screening</b><span>Every applicant read against your written criteria, with
                a note on why they advanced or did not.</span></span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg>
                <span><b>Pipeline management</b><span>Your ATS kept honest: stages accurate, notes written,
                nothing parked where no one owns it.</span></span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg>
                <span><b>Interview coordination</b><span>Panels booked across stakeholders and time zones,
                reschedules absorbed, feedback chased.</span></span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg>
                <span><b>Candidate communication</b><span>A reply inside a day and an update at every stage,
                in your voice and under your brand.</span></span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg>
                <span><b>Talent community</b><span>Runners-up kept warm, so the next opening starts with a
                list rather than a blank search.</span></span></li>
            </ul>
  
            <p className={styles['hr-off']}><b>Off your desk</b>The sourcing hours, the screening volume, the scheduling
              thread, and the follow-up nobody sent.</p>
  
            <details className={styles['hr-tasks']}>
              <summary>See a week of this seat's tasks</summary>
              <ul>
                <li>Build and run search strings for the open roles</li>
                <li>Review and disposition the inbound applicant queue</li>
                <li>Write candidate summaries against the scorecard</li>
                <li>Book and confirm the week's interview panels</li>
                <li>Absorb reschedules and re-confirm the panel</li>
                <li>Chase outstanding interview feedback</li>
                <li>Send stage updates to everyone still in play</li>
                <li>Close out and notify everyone who is not</li>
                <li>Reconcile ATS stages against reality</li>
                <li>Re-engage a shortlist from a role you closed</li>
              </ul>
            </details>
          </div>
  
          <div className={styles['hr-sys']}>
            <div className={styles['hr-sys-head']}>
              <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 3h9l4 4v14H6z' /><path d='M15 3v4h4' /><path d='m9.4 13.6 1.8 1.8 3.6-3.8' /></svg></i>
              <span>
                <h3>HR Administration &amp; Onboarding</h3>
                <em>After they say yes</em>
              </span>
            </div>
            <p>The lifecycle administration that has to be complete and correct, and that lands on
              whoever happens to be free.</p>
  
            <ul className={styles['hr-caps']}>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg>
                <span><b>Onboarding administration</b><span>Offer paperwork prepared, accounts and kit
                requested, day one built and confirmed.</span></span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg>
                <span><b>Employee records</b><span>Files current in your HRIS, plus a standing list of what
                is missing and who owes it.</span></span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg>
                <span><b>Documentation &amp; policy admin</b><span>Handbooks, acknowledgements and templates
                versioned, distributed and tracked to completion.</span></span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg>
                <span><b>Benefits administration support</b><span>Enrolment windows tracked, routine questions
                answered from your own documented answers, the rest routed to your broker.</span></span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg>
                <span><b>HR operations support</b><span>The rhythm nobody owns: trackers, reminders, and
                audits of your records before anyone else audits them.</span></span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg>
                <span><b>Offboarding coordination</b><span>Checklist run end to end, access removal requested
                on the day, exit paperwork filed.</span></span></li>
            </ul>
  
            <p className={styles['hr-off']}><b>Off your desk</b>The checklist, the chasing, and the file that turns out to
              be incomplete at exactly the wrong moment.</p>
  
            <details className={styles['hr-tasks']}>
              <summary>See a week of this seat's tasks</summary>
              <ul>
                <li>Prepare and issue the week's offer packets</li>
                <li>Request accounts, licences and equipment</li>
                <li>Build and confirm each day-one schedule</li>
                <li>Chase outstanding new-hire documents</li>
                <li>File and index completed paperwork in the HRIS</li>
                <li>Audit a slice of records against the checklist</li>
                <li>Track policy acknowledgements to completion</li>
                <li>Answer routine benefits questions from your FAQ</li>
                <li>Run the offboarding checklist for any leavers</li>
                <li>Update the trackers your reporting reads from</li>
              </ul>
            </details>
          </div>
  
        </div>
  
        <p className={styles['hr-note']}><b>Where we stop, on purpose.</b> We prepare I-9 and E-Verify paperwork and keep
          the workflow moving; the employer completes and attests. Payroll runs and filings sit with the
          <a href='/services/finance-and-accounting'>finance desk</a>, not this one. And we do not make hiring
          decisions. Anyone offering you all three is offering to hand you their liability.</p>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['hr-band']}>
      <div className={styles['hr-wrap']}>
        <span className={styles['hr-kicker']}>The lifecycle</span>
        <h2 className={styles['hr-h2']} style={{ marginTop: "14px" }}>Seven stages. Two of them are yours.</h2>
        <p className={styles['hr-lede']}>This is the actual sequence a requisition runs through. Every stage has one
          owner, agreed in writing before anybody starts work. Open any of them.</p>
  
        <ol className={styles['hr-ladder']}>
  
          <li>
            <details className={styles['hr-stage']}>
              <summary>
                <span className={styles['hr-stage-n']}>01</span>
                <h3 className={styles['hr-stage-name']}>Intake &amp; scorecard</h3>
                <span className={styles['hr-stage-own']}>Together</span>
                <span className={styles['hr-stage-plus']} aria-hidden='true'></span>
              </summary>
              <div className={styles['hr-stage-body']}>
                <div><em>We run</em><p>The session and the write-up. Must-haves, deal-breakers, the profile
                  that has actually lasted on this team, and the criteria every later decision gets measured
                  against.</p></div>
                <div><em>You own</em><p>The answers. What the role is for, what good looks like, and which
                  trade-offs you will accept — nobody outside your company can supply that.</p></div>
                <div><em>Then</em><p>The scorecard becomes the document, not a conversation someone half
                  remembers. Sourcing does not start until you have signed it off.</p></div>
              </div>
            </details>
          </li>
  
          <li>
            <details className={styles['hr-stage']}>
              <summary>
                <span className={styles['hr-stage-n']}>02</span>
                <h3 className={styles['hr-stage-name']}>Sourcing</h3>
                <span className={styles['hr-stage-own']}>Rem Assist</span>
                <span className={styles['hr-stage-plus']} aria-hidden='true'></span>
              </summary>
              <div className={styles['hr-stage-body']}>
                <div><em>We run</em><p>Search strings, profile-led outreach, referral mining and the inbound
                  queue — all of it logged into your ATS as it happens, under your employer
                  brand.</p></div>
                <div><em>You own</em><p>The brand and the pitch. We use your language for the role and the
                  company, not a generic template with your name pasted into it.</p></div>
                <div><em>Then</em><p>You watch the funnel fill in your own system, at any hour, without
                  asking anyone for a status update.</p></div>
              </div>
            </details>
          </li>
  
          <li>
            <details className={styles['hr-stage']}>
              <summary>
                <span className={styles['hr-stage-n']}>03</span>
                <h3 className={styles['hr-stage-name']}>Screening</h3>
                <span className={styles['hr-stage-own']}>Rem Assist</span>
                <span className={styles['hr-stage-plus']} aria-hidden='true'></span>
              </summary>
              <div className={styles['hr-stage-body']}>
                <div><em>We run</em><p>Every applicant read against the scorecard, structured screening calls
                  to your question set, and a written summary saying what matched and what did not.</p></div>
                <div><em>You own</em><p>The bar. If we are advancing the wrong people, that is a scorecard
                  conversation, and we would rather have it in week one than month three.</p></div>
                <div><em>Then</em><p>Rejections are reasoned and recorded, so a decision can be revisited
                  later instead of re-litigated from memory.</p></div>
              </div>
            </details>
          </li>
  
          <li>
            <details className={styles['hr-stage']}>
              <summary>
                <span className={styles['hr-stage-n']}>04</span>
                <h3 className={styles['hr-stage-name']}>Shortlist review</h3>
                <span className={`${styles['hr-stage-own']} ${styles['hr-stage-own--you']}`}>You</span>
                <span className={styles['hr-stage-plus']} aria-hidden='true'></span>
              </summary>
              <div className={styles['hr-stage-body']}>
                <div><em>We run</em><p>The pack: candidates, summaries, the scorecard mapping, and the open
                  questions worth putting to each of them. Assembled, not narrated at you on a call.</p></div>
                <div><em>You own</em><p>Who moves forward. We recommend and we show our reasoning; the
                  shortlist is not final until you say it is.</p></div>
                <div><em>Then</em><p>Your feedback on this pack sharpens the next one. This is where
                  calibration actually happens.</p></div>
              </div>
            </details>
          </li>
  
          <li>
            <details className={styles['hr-stage']}>
              <summary>
                <span className={styles['hr-stage-n']}>05</span>
                <h3 className={styles['hr-stage-name']}>Interview coordination</h3>
                <span className={styles['hr-stage-own']}>Rem Assist</span>
                <span className={styles['hr-stage-plus']} aria-hidden='true'></span>
              </summary>
              <div className={styles['hr-stage-body']}>
                <div><em>We run</em><p>Scheduling across the panel and the time zones, confirmations,
                  reschedules, candidate prep notes, and the chase for feedback afterwards.</p></div>
                <div><em>You own</em><p>The interviews themselves. Your people assess candidates; that is the
                  part of this process worth your calendar.</p></div>
                <div><em>Then</em><p>Panels stop slipping a week because one calendar was full and nobody had
                  time to fix it.</p></div>
              </div>
            </details>
          </li>
  
          <li>
            <details className={styles['hr-stage']}>
              <summary>
                <span className={styles['hr-stage-n']}>06</span>
                <h3 className={styles['hr-stage-name']}>Hiring decision</h3>
                <span className={`${styles['hr-stage-own']} ${styles['hr-stage-own--you']}`}>You, always</span>
                <span className={styles['hr-stage-plus']} aria-hidden='true'></span>
              </summary>
              <div className={styles['hr-stage-body']}>
                <div><em>We run</em><p>Nothing. We assemble the debrief and the evidence, and then we get out
                  of the way.</p></div>
                <div><em>You own</em><p>The hire. Fully, and with no exception we would ever ask you to make.
                  This is the one stage that cannot be delegated and should not be offered.</p></div>
                <div><em>Then</em><p>Say yes and stage seven starts the same day. Say no and the pipeline
                  behind it is already moving.</p></div>
              </div>
            </details>
          </li>
  
          <li>
            <details className={styles['hr-stage']}>
              <summary>
                <span className={styles['hr-stage-n']}>07</span>
                <h3 className={styles['hr-stage-name']}>Offer &amp; onboarding</h3>
                <span className={styles['hr-stage-own']}>Rem Assist</span>
                <span className={styles['hr-stage-plus']} aria-hidden='true'></span>
              </summary>
              <div className={styles['hr-stage-body']}>
                <div><em>We run</em><p>Offer paperwork prepared, documents collected and filed, accounts and
                  equipment requested, day-one schedule built and confirmed with everyone in it.</p></div>
                <div><em>You own</em><p>The offer terms, the signature, the I-9 attestation, and the welcome
                  itself. Culture is transferred by your people, not by an administrator.</p></div>
                <div><em>Then</em><p>Someone starts on a Monday with accounts that work and a calendar that
                  makes sense — and your records are complete without a cleanup later.</p></div>
              </div>
            </details>
          </li>
  
        </ol>
  
        <p className={styles['hr-band-note']}>Stage one is the one everybody wants to skip. We do not, because every other
          stage is measured against what comes out of it — and where nothing is written down yet, we
          document it as we go and hand you the SOP either way. It is the same
          <a href='/how-it-works'>onboarding process</a> every Rem Assist seat runs.</p>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['hr-section']}>
      <div className={styles['hr-wrap']}>
        <span className={styles['hr-kicker']}>Control</span>
        <h2 className={styles['hr-h2']} style={{ marginTop: "14px" }}>The final call is yours. <span>Everything before it is ours.</span></h2>
        <p className={styles['hr-lede']}>An operational extension is not a softer phrase for handing the function over.
          The judgment stays exactly where it is; the workload does not.</p>
  
        <div className={styles['hr-split']}>
          <div className={`${styles['hr-col']} ${styles['hr-col--us']}`}>
            <h3>Runs on our side</h3>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M8.5 12h7' /></svg><span>Sourcing, outreach and the inbound queue</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M8.5 12h7' /></svg><span>Screening against your written criteria</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M8.5 12h7' /></svg><span>Pipeline hygiene inside your ATS</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M8.5 12h7' /></svg><span>Scheduling, reschedules and reminders</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M8.5 12h7' /></svg><span>Candidate communication at every stage</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M8.5 12h7' /></svg><span>Onboarding and offboarding administration</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M8.5 12h7' /></svg><span>Records, documentation and the trackers</span></li>
            </ul>
          </div>
          <div className={`${styles['hr-col']} ${styles['hr-col--you']}`}>
            <h3>Stays with you</h3>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>The hiring decision, without exception</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Which roles open, and in what order</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>The bar, the scorecard and the trade-offs</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Culture, values and how they are assessed</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Interviews and the final conversation</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Offer terms, compensation and signature</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Employment eligibility and employee relations</span></li>
            </ul>
          </div>
        </div>
  
        <p className={styles['hr-rule']}><b>The rule we do not bend:</b> we do not decide who gets hired, and we do not
          attest to anyone's eligibility. We prepare the work so you can do both quickly, and the record
          stays in your systems — which is what makes ending the engagement a decision rather than a
          migration.</p>
  
        <a className={styles['hr-inline-cta']} href='/how-it-works'>See how a requisition would run with us
          <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg></a>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['hr-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['hr-wrap']}>
        <span className={styles['hr-kicker']}>Trust</span>
        <h2 className={styles['hr-h2']} style={{ marginTop: "14px" }}>What we can show you, <span>and what we will not claim.</span></h2>
        <p className={styles['hr-lede']}>This work touches your employer brand, your candidates' data and your team's
          judgment. Here is what underwrites it.</p>
  
        <div className={styles['hr-trust']}>
  
          <div className={styles['hr-tcard']}>
            <div className={styles['hr-tcard-head']}>
              <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 3h9l4 4v14H6z' /><path d='M15 3v4h4' /><path d='m9.4 13.6 1.8 1.8 3.6-3.8' /></svg></i>
              <h3>Calibration, not guesswork</h3>
            </div>
            <p>Cultural fit is not something an outside team can intuit, so we do not pretend to. The
              profile is written down with your hiring manager first, and every advance or reject is argued
              against that document — in writing, where you can see it and correct it.</p>
          </div>
  
          <div className={styles['hr-tcard']}>
            <div className={styles['hr-tcard-head']}>
              <i><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='9' /><path d='M12 7.5V12l3 2' /></svg></i>
              <h3>Visibility without asking</h3>
            </div>
            <p>The pipeline lives in your ATS, so the primary record is one you already own and can read
              at any hour. On top of that: hourly work logs, a short written report every working day, and a
              named supervisor who is not the person doing the work.</p>
          </div>
  
          <div className={styles['hr-tcard']}>
            <div className={styles['hr-tcard-head']}>
              <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3 4 6.5V12c0 4.4 3.2 8 8 9 4.8-1 8-4.6 8-9V6.5z' /><path d='m8.7 12.2 2.3 2.3 4.4-4.7' /></svg></i>
              <h3>Security you can audit</h3>
            </div>
            <p>Applicant and employee records are among the most sensitive data a company holds. Access is
              least-privilege and scoped per client, the data stays in your systems, and the controls are
              independently audited rather than self-declared.</p>
            <div className={styles['hr-iso']}>
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG source. next/image needs the dangerouslyAllowSVG flag to touch one, and has nothing to optimise in a vector: no resize, no format conversion. */}
              <img src='/images/ISO_9001-2015.svg' alt='ISO 9001:2015 certified' loading='lazy' decoding='async' />
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG source. next/image needs the dangerouslyAllowSVG flag to touch one, and has nothing to optimise in a vector: no resize, no format conversion. */}
              <img src='/images/ISO_27001-2022.svg' alt='ISO 27001:2022 certified' loading='lazy' decoding='async' />
            </div>
          </div>
  
          
          <div className={`${styles['hr-tcard']} ${styles['hr-tcard--open']}`}>
            <div className={styles['hr-tcard-head']}>
              <i><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='9' /><path d='M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.4' /><path d='M12 17h.01' /></svg></i>
              <h3>The proof we do not have yet</h3>
            </div>
            <p>We are not going to put a time-to-fill number or somebody else's logo on this page. Client
              write-ups publish when clients sign off on them, and not before. Until then the process above
              is what there is to judge — plus a free trial, where you watch a seat work your own open
              roles before anything is signed.</p>
          </div>
  
        </div>
      </div>
    </section>
  
  
    
  
    
  <SeatTiersSection />
  
  
    
  
    
  <section className={styles['hr-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['hr-wrap']}>
        <span className={styles['hr-kicker']}>Before you ask</span>
        <h2 className={styles['hr-h2']} style={{ marginTop: "14px" }}>The questions worth asking <span>before anyone near your pipeline.</span></h2>
        <div className={styles['hr-faq']}>
          <details>
            <summary>Who makes the final hiring decision?</summary>
            <p>You do. There is no version of this where we decide, recommend-then-proceed, or hold a
              tie-break. We assemble the evidence and the debrief; the yes or no is yours. If a provider
              offers to take that off your hands, they are offering to hand you their liability along
              with it.</p>
          </details>
          <details>
            <summary>Will an outside team understand our culture?</summary>
            <p>Not by intuition, which is exactly why we do not rely on it. Stage one produces a written
              scorecard with your hiring manager covering must-haves, deal-breakers and the working style
              that has actually lasted on your team, and every screening decision is argued against that
              document. Your feedback on the first shortlist is where calibration really happens — and
              we would rather have that conversation in week one than in month three.</p>
          </details>
          <details>
            <summary>Do you work in our ATS or yours?</summary>
            <p>Yours. Greenhouse, Lever, Workable, Ashby, BambooHR or something built in-house — we
              train on it during the ramp window. Candidates, notes, stages and history stay in the system
              you already own, which is what gives you real-time visibility and means there is nothing to
              migrate back if we stop working together.</p>
          </details>
          <details>
            <summary>Is this RPO? Are you replacing our recruiter?</summary>
            <p>No. Full RPO usually means handing the function over, which is the thing most teams are
              nervous about in the first place. This is an operational extension: your recruiter or people
              lead keeps the strategy, the bar and the relationships, and stops spending the week on sourcing
              volume and calendar management. If you do not have anyone in that seat yet, say so on the call
              — the shape of the engagement is different.</p>
          </details>
          <details>
            <summary>How is candidate and employee data handled?</summary>
            <p>Under ISO 27001 information security controls, independently audited rather than
              self-declared, with ISO 9001 covering the quality side. Access is least-privilege and scoped
              per client, and the records live in your ATS and HRIS rather than in a system of ours. Anything
              we build or document during onboarding stays with you if the engagement ends.</p>
          </details>
          <details>
            <summary>What about I-9, E-Verify and payroll?</summary>
            <p>We keep those workflows moving and prepare the paperwork, and we stop short of the parts that
              are legally the employer's. The I-9 attestation and E-Verify enrolment stay with you, because
              the obligation cannot be delegated and the penalties for getting it wrong are yours. Payroll
              runs and filings sit with our finance desk instead, under the same prepared-by-us,
              signed-by-you split — see <a href='/services/finance-and-accounting'>Finance &amp;
              Accounting</a>. On this page we are a workflow partner, not your employment counsel.</p>
          </details>
          <details>
            <summary>Can we start with one seat, or one role?</summary>
            <p>Yes, and most engagements should. One seat on the roles that are currently stuck is the
              cleanest way to find out whether this works on your process rather than in principle. Every
              engagement starts with a free trial, and you interview and approve the seat before it touches
              a requisition.</p>
          </details>
        </div>
      </div>
    </section>
  
  
    
  
    
  <BlogRail
      surface="paper"
      eyebrow="From the blog"
      title={<>Reading for whoever <span>owns the shortlist.</span></>}
      lede="Playbooks on scoping the role, ramping it, and keeping the scorecard honest — written by the people who source and manage these recruiters."
    />

  <ServiceJsonLd path='/services/hr-and-recruiting' />

  <ContactRail />
    </main>
  );
}
