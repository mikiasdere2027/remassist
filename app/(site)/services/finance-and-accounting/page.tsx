import type { Metadata } from 'next';
import { pageOg } from '@/lib/site';
import styles from './page.module.css';
import { ServiceJsonLd } from '@/components/layout/JsonLd';
import ContactRail from '@/components/services/ContactRail';
import SeatTiersSection from '@/components/services/SeatTiers';
import InterviewRail from '@/components/services/InterviewRail';
import { interviewsFor } from '@/lib/interviews';
import BlogRail from '@/components/services/BlogRail';

export const metadata: Metadata = {
  title: 'Finance & Accounting',
  description:
    'Bookkeepers, AP and AR clerks, and payroll specialists working inside your ledger. Reconciled daily, closed monthly.',
  alternates: { canonical: '/services/finance-and-accounting' },
  openGraph: pageOg('/services/finance-and-accounting'),
};

export default function Page() {
  return (
    <main>
  
  
    
  
    
  <section style={{ background: "linear-gradient(180deg,#f7faff 0%,var(--bg-marketing-paper) 62%)", borderBottom: "1px solid var(--border-default)" }}>
      <div className={`${styles['fn-wrap']} ${styles['fn-hero']}`}>
  
        <div>
          <span className={styles['fn-kicker']}>Finance &amp; Accounting</span>
          <h1 className={styles['fn-h1']}>Bookkeeping that closes<br /><span>on time, every time.</span></h1>
          <p className={styles['fn-lede']}>Bookkeepers, accounts payable and receivable clerks, and payroll specialists
            working inside your ledger. Reconciled daily, closed monthly, every entry carrying its
            support.</p>
  
          <ul className={styles['fn-checks']}>
            <li><span className={styles['fn-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              We prepare and queue payments. <b>Releasing them stays with you.</b></li>
            <li><span className={styles['fn-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              Your ledger — QuickBooks, Xero, NetSuite, Sage or in-house. Nothing to migrate back.</li>
            <li><span className={styles['fn-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              Preparer and approver are different people, under audited ISO 27001 controls.</li>
          </ul>
  
          <div className={styles['fn-cta-row']}>
            <a className={`${styles['fn-btn']} ${styles['hv-1']}`} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>
              Book a free consult
              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={`${styles['fn-btn']} ${styles['fn-btn--ghost']} ${styles['hv-2']}`} href='/qualify'>Qualify in two minutes</a>
          </div>
  
          <div className={styles['fn-proof']}>
            <div><b>Daily</b><span>Bank and card reconciliation</span></div>
            <div><b>Monthly</b><span>Close pack handed over</span></div>
            <div><b>You</b><span>Approve every payment release</span></div>
            <div><b>ISO 27001</b><span>Independently audited controls</span></div>
          </div>
        </div>
  
        <div className={styles['fn-art']}>
          <div className={styles['fn-art-top']}>
            <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3 4 6.5V12c0 4.4 3.2 8 8 9 4.8-1 8-4.6 8-9V6.5z' /><path d='m8.7 12.2 2.3 2.3 4.4-4.7' /></svg></i>
            <b>Who signs what</b>
          </div>
          <p>The point of a finance seat is not to hand over control. It is to hand over the work that
            has to happen before anyone can exercise it.</p>
          <div className={styles['fn-art-split']}>
            <div className={styles['fn-art-col']}>
              <em>Prepared by us</em>
              <ul>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M8.5 12h7' /></svg><span>Coded and reconciled</span></li>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M8.5 12h7' /></svg><span>Vendors chased</span></li>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M8.5 12h7' /></svg><span>Runs assembled</span></li>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M8.5 12h7' /></svg><span>Close pack built</span></li>
              </ul>
            </div>
            <div className={styles['fn-art-col']}>
              <em>Approved by you</em>
              <ul>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Releasing payment</span></li>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Signing filings</span></li>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Journals and write-offs</span></li>
                <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Final sign-off</span></li>
              </ul>
            </div>
          </div>
        </div>
  
      </div>
    </section>
  
  
    
  
    
  <section className={styles['fn-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['fn-wrap']}>
        <span className={styles['fn-kicker']}>What you can staff</span>
        <h2 className={styles['fn-h2']} style={{ marginTop: "14px" }}>Six seats, <span>one finance desk.</span></h2>
        <p className={styles['fn-lede']}>Take one clerk on one process, or the whole desk. Every line below is a seat
          you can staff on its own.</p>
  
        <div className={styles['fn-grid']}>
          <div className={styles['fn-card']}>
            <span className={styles['fn-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 10h18M6 6h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z' /><path d='M9 15h4' /></svg></span>
            <h3>Bookkeeping &amp; accounting</h3>
            <p>Daily reconciliation, coding, journals and accruals, and a month-end close pack you can hand straight to your accountant.</p>
            <span className={`${styles['fn-tag']} ${styles['fn-tag--core']}`}>Core</span>
          </div>
          <div className={styles['fn-card']}>
            <span className={styles['fn-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 6h16v12H4z' /><path d='m4 7 8 6 8-6' /></svg></span>
            <h3>Accounts payable</h3>
            <p>Invoices captured and coded, vendor queries handled, payment runs prepared and queued for your approval — never released without it.</p>
            <span className={`${styles['fn-tag']} ${styles['fn-tag--core']}`}>Core</span>
          </div>
          <div className={styles['fn-card']}>
            <span className={styles['fn-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m4 17 5-5 4 3 6-7' /><path d='M15 8h4v4' /></svg></span>
            <h3>Accounts receivable</h3>
            <p>Invoices raised on schedule, ageing worked to your escalation rules, every chase logged against the account.</p>
            <span className={`${styles['fn-tag']} ${styles['fn-tag--core']}`}>Core</span>
          </div>
          <div className={styles['fn-card']}>
            <span className={styles['fn-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='8' r='4' /><path d='M4 21v-1.5A5.5 5.5 0 0 1 9.5 14h5a5.5 5.5 0 0 1 5.5 5.5V21' /></svg></span>
            <h3>Payroll processing</h3>
            <p>Multi-state payroll runs, filings and employee records maintained, with the calendar owned rather than remembered.</p>
            <span className={`${styles['fn-tag']} ${styles['fn-tag--core']}`}>Core</span>
          </div>
          <div className={styles['fn-card']}>
            <span className={styles['fn-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 20V10M10 20V4M16 20v-7M22 20H2' /></svg></span>
            <h3>Reporting &amp; packs</h3>
            <p>The recurring management reports you currently build by hand, produced on a schedule with the workings shown.</p>
            <span className={styles['fn-tag']}>Add-on</span>
          </div>
          <div className={styles['fn-card']}>
            <span className={styles['fn-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3 4 6.5V12c0 4.4 3.2 8 8 9 4.8-1 8-4.6 8-9V6.5z' /><path d='m8.7 12.2 2.3 2.3 4.4-4.7' /></svg></span>
            <h3>Controls &amp; segregation</h3>
            <p>Preparer and approver kept separate, access scoped per client, and the audit trail held in your system rather than ours.</p>
            <span className={styles['fn-tag']}>Included</span>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['fn-band']}>
      <div className={styles['fn-wrap']}>
        <span className={styles['fn-kicker']}>Cadence</span>
        <h2 className={styles['fn-h2']} style={{ marginTop: "14px" }}>Month-end should be a review, not an excavation.</h2>
        <p className={styles['fn-lede']}>That only holds if the work happens on a rhythm rather than in a panic. This
          is the rhythm every finance seat runs to.</p>
  
        <div className={styles['fn-cadence']}>
          <div className={styles['fn-beat']}>
            <em>Daily</em>
            <h3>As transactions land</h3>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Bank and card reconciliation matched the day it happens, so a mismatch surfaces immediately rather than three weeks later.</span></li>
            </ul>
          </div>
          <div className={styles['fn-beat']}>
            <em>Weekly</em>
            <h3>Prepared and queued</h3>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Payables run coded, queued and sitting in your approval list. Nothing leaves without you releasing it.</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Receivables ageing chased on your schedule and in your tone, with every contact logged against the account.</span></li>
            </ul>
          </div>
          <div className={styles['fn-beat']}>
            <em>Monthly</em>
            <h3>Closed and handed over</h3>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Journals and accruals posted with supporting documents attached to the entry, not filed elsewhere and cross-referenced.</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>A close pack you can review and pass to your accountant, rather than a balance you have to take on trust.</span></li>
            </ul>
          </div>
        </div>
        <p className={styles['fn-band-note']}>Coverage drives the cost of a finance desk far more than seniority does.
          One clerk on a weekly cadence and a full desk closing monthly across several entities are very
          different numbers, and we quote the second one honestly.</p>
      </div>
    </section>
  
  
    
  
    

    <InterviewRail
      surface="paper"
      eyebrow="Meet the bench"
      title={<>Hear who would <span>keep your books.</span></>}
      lede="Clips from our screening interviews — the same recordings that come with a shortlist, so you can judge the care and the questions before anyone is near your ledger."
      seats={interviewsFor('finance-and-accounting')}
    />

  <section className={styles['fn-section']}>
      <div className={styles['fn-wrap']}>
        <span className={styles['fn-kicker']}>Control</span>
        <h2 className={styles['fn-h2']} style={{ marginTop: "14px" }}>You keep the signature. <span>We do the work behind it.</span></h2>
  
        <div className={styles['fn-split']}>
          <div className={styles['fn-col']}>
            <h3>Prepared by us</h3>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M8.5 12h7' /></svg><span>Transactions coded and reconciled</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M8.5 12h7' /></svg><span>Invoices captured, vendors chased</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M8.5 12h7' /></svg><span>Payment runs assembled and queued</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M8.5 12h7' /></svg><span>Journals drafted with support attached</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M8.5 12h7' /></svg><span>Payroll prepared, filings drafted</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8.5' /><path d='M8.5 12h7' /></svg><span>Close pack built and delivered</span></li>
            </ul>
          </div>
          <div className={`${styles['fn-col']} ${styles['fn-col--you']}`}>
            <h3>Approved by you</h3>
            <ul>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Releasing any payment</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Signing any filing</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Approving journals and write-offs</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Setting credit and escalation rules</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Final sign-off on the close</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Everything a bank would ask you to own</span></li>
            </ul>
          </div>
        </div>
        <p className={styles['fn-rule']}><b>The rule we do not bend:</b> preparer and approver are different people,
          and the approver is you. Access is scoped to what the seat actually needs, under independently
          audited ISO 27001 controls.</p>
      </div>
    </section>
  
  
    
  
    
  <SeatTiersSection />
  
  
    
  
    
  <section className={styles['fn-section']}>
      <div className={styles['fn-wrap']}>
        <span className={styles['fn-kicker']}>Before you ask</span>
        <h2 className={styles['fn-h2']} style={{ marginTop: "14px" }}>The questions worth asking <span>before anyone near your ledger.</span></h2>
        <div className={styles['fn-faq']}>
          <details>
            <summary>Will you have access to move our money?</summary>
            <p>No. We prepare and queue payment runs; releasing them stays with you. Preparer and approver are deliberately separate roles and access is scoped to what the seat needs, which is the same control a bank or an auditor would expect you to hold.</p>
          </details>
          <details>
            <summary>Do you replace our accountant?</summary>
            <p>No, and we will say so plainly. This is the bookkeeping and transaction work that has to be done before an accountant or controller can do theirs. The close pack is built to hand straight to them.</p>
          </details>
          <details>
            <summary>What if our books are behind?</summary>
            <p>A common starting point. We scope the catch-up separately from the ongoing cadence, so you can see what is cleanup and what is steady state rather than paying a blended rate for both.</p>
          </details>
          <details>
            <summary>How is financial data protected?</summary>
            <p>Under ISO 27001 information security controls, independently audited rather than self-declared, with least-privilege access scoped per client. ISO 9001 covers the quality side. Anything we build during onboarding stays with you if the engagement ends.</p>
          </details>
          <details>
            <summary>Which ledger do you work in?</summary>
            <p>Yours. QuickBooks, Xero, NetSuite, Sage, Bill.com or an in-house system — the audit trail stays where your auditor expects to find it, and nothing has to be migrated back if we stop working together.</p>
          </details>
        </div>
      </div>
    </section>
  
  
    
  
    

    <BlogRail
      surface="paper"
      eyebrow="From the blog"
      title={<>Reading for whoever <span>signs off the month.</span></>}
      lede="Playbooks on scoping the seat, ramping it, and keeping the controls intact — written by the people who source and manage these desks."
    />

  <ServiceJsonLd path='/services/finance-and-accounting' />

  <ContactRail />
    </main>
  );
}
