import type { Metadata } from 'next';
import { pageOg } from '@/lib/site';
import styles from './page.module.css';
import { ServiceJsonLd } from '@/components/layout/JsonLd';
import ContactRail from '@/components/services/ContactRail';
import BlogRail from '@/components/services/BlogRail';

export const metadata: Metadata = {
  title: 'Industry Specific',
  description:
    'Medical billing, insurance servicing, legal support and freight dispatch — four desks where a general assistant does not get far.',
  alternates: { canonical: '/services/industry-specific' },
  openGraph: pageOg('/services/industry-specific'),
};

export default function Page() {
  return (
    <main>
  
  
    
  
    
  <section style={{ background: "linear-gradient(180deg,#f7faff 0%,var(--bg-marketing-paper) 62%)", borderBottom: "1px solid var(--border-default)" }}>
      <div className={`${styles['iv-wrap']} ${styles['iv-hero']}`}>
  
        <div>
          <span className={styles['iv-kicker']}>Industry-Specific</span>
          <h1 className={styles['iv-h1']}>Industry-specific desks,<br /><span>staffed by people who know the work.</span></h1>
          <p className={styles['iv-lede']}>Medical billing, insurance servicing, legal support and freight dispatch —
            four desks where a general assistant does not get far. Agents arrive knowing the forms, the
            systems and the exceptions.</p>
  
          <ul className={styles['iv-checks']}>
            <li><span className={styles['iv-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              Trained on the vertical before placement — the terminology and the workflow, not just the software.</li>
            <li><span className={styles['iv-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              Every desk has a line we do not cross. <b>Advice, sign-off and anything licensed stays with you.</b></li>
            <li><span className={styles['iv-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              Work happens in your system of record, under independently audited ISO 27001 controls.</li>
          </ul>
  
          <div className={styles['iv-cta-row']}>
            <a className={`${styles['iv-btn']} ${styles['hv-1']}`} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>
              Talk through your desk
              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={`${styles['iv-btn']} ${styles['iv-btn--ghost']} ${styles['hv-2']}`} href='/qualify'>Qualify in two minutes</a>
          </div>
  
          <div className={styles['iv-proof']}>
            <div><b>Four desks</b><span>Medical, insurance, legal, logistics</span></div>
            <div><b>Your systems</b><span>We work in your system of record</span></div>
            <div><b>You</b><span>Hold every licensed act and sign-off</span></div>
            <div><b>ISO 27001</b><span>Independently audited controls</span></div>
          </div>
        </div>
  
        
        <div className={styles['iv-scope']} aria-hidden='true'>
          <div className={styles['iv-scope-head']}>
            <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 7h16M4 12h10M4 17h13' /><path d='M18 15v4M16 17h4' /></svg></i>
            <span>
              <b>Where each desk stops</b>
              <em>the operational work · and the act that is yours</em>
            </span>
          </div>
  
          <div className={styles['iv-scope-key']}>
            <span><i></i>We run it</span>
            <span><i></i>Only you can</span>
          </div>
  
          <ul className={styles['iv-bars']}>
            <li className={styles['iv-bar']}>
              <b>Medical billing &amp; RCM</b>
              <div className={styles['iv-track']}><span className={styles['iv-run']}></span><span className={styles['iv-own']}></span></div>
              <p className={styles['iv-line-label']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='5' y='11' width='14' height='9' rx='2' /><path d='M8.5 11V8a3.5 3.5 0 0 1 7 0v3' /></svg>
                <span>Code selection signed off by <b>your certified coder</b></span></p>
            </li>
            <li className={styles['iv-bar']}>
              <b>Insurance back office</b>
              <div className={styles['iv-track']}><span className={styles['iv-run']}></span><span className={styles['iv-own']}></span></div>
              <p className={styles['iv-line-label']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='5' y='11' width='14' height='9' rx='2' /><path d='M8.5 11V8a3.5 3.5 0 0 1 7 0v3' /></svg>
                <span>Binding cover and advising a client stays with <b>a licensed producer</b></span></p>
            </li>
            <li className={styles['iv-bar']}>
              <b>Legal process support</b>
              <div className={styles['iv-track']}><span className={styles['iv-run']}></span><span className={styles['iv-own']}></span></div>
              <p className={styles['iv-line-label']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='5' y='11' width='14' height='9' rx='2' /><path d='M8.5 11V8a3.5 3.5 0 0 1 7 0v3' /></svg>
                <span>Legal judgment and anything filed is <b>an attorney's call</b></span></p>
            </li>
            <li className={styles['iv-bar']}>
              <b>Logistics &amp; dispatch</b>
              <div className={styles['iv-track']}><span className={styles['iv-run']}></span><span className={styles['iv-own']}></span></div>
              <p className={styles['iv-line-label']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='5' y='11' width='14' height='9' rx='2' /><path d='M8.5 11V8a3.5 3.5 0 0 1 7 0v3' /></svg>
                <span>Rate authority and committing the load stays <b>on your broker authority</b></span></p>
            </li>
          </ul>
  
          <p className={styles['iv-scope-foot']}>The split shows scope, not a measurement. Where the line sits on your
            desk is written into the engagement before anyone starts.</p>
        </div>
  
      </div>
    </section>
  
  
    
  
    
  <section className={styles['iv-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['iv-wrap']}>
        <span className={styles['iv-kicker']}>Why a generalist stalls</span>
        <h2 className={styles['iv-h2']} style={{ marginTop: "14px" }}>These desks are made of words <span>you either know or you don't.</span></h2>
        <p className={styles['iv-lede']}>A capable assistant with no vertical training can follow a process until the first
          exception, then has to ask. On these desks the exceptions are most of the job.</p>
  
        <div className={styles['iv-vocab']}>
          <div className={styles['iv-vgroup']}>
            <b>Medical billing &amp; RCM</b>
            <div className={styles['iv-terms']}>
              <span>CPT</span><span>ICD-10</span><span>HCPCS</span><span>CMS-1500</span><span>EOB / ERA</span>
              <span>CARC / RARC</span><span>modifiers</span><span>prior auth</span><span>clearinghouse rejection</span>
              <span>A/R ageing</span><span>appeal levels</span><span>timely filing</span>
            </div>
          </div>
          <div className={styles['iv-vgroup']}>
            <b>Insurance back office</b>
            <div className={styles['iv-terms']}>
              <span>ACORD forms</span><span>COI</span><span>endorsement</span><span>BOR letter</span>
              <span>loss runs</span><span>declarations page</span><span>audit premium</span><span>renewal marketing</span>
              <span>submission</span><span>carrier appetite</span><span>surplus lines</span>
            </div>
          </div>
          <div className={styles['iv-vgroup']}>
            <b>Legal process support</b>
            <div className={styles['iv-terms']}>
              <span>Bates numbering</span><span>privilege log</span><span>redaction</span><span>docket</span>
              <span>e-filing portals</span><span>conflict check</span><span>chronology</span><span>deposition summary</span>
              <span>discovery response</span><span>retainer intake</span><span>Chapter 7 / 13</span>
            </div>
          </div>
          <div className={styles['iv-vgroup']}>
            <b>Logistics &amp; dispatch</b>
            <div className={styles['iv-terms']}>
              <span>BOL</span><span>rate confirmation</span><span>detention</span><span>lumper</span>
              <span>accessorials</span><span>deadhead</span><span>load board</span><span>factoring</span>
              <span>HOS / ELD</span><span>reefer break</span><span>drop and hook</span>
            </div>
          </div>
        </div>
  
        <p style={{ margin: "26px 0 0", fontSize: "14px", lineHeight: 1.7, color: "var(--ink-500)", maxWidth: "74ch" }}>Not a
          claim about certification — a claim about training. If a term above matters on your desk and
          is missing from the list, say so on the call and we will tell you honestly whether we have someone
          for it.</p>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['iv-section']}>
      <div className={styles['iv-wrap']}>
        <span className={styles['iv-kicker']}>What you can staff</span>
        <h2 className={styles['iv-h2']} style={{ marginTop: "14px" }}>Four desks, <span>each with its own line.</span></h2>
        <p className={styles['iv-lede']}>Take one seat on the process that is currently backing up, or the whole desk. The
          boundary at the bottom of each panel is not fine print — it is the reason the rest is safe to
          hand over.</p>
  
        <div className={styles['iv-desks']}>
  
          <div className={styles['iv-desk']}>
            <div className={styles['iv-desk-head']}>
              <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 4v6M9 7h6' /><rect x='4' y='10' width='16' height='10' rx='2' /><path d='M8 15h3M13 15h3' /></svg></i>
              <span>
                <h3>Medical Billing &amp; RCM</h3>
                <em>Revenue cycle operations</em>
              </span>
            </div>
            <ul className={styles['iv-runs']}>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Charge entry and claim submission on your schedule</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Rejections worked at the clearinghouse before they age</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Denials triaged by reason code, appeals drafted and tracked</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>A/R ageing worked to your escalation rules, with payer notes logged</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Eligibility and prior-authorisation follow-up</span></li>
            </ul>
            <div className={styles['iv-desk-sys']}><span>Your PM / EHR</span><span>Your clearinghouse</span></div>
            <p className={styles['iv-bound']}><b>Where we stop</b>We do not select or sign off codes. Coding decisions
              stay with your certified coder or provider, and the medical record stays the practice's
              responsibility.</p>
          </div>
  
          <div className={styles['iv-desk']}>
            <div className={styles['iv-desk-head']}>
              <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3 4 6.5V12c0 4.4 3.2 8 8 9 4.8-1 8-4.6 8-9V6.5z' /><path d='M9.6 12.4h4.8M12 10v4.8' /></svg></i>
              <span>
                <h3>Insurance Back Office</h3>
                <em>Servicing and renewals</em>
              </span>
            </div>
            <ul className={styles['iv-runs']}>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Submissions assembled and sent to carriers on your appetite list</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Certificates issued from your templates, endorsements requested</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Renewal lists built ahead of the window, loss runs chased</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Policy data checked against declarations and corrected in the AMS</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Premium audits and billing queries followed to resolution</span></li>
            </ul>
            <div className={styles['iv-desk-sys']}><span>Your AMS</span><span>Carrier portals</span></div>
            <p className={styles['iv-bound']}><b>Where we stop</b>We do not bind coverage, quote to a client, or advise on
              what a policy should contain. Every licensed act stays with your producer.</p>
          </div>
  
          <div className={styles['iv-desk']}>
            <div className={styles['iv-desk-head']}>
              <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 3h9l4 4v14H6z' /><path d='M15 3v4h4' /><path d='M9 12h7M9 16h5' /></svg></i>
              <span>
                <h3>Legal Process Support</h3>
                <em>Document and case operations</em>
              </span>
            </div>
            <ul className={styles['iv-runs']}>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Document review and coding to your review protocol</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Bates numbering, redaction passes and privilege-log upkeep</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Client intake, conflict-check data gathering and file opening</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Medical-record chronologies and deposition summaries</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Docket and deadline tracking, with filing packets assembled</span></li>
            </ul>
            <div className={styles['iv-desk-sys']}><span>Your DMS</span><span>Your review platform</span></div>
            <p className={styles['iv-bound']}><b>Where we stop</b>We are not lawyers and give no legal advice. Judgment,
              strategy, signature and anything actually filed remain with the attorney of record.</p>
          </div>
  
          <div className={styles['iv-desk']}>
            <div className={styles['iv-desk-head']}>
              <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 7h11v9H3z' /><path d='M14 10h4l3 3v3h-7z' /><circle cx='7' cy='18' r='1.8' /><circle cx='17.5' cy='18' r='1.8' /></svg></i>
              <span>
                <h3>Logistics &amp; Dispatch</h3>
                <em>Load and billing operations</em>
              </span>
            </div>
            <ul className={styles['iv-runs']}>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Load boards worked and options presented against your lanes</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Driver check calls, appointment setting and status updates</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Paperwork chased — BOLs, PODs, rate confirmations, lumper receipts</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Freight billing and invoicing, with accessorials captured not forgotten</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Carrier onboarding packets and document expiry tracking</span></li>
            </ul>
            <div className={styles['iv-desk-sys']}><span>Your TMS</span><span>Load boards</span></div>
            <p className={styles['iv-bound']}><b>Where we stop</b>Rate authority and committing a load are yours. We
              present and execute; we do not negotiate outside the bounds you set or operate on your broker
              authority.</p>
          </div>
  
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['iv-band']}>
      <div className={styles['iv-wrap']}>
        <span className={styles['iv-kicker']}>How every desk runs</span>
        <h2 className={styles['iv-h2']} style={{ marginTop: "14px" }}>The same three rules, whichever desk it is.</h2>
        <p className={styles['iv-lede']}>Four different regulators, four different vocabularies, one operating model. These
          are the parts that do not change.</p>
  
        <div className={styles['iv-rules']}>
          <div className={styles['iv-rule']}>
            <span className={styles['iv-rule-n']}>01</span>
            <h3>Your system of record</h3>
            <p>The desk works inside your PM, AMS, DMS or TMS — not a copy of it. The audit trail stays
              where your auditor, carrier or bar association expects to find it, and nothing has to be
              migrated back if we stop.</p>
          </div>
          <div className={styles['iv-rule']}>
            <span className={styles['iv-rule-n']}>02</span>
            <h3>The line, in writing</h3>
            <p>Before anyone starts, the scope says which acts are ours and which are yours. On these desks
              that is not a courtesy — getting it wrong is a licensing or malpractice question, not a
              service-quality one.</p>
          </div>
          <div className={styles['iv-rule']}>
            <span className={styles['iv-rule-n']}>03</span>
            <h3>Visibility without asking</h3>
            <p>Hourly work logs, a short written report every working day, and a named supervisor who is not
              the person doing the work. The same oversight every Rem Assist seat runs under.</p>
          </div>
        </div>
  
        <p className={styles['iv-band-note']}>We are an operations provider, not your compliance function and not your
          counsel. Where a regulation governs your desk, the obligation is yours and the scope is written so
          that stays true. See <a href='/how-it-works'>how an engagement runs</a>.</p>
        <a className={styles['iv-inline-cta']} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>Scope your desk on a call
          <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg></a>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['iv-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['iv-wrap']}>
        <span className={styles['iv-kicker']}>The hard questions</span>
        <h2 className={styles['iv-h2']} style={{ marginTop: "14px" }}>The questions worth asking <span>before a regulated desk changes hands.</span></h2>
        <div className={styles['iv-faq']}>
          <details>
            <summary>How is protected health information handled?</summary>
            <p>Raise it first and get the answer in writing before anything starts — not at signature.
              What we hold today is ISO 27001 for information security and ISO 9001 for quality, both
              independently audited rather than self-declared, with least-privilege access scoped per client.
              HIPAA is a separate regime with its own paperwork, and if a business associate agreement is a
              condition for you then it needs settling up front. We would rather lose the engagement at that
              question than pass it and be wrong about it.</p>
          </details>
          <details>
            <summary>Are your people licensed or certified in our field?</summary>
            <p>Assume not, and scope accordingly. Our agents are trained on the vertical — the
              terminology, the forms, the systems and the common exceptions — which is what makes the
              operational work possible. It is not the same as a state producer licence, a coding
              certification or a bar admission, and we do not present it as one. Every licensed act stays on
              your side of the line, which is why the line is written into the scope.</p>
          </details>
          <details>
            <summary>What about privilege and confidentiality on legal work?</summary>
            <p>The desk works inside your document management and review platforms under access you grant and
              can revoke, so the file never leaves your control. Confidentiality terms are signed before
              access. Whether a particular arrangement preserves privilege in your jurisdiction is a question
              for your own counsel, not for a vendor's website — and any provider answering it
              confidently on a marketing page should worry you.</p>
          </details>
          <details>
            <summary>Our volume is seasonal. Can seats come off?</summary>
            <p>Yes. Renewal season, a filing deadline, produce season and a payer's policy change are all
              spikes with an end date, and seats come off as easily as they go on. Anything documented during
              onboarding stays with you, so standing a desk back up later does not mean starting over.</p>
          </details>
          <details>
            <summary>Can we start with one process instead of the whole desk?</summary>
            <p>It is usually the better move. One seat on the process that is actually backing up —
              denials, certificates, intake, freight billing — tells you more than a full desk does and
              costs less to find out. Every engagement starts with a free trial and you approve the agent
              before they touch live work.</p>
          </details>
          <details>
            <summary>Can we see case studies from our industry?</summary>
            <p>Not yet, and we would rather say so than show you a logo that is not ours to show. Named
              write-ups publish when clients sign off on them. Until then the things you can actually inspect
              are the scope document, the daily logs and a free trial on your own live work.</p>
          </details>
        </div>
      </div>
    </section>
  
  
    
  
    
  <BlogRail
      surface="paper"
      eyebrow="From the blog"
      title={<>Reading for whoever <span>owns the line.</span></>}
      lede="Playbooks on scoping the desk, ramping it, and keeping the regulated work on your side — written by the people who source and manage these agents."
    />

  <ServiceJsonLd path='/services/industry-specific' />

  <ContactRail />
    </main>
  );
}
