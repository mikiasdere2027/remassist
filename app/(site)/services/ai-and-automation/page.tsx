import type { Metadata } from 'next';
import { pageOg } from '@/lib/site';
import styles from './page.module.css';
import { ServiceJsonLd } from '@/components/layout/JsonLd';
import ContactRail from '@/components/services/ContactRail';
import BlogRail from '@/components/services/BlogRail';

export const metadata: Metadata = {
  title: 'AI & Automation',
  description:
    'We automate the high-volume half of a workflow and staff a trained seat on the half that needs a person — you decide where the line sits.',
  alternates: { canonical: '/services/ai-and-automation' },
  openGraph: pageOg('/services/ai-and-automation'),
};

export default function Page() {
  return (
    <main>
  
  
    
  
    
  <section style={{ background: "linear-gradient(180deg,#f7faff 0%,var(--bg-marketing-paper) 62%)", borderBottom: "1px solid var(--border-default)" }}>
      <div className={`${styles['ai-wrap']} ${styles['ai-hero']}`}>
  
        <div>
          <span className={styles['ai-kicker']}>AI &amp; Automation</span>
          <h1 className={styles['ai-h1']}>Automation that clears the work,<br /><span>until a person should.</span></h1>
          <p className={styles['ai-lede']}>We automate the high-volume half of a workflow and staff a trained seat on the
            half that needs a person. You decide where the line between them sits.</p>
  
          <ul className={styles['ai-checks']}>
            <li><span className={styles['ai-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              You set the confidence threshold per workflow. <b>We staff the queue below it.</b></li>
            <li><span className={styles['ai-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              Money leaving the business and anything a customer is upset about <b>never clear automatically</b>, whatever you set.</li>
            <li><span className={styles['ai-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              Every action is reconstructable afterwards — input, score, decision, who approved it, when.</li>
          </ul>
  
          <div className={styles['ai-cta-row']}>
            <a className={`${styles['ai-btn']} ${styles['hv-1']}`} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>
              Map one workflow, free
              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={`${styles['ai-btn']} ${styles['ai-btn--ghost']} ${styles['hv-2']}`} href='/qualify'>Qualify in two minutes</a>
          </div>
  
          <div className={styles['ai-proof']}>
            <div><b>One workflow</b><span>Where every engagement starts</span></div>
            <div><b>Your stack</b><span>Built on the tools you already run</span></div>
            <div><b>You</b><span>Set the threshold, hold the approvals</span></div>
            <div><b>ISO 27001</b><span>Independently audited controls</span></div>
          </div>
        </div>
  
        
        <div className={styles['ai-gate']} aria-hidden='true'>
          <div className={styles['ai-gate-head']}>
            <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 8h10M18 8h2M4 16h4M12 16h8' /><circle cx='16' cy='8' r='2.4' /><circle cx='10' cy='16' r='2.4' /></svg></i>
            <span>
              <b>Where the line sits</b>
              <em>you set it · we staff below it</em>
            </span>
          </div>
  
          <div className={styles['ai-scored']}>
            <span className={styles['ai-line']}><span>Threshold</span></span>
            <ul className={styles['ai-rows']}>
              <li className={styles['ai-row']}>
                <span>Invoice coded to a known vendor</span>
                <span className={`${styles['ai-meter']} ${styles['ai-meter--hi']}`}><i></i></span>
                <span className={styles['ai-state']}><span className={`${styles['ai-badge']} ${styles['ai-badge--auto']}`}>auto</span></span>
              </li>
              <li className={styles['ai-row']}>
                <span>Ticket routed to the right queue</span>
                <span className={`${styles['ai-meter']} ${styles['ai-meter--hi2']}`}><i></i></span>
                <span className={styles['ai-state']}><span className={`${styles['ai-badge']} ${styles['ai-badge--auto']}`}>auto</span></span>
              </li>
              <li className={`${styles['ai-row']} ${styles['ai-flip']}`}>
                <span>Refund under your limit</span>
                <span className={`${styles['ai-meter']} ${styles['ai-meter--mid']}`}><i></i></span>
                <span className={styles['ai-state']}><span className={`${styles['ai-badge']} ${styles['ai-badge--auto']}`}>auto</span><span className={`${styles['ai-badge']} ${styles['ai-badge--held']}`}>held</span></span>
              </li>
              <li className={`${styles['ai-row']} ${styles['ai-flip']}`}>
                <span>Order that does not reconcile</span>
                <span className={`${styles['ai-meter']} ${styles['ai-meter--mid2']}`}><i></i></span>
                <span className={styles['ai-state']}><span className={`${styles['ai-badge']} ${styles['ai-badge--auto']}`}>auto</span><span className={`${styles['ai-badge']} ${styles['ai-badge--held']}`}>held</span></span>
              </li>
            </ul>
          </div>
  
          <div className={styles['ai-locked']}>
            <p>Never clears, whatever you set</p>
            <ul className={styles['ai-rows']}>
              <li className={`${styles['ai-row']} ${styles['ai-row--lock']}`}>
                <span>Releasing a payment</span>
                <span className={styles['ai-lock']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='5' y='11' width='14' height='9' rx='2' /><path d='M8.5 11V8a3.5 3.5 0 0 1 7 0v3' /></svg></span>
                <span className={styles['ai-state']}><span className={`${styles['ai-badge']} ${styles['ai-badge--held']}`}>held</span></span>
              </li>
              <li className={`${styles['ai-row']} ${styles['ai-row--lock']}`}>
                <span>A customer who is upset</span>
                <span className={styles['ai-lock']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='5' y='11' width='14' height='9' rx='2' /><path d='M8.5 11V8a3.5 3.5 0 0 1 7 0v3' /></svg></span>
                <span className={styles['ai-state']}><span className={`${styles['ai-badge']} ${styles['ai-badge--held']}`}>held</span></span>
              </li>
            </ul>
          </div>
  
          <div className={styles['ai-gate-foot']}>
            <div className={styles['ai-seat']}>
              <svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='8' r='3.6' /><path d='M5 20v-1.4A4.6 4.6 0 0 1 9.6 14h4.8a4.6 4.6 0 0 1 4.6 4.6V20' /></svg>
              A trained seat works everything held
            </div>
            <div className={styles['ai-acts']}>
              <span>Approve</span><span>Correct</span><span>Escalate</span>
            </div>
          </div>
        </div>
  
      </div>
    </section>
  
  
    
  
    
  <section className={styles['ai-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={`${styles['ai-wrap']} ${styles['ai-editorial']}`}>
  
        <div>
          <span className={styles['ai-kicker']}>Before anything else</span>
          <h2 className={styles['ai-h2']} style={{ marginTop: "14px" }}>AI does not rescue a broken process. <span>It accelerates it.</span></h2>
          <p className={styles['ai-lede']}>Most automation that stalled did not stall on the technology. It stalled on
            one of these three, and all three are diagnosable in an afternoon.</p>
        </div>
  
        <ol className={styles['ai-fails']}>
          <li>
            <div>
              <b>The wrong step got automated</b>
              <p>The constraint was somewhere else, so the process got faster at the one point that was
                never holding it up. Nothing downstream moved.</p>
            </div>
          </li>
          <li>
            <div>
              <b>It worked until an input was unusual</b>
              <p>Rule-based automation has no behaviour for the case nobody wrote a rule for. It either
                stops and waits, or proceeds and is confidently wrong.</p>
            </div>
          </li>
          <li>
            <div>
              <b>The exception queue became someone's job</b>
              <p>The work moved rather than left. Nobody decided who owns the leftovers, so they found a
                volunteer — usually your most senior person.</p>
            </div>
          </li>
        </ol>
  
      </div>
    </section>
  
  
    
  
    
  <section className={styles['ai-band']}>
      <div className={styles['ai-wrap']}>
        <span className={styles['ai-kicker']}>The control surface</span>
        <h2 className={styles['ai-h2']} style={{ marginTop: "14px" }}>Four controls, and you hold all four.</h2>
        <p className={styles['ai-lede']}>Everyone in this market says there is a human in the loop. Far fewer say where
          that human sits, what wakes them, or how you check the machine's work afterwards.</p>
  
        <div className={styles['ai-labour']}>
          <div>
            <em>Software does</em>
            <p>Volume, matching, extraction, routing — the same decision made the same way ten thousand times.</p>
          </div>
          <div>
            <em>A person does</em>
            <p>Exceptions, consequence, tone, and every call you would want a name attached to.</p>
          </div>
        </div>
  
        <div className={styles['ai-controls']}>
  
          <div className={styles['ai-ctl']}>
            <span className={styles['ai-ctl-n']}>01</span>
            <h3>The confidence threshold</h3>
            <p>Each item gets a score, and you set the line it has to clear. Above the line it goes through.
              Below it, a person picks it up. Start the line high and lower it as the record earns it —
              that direction is much easier to defend than the other one.</p>
            <div className={styles['ai-viz']}>
              <div className={styles['ai-viz-track']}><i></i><b></b></div>
              <div className={styles['ai-viz-legend']}><span>Person handles</span><span>Clears</span></div>
            </div>
          </div>
  
          <div className={styles['ai-ctl']}>
            <span className={styles['ai-ctl-n']}>02</span>
            <h3>The always-hold list</h3>
            <p>Categories that go to a person no matter how confident the score is, because the cost of being
              wrong is not proportional to how often it happens. This list is agreed before go-live and it is
              not ours to edit.</p>
            <div className={styles['ai-viz']}>
              <div className={styles['ai-viz-locks']}>
                <span><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='5' y='11' width='14' height='9' rx='2' /><path d='M8.5 11V8a3.5 3.5 0 0 1 7 0v3' /></svg>Money leaving the business</span>
                <span><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='5' y='11' width='14' height='9' rx='2' /><path d='M8.5 11V8a3.5 3.5 0 0 1 7 0v3' /></svg>Anyone who is already unhappy</span>
                <span><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='5' y='11' width='14' height='9' rx='2' /><path d='M8.5 11V8a3.5 3.5 0 0 1 7 0v3' /></svg>Anything a person must attest to</span>
              </div>
            </div>
          </div>
  
          <div className={styles['ai-ctl']}>
            <span className={styles['ai-ctl-n']}>03</span>
            <h3>The escalation path</h3>
            <p>Who gets a held item, in what order, and what happens when nobody answers inside the window.
              Written down before go-live rather than discovered during the first incident, and the last hop
              is always a named person on your side.</p>
            <div className={styles['ai-viz']}>
              <div className={styles['ai-viz-chain']}>
                <span>Seat</span>
                <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
                <span>Supervisor</span>
                <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
                <span>You</span>
              </div>
            </div>
          </div>
  
          <div className={styles['ai-ctl']}>
            <span className={styles['ai-ctl-n']}>04</span>
            <h3>The audit trail</h3>
            <p>Input, score, decision, actor and timestamp, for every item — the ones a person touched
              and the ones that cleared on their own. If a decision cannot be reconstructed six months later,
              it was never really a control.</p>
            <div className={styles['ai-viz']}>
              <div className={styles['ai-viz-log']}>
                <span>item · score · cleared · automatic</span>
                <span>item · score · held · corrected by seat</span>
                <span>item · score · held · escalated to you</span>
              </div>
            </div>
          </div>
  
        </div>
  
        <p className={styles['ai-band-note']}>None of the four is a feature we can turn off to hit a number. They are the
          reason this is sellable at all: automation you cannot inspect is a liability with a good quarter
          behind it.</p>
        <a className={styles['ai-inline-cta']} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>Walk through these on a call
          <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg></a>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['ai-section']}>
      <div className={styles['ai-wrap']}>
        <span className={styles['ai-kicker']}>What you can buy</span>
        <h2 className={styles['ai-h2']} style={{ marginTop: "14px" }}>Five services, <span>one control surface.</span></h2>
        <p className={styles['ai-lede']}>The four controls apply to every line below. What changes is how much we build
          and how much we then staff.</p>
  
        <div className={styles['ai-services']}>
  
          <div className={`${styles['ai-svc']} ${styles['ai-svc--lead']}`}>
            <span className={styles['ai-svc-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 7h6M14 7h6M4 17h10M18 17h2' /><circle cx='12' cy='7' r='2.4' /><circle cx='16' cy='17' r='2.4' /></svg></span>
            <h3>AI Automations</h3>
            <p>One workflow you name: we automate the genuinely repetitive part and put a threshold and a
              staffed queue around the rest. Built on the tools you already run.</p>
            <ul className={styles['ai-egs']}>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Document and invoice capture, coded and filed</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Inbound triage, tagging and routing</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Record updates from a known template</span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg><span>Reconciliation, with the mismatches surfaced</span></li>
            </ul>
            <p className={styles['ai-get']}><b>What you get</b>The repetitive volume off your team's day, and a written
              record of every exception a person had to make a call on.</p>
          </div>
  
          <div className={styles['ai-svc']}>
            <span className={styles['ai-svc-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3v4M12 17v4M3 12h4M17 12h4' /><circle cx='12' cy='12' r='3.4' /></svg></span>
            <h3>AI Implementation</h3>
            <p>You bought the tool and it is not landing. We do the configuration, process design and
              training that turns a licence into something people use.</p>
            <p className={styles['ai-get']}><b>What you get</b>The tool in production, with the people around it trained.</p>
          </div>
  
          <div className={styles['ai-svc']}>
            <span className={styles['ai-svc-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 5h16v11H12l-4 3v-3H4z' /><path d='M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01' /></svg></span>
            <h3>AI Agents &amp; Chatbots</h3>
            <p>Answers your documentation already contains, handled automatically. Anything outside it
              handed to a person mid-conversation, not looped back to the menu.</p>
            <p className={styles['ai-get']}><b>What you get</b>Routine questions answered, and a real handover for the rest.</p>
          </div>
  
          <div className={styles['ai-svc']}>
            <span className={styles['ai-svc-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='4' width='7' height='7' rx='2' /><rect x='14' y='13' width='7' height='7' rx='2' /><path d='M10 7.5h2.5a2 2 0 0 1 2 2v3' /></svg></span>
            <h3>Workflow &amp; Systems Integration</h3>
            <p>A step is usually still manual because two systems do not speak. We connect them, and where
              no integration exists we staff the gap rather than pretend it closed.</p>
            <p className={styles['ai-get']}><b>What you get</b>One flow end to end, and honesty about the seams.</p>
          </div>
  
          <div className={styles['ai-svc']}>
            <span className={styles['ai-svc-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 6h16M4 12h16M4 18h10' /></svg></span>
            <h3>AI-Assisted Back Office</h3>
            <p>Our <a href='/services/virtual-back-office-team'>back office seats</a> with the volume already
              automated underneath them — so the seat spends its day on judgment rather than typing.</p>
            <p className={styles['ai-get']}><b>What you get</b>Fewer hours billed for the same work handled.</p>
          </div>
  
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['ai-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['ai-wrap']}>
        <span className={styles['ai-kicker']}>How it starts</span>
        <h2 className={styles['ai-h2']} style={{ marginTop: "14px" }}>One workflow first. <span>Always one.</span></h2>
        <p className={styles['ai-lede']}>Nobody should buy an automation programme. Buy one workflow, watch it for a
          month, then decide about the second.</p>
  
        <div className={styles['ai-rail']}>
          <div className={styles['ai-phase']}>
            <em>Phase 01</em>
            <h3>Map it</h3>
            <p>We follow one item end to end and write down where the time goes, which steps are
              automatable, and which should not be. You keep the map whether or not you buy anything.</p>
          </div>
          <div className={styles['ai-phase']}>
            <em>Phase 02</em>
            <h3>Pilot it</h3>
            <p>The threshold starts deliberately high, so most items still route to a person. The staffed
              half runs from day one, which is what makes the automated half safe to widen.</p>
          </div>
          <div className={styles['ai-phase']}>
            <em>Phase 03</em>
            <h3>Widen it</h3>
            <p>Lower the threshold as the audit trail earns it, then scope the next workflow on its own
              merits. No platform commitment, and no bundle where a weak workflow hides behind a strong one.</p>
          </div>
        </div>
  
        <a className={styles['ai-inline-cta']} href='/how-it-works'>See how a Rem Assist engagement runs
          <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg></a>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['ai-section']}>
      <div className={styles['ai-wrap']}>
        <span className={styles['ai-kicker']}>Where it lands</span>
        <h2 className={styles['ai-h2']} style={{ marginTop: "14px" }}>The volume and the exception, <span>function by function.</span></h2>
        <p className={styles['ai-lede']}>The split is the same everywhere. What differs is which items you cannot afford
          handled by a confident guess.</p>
  
        <div className={styles['ai-table']}>
          <div className={`${styles['ai-tr']} ${styles['ai-tr--head']}`}>
            <span>Function</span>
            <span>Clears automatically</span>
            <span>Stays with a person</span>
          </div>
          <div className={styles['ai-tr']}>
            <h3>Customer support</h3>
            <p>Routing, tagging, order-status and delivery questions, and anything your help centre already
              answers.</p>
            <p>Anyone <b>already unhappy</b>, anything owed money back, and any conversation where the next
              reply decides whether they stay.</p>
          </div>
          <div className={styles['ai-tr']}>
            <h3>Finance operations</h3>
            <p>Invoice capture and coding to known vendors, statement matching, and the reminder schedule
              nobody runs.</p>
            <p><b>Releasing any payment</b>, a mismatch with no obvious cause, and anything an auditor would
              later ask you to explain.</p>
          </div>
          <div className={styles['ai-tr']}>
            <h3>Back office</h3>
            <p>Data entry and validation, document classification, and record updates following a known
              template.</p>
            <p>A document that <b>does not match its template</b>, and any record where two sources disagree
              about the truth.</p>
          </div>
          <div className={styles['ai-tr']}>
            <h3>Sales operations</h3>
            <p>Lead routing and enrichment, CRM hygiene, meeting logistics, and follow-up that stops when a
              human replies.</p>
            <p>Pricing, anything a prospect <b>pushed back on</b>, and anything that changes a commitment you
              have already made.</p>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['ai-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['ai-wrap']}>
        <span className={styles['ai-kicker']}>The hard questions</span>
        <h2 className={styles['ai-h2']} style={{ marginTop: "14px" }}>The questions worth asking <span>before you automate anything.</span></h2>
        <div className={styles['ai-faq']}>
          <details>
            <summary>What happens when the model is wrong?</summary>
            <p>It will be, which is why the threshold exists. An item the model is unsure about never clears
              on its own — it goes to a seat. For the items that do clear, the audit trail is what makes
              a wrong one findable and fixable, and a pattern of them a reason to raise the line. We would be
              more worried about a provider who answered this question with an accuracy figure.</p>
          </details>
          <details>
            <summary>What will you refuse to automate?</summary>
            <p>Money leaving the business. Anything a person is legally required to attest to. Anyone who is
              already upset. Any decision about somebody's employment. Those are on the always-hold list at
              the start of every engagement, and raising a threshold does not reach them.</p>
          </details>
          <details>
            <summary>Is our data used to train anything?</summary>
            <p>No. Your data is used to run your workflow. Access is least-privilege and scoped per client
              under ISO 27001 controls that are independently audited rather than self-declared, and where a
              workflow runs through a third-party model we will tell you which one and what its retention
              terms are before you approve it.</p>
          </details>
          <details>
            <summary>Does this replace people on our team?</summary>
            <p>It replaces a category of task, and in our experience the task it replaces is the one nobody
              wanted. What we will not do is tell you a headcount number, because the honest answer depends
              on what your team does with the hours back — and that is your decision, not an output of
              our model.</p>
          </details>
          <details>
            <summary>What if the automation breaks, or a vendor goes down?</summary>
            <p>The workflow falls back to the staffed queue, which is the same queue already handling every
              held item. That is a real advantage of a staffed loop over a pure software one: there is no
              state where the work simply stops, only a slower state. The fallback is documented and tested
              before go-live rather than after.</p>
          </details>
          <details>
            <summary>How will we know it paid for itself?</summary>
            <p>Phase one gives you the baseline — how long the workflow takes now and who spends the
              time. After that, the volume that cleared automatically and the hours the seat billed are both
              in the record, so the comparison is arithmetic rather than a claim. If it does not clear, that
              shows up in month one and the pilot was deliberately small.</p>
          </details>
          <details>
            <summary>Do we need to buy new software?</summary>
            <p>Usually not. Most workflows we are asked about are already sitting on tools the client pays
              for and half-uses. Where something genuinely is missing we will say so and you will own the
              licence directly — we do not resell tooling, which keeps the recommendation honest.</p>
          </details>
        </div>
      </div>
    </section>
  
  
    
  
    
  <BlogRail
      surface="paper"
      eyebrow="From the blog"
      title={<>Reading for whoever <span>owns the threshold.</span></>}
      lede="Playbooks on scoping the workflow, ramping it, and keeping the automated half honest — written by the people who source and manage these teams."
    />

  <ServiceJsonLd path='/services/ai-and-automation' />

  <ContactRail />
    </main>
  );
}
