import type { Metadata } from 'next';
import { pageOg } from '@/lib/site';
import styles from './page.module.css';
import { ServiceJsonLd } from '@/components/layout/JsonLd';
import ContactRail from '@/components/services/ContactRail';
import BlogRail from '@/components/services/BlogRail';

export const metadata: Metadata = {
  title: 'Marketing & Content',
  description:
    'A go-to-market pod — lead, outbound, content and RevOps — hired as one unit with one owner, built into the stack you already run.',
  alternates: { canonical: '/services/marketing-and-content' },
  openGraph: pageOg('/services/marketing-and-content'),
};

export default function Page() {
  return (
    <main>
  
  
    
  
    
  <section style={{ background: "linear-gradient(180deg,#f7faff 0%,var(--bg-marketing-paper) 62%)", borderBottom: "1px solid var(--border-default)" }}>
      <div className={`${styles['mc-wrap']} ${styles['mc-hero']}`}>
  
        <div>
          <span className={styles['mc-kicker']}>Marketing &amp; Content</span>
          <h1 className={styles['mc-h1']}>Marketing that ships,<br /><span>not marketing that's planned.</span></h1>
          <p className={styles['mc-lede']}>A go-to-market pod — lead, outbound, content and RevOps — hired as
            one unit with one owner. Two to six seats, built into the stack you already run.</p>
  
          <ul className={styles['mc-checks']}>
            <li><span className={styles['mc-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              One named lead owns the output. <b>You have one conversation, not four.</b></li>
            <li><span className={styles['mc-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              The pod works inside your GoHighLevel or HubSpot — funnels, sequences and attribution stay yours.</li>
            <li><span className={styles['mc-tick']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m5 12.5 4.5 4.5L19 7' /></svg></span>
              We do not sell you a strategy you then have to execute. <b>The pod does the shipping.</b></li>
          </ul>
  
          <div className={styles['mc-cta-row']}>
            <a className={`${styles['mc-btn']} ${styles['hv-1']}`} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>
              Scope your pod, free
              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
            </a>
            <a className={`${styles['mc-btn']} ${styles['mc-btn--ghost']} ${styles['hv-2']}`} href='/services/gtm-teams'>See what's in a pod</a>
          </div>
  
          <div className={styles['mc-proof']}>
            <div><b>2–6 seats</b><span>Sized to your motion</span></div>
            <div><b>Weekly</b><span>Pipeline report and a standup</span></div>
            <div><b>Daily</b><span>Work logs on every seat</span></div>
            <div><b>ISO 27001</b><span>Independently audited controls</span></div>
          </div>
        </div>
  
        
        <div className={styles['mc-seam']} aria-hidden='true'>
          <div className={styles['mc-seam-head']}>
            <i><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 12h5M15 12h5' /><path d='M9 8.5v7M15 8.5v7' /></svg></i>
            <span>
              <b>The same five steps</b>
              <em>owned two different ways</em>
            </span>
          </div>
  
          <div className={`${styles['mc-state']} ${styles['mc-state--split']}`}>
            <p className={styles['mc-state-label']}>Four suppliers</p>
            <div className={styles['mc-blocks']}>
              <span className={styles['mc-blk']}><b>SEO</b><em>Agency</em></span>
              <span className={styles['mc-gap']}><i className={styles['mc-stuck']}></i></span>
              <span className={styles['mc-blk']}><b>Social</b><em>Freelance</em></span>
              <span className={styles['mc-gap']}></span>
              <span className={styles['mc-blk']}><b>Ads</b><em>Agency</em></span>
              <span className={styles['mc-gap']}></span>
              <span className={styles['mc-blk']}><b>Content</b><em>Writer</em></span>
            </div>
            <p className={styles['mc-state-note']}>Nothing owns the gaps, so you do. You are the integration layer.</p>
          </div>
  
          <div className={`${styles['mc-state']} ${styles['mc-state--joined']}`}>
            <p className={styles['mc-state-label']}>One pod</p>
            <div className={styles['mc-track']}>
              <span className={styles['mc-seg']}>Research</span>
              <span className={styles['mc-seg']}>Strategy</span>
              <span className={styles['mc-seg']}>Content</span>
              <span className={styles['mc-seg']}>Campaign</span>
              <span className={styles['mc-seg']}>Analysis</span>
              <i className={styles['mc-item']}></i>
            </div>
            <div className={styles['mc-owner']}>One named lead owns all five</div>
          </div>
        </div>
  
      </div>
    </section>
  
  
    
  
    
  <section className={styles['mc-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['mc-wrap']}>
        <span className={styles['mc-kicker']}>Why this keeps happening</span>
        <h2 className={styles['mc-h2']} style={{ marginTop: "14px" }}>Every fix for a marketing gap <span>quietly creates another one.</span></h2>
        <p className={styles['mc-lede']}>Not because any of these suppliers are bad at their job. Because none of them owns
          the space between their job and the next one.</p>
  
        <div className={styles['mc-versus']}>
          <div className={`${styles['mc-vrow']} ${styles['mc-vrow--head']}`}>
            <span>What it promises</span>
            <span>What it actually produces</span>
          </div>
          <div className={styles['mc-vrow']}>
            <p>A fractional CMO</p>
            <p>A strategy, a deck, and a roadmap — with the <b>execution still sitting on your desk</b>.
              The plan was never the missing piece.</p>
          </div>
          <div className={styles['mc-vrow']}>
            <p>An agency for each channel</p>
            <p>Four roadmaps, four reporting formats and four opinions about your positioning. The brand
              drifts apart at the seams nobody is watching.</p>
          </div>
          <div className={styles['mc-vrow']}>
            <p>A freelancer to fill the gap</p>
            <p>The gap moves. Now there is a fifth person to brief, and <b>you are the project manager</b>
              for all of them.</p>
          </div>
          <div className={styles['mc-vrow']}>
            <p>Six months to find out</p>
            <p>The real constraint was conversion and you spent two quarters buying awareness. That is the
              most expensive way to learn what your bottleneck was.</p>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['mc-band']}>
      <div className={styles['mc-wrap']}>
        <span className={styles['mc-kicker']}>How a pod holds together</span>
        <h2 className={styles['mc-h2']} style={{ marginTop: "14px" }}>A team you hire once, not a roster you manage.</h2>
        <p className={styles['mc-lede']}>A pod is two to six seats filled from our bench and pointed at one motion. What
          makes it a team rather than a group is on the right: one owner, and the same three things arriving
          whether or not you chase them.</p>
  
        <div className={styles['mc-pod']}>
          <div className={styles['mc-pod-side']}>
            <em>Who is in it</em>
            <ul className={styles['mc-roles']}>
              <li>
                <b>GTM Lead <span className={styles['mc-lead-tag']}>the owner</span></b>
                <span>Owns the plan, the weekly report and the result. Your single point of contact for
                  everything the pod does.</span>
              </li>
              <li>
                <b>SDRs</b>
                <span>List building, sequencing, calls and booking — the same specialists behind
                  <a href='/services/sdr-as-a-service' style={{ color: "#fff", textDecoration: "underline", textUnderlineOffset: "3px" }}>SDR as a Service</a>.</span>
              </li>
              <li>
                <b>Marketing VA</b>
                <span>Content, social, SEO support and campaign assembly that keeps the outbound warm.</span>
              </li>
              <li>
                <b>RevOps / CRM Admin</b>
                <span>Pipelines, automations, attribution and hygiene, so the numbers in the report are
                  numbers you can act on.</span>
              </li>
            </ul>
          </div>
          <div className={styles['mc-pod-side']}>
            <em>What arrives every week</em>
            <ul className={styles['mc-week']}>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 20V10M10 20V4M16 20v-7M22 20H2' /></svg>
                <span><b>A pipeline report</b><span>Meetings booked, opportunities created and campaign
                performance, against the KPIs you set — not the ones that flatter us.</span></span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 17v-5a8 8 0 0 1 16 0v5' /><path d='M8 20h8' /></svg>
                <span><b>A standup with your lead</b><span>One call, one owner. Change targeting, messaging
                or priority in a single conversation instead of five.</span></span></li>
              <li><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='9' /><path d='M12 7.5V12l3 2' /></svg>
                <span><b>Daily work logs</b><span>Hourly logs and a daily email on every seat, so a quiet
                week is visible on day two rather than at the end of the month.</span></span></li>
            </ul>
          </div>
        </div>
  
        <p className={styles['mc-band-note']}>The pod lives in your GoHighLevel or HubSpot — funnels, workflows,
          sequences and attribution all built in your instance. If the engagement ends, the machine stays
          with you rather than leaving with us.</p>
        <a className={styles['mc-inline-cta']} href='/services/gtm-teams'>See the pod in detail
          <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg></a>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['mc-section']}>
      <div className={styles['mc-wrap']}>
        <span className={styles['mc-kicker']}>What you can staff</span>
        <h2 className={styles['mc-h2']} style={{ marginTop: "14px" }}>Four functions, <span>one motion.</span></h2>
        <p className={styles['mc-lede']}>Take the whole pod, or the single function that is currently the bottleneck. Both
          start the same way — with a conversation about which one it actually is.</p>
  
        <div className={styles['mc-fns']}>
  
          <div className={styles['mc-fn']}>
            <span className={styles['mc-fn-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M15.5 20.5v-1.8a3.7 3.7 0 0 0-3.7-3.7H6.2a3.7 3.7 0 0 0-3.7 3.7v1.8' /><circle cx='9' cy='7.2' r='3.7' /><path d='M21.5 20.5v-1.8a3.7 3.7 0 0 0-2.8-3.6' /></svg></span>
            <div>
              <h3><a href='/services/gtm-teams'>GTM Teams</a></h3>
              <p>The whole motion staffed as one unit: lead, outbound, content and RevOps working to a single
                plan with a single owner. Sized at two to six seats depending on how you sell.</p>
              <a className={styles['mc-fn-more']} href='/services/gtm-teams'>See the full page
                <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg></a>
            </div>
            <div className={styles['mc-fn-get']}><b>What you get</b>A marketing function that runs without you convening
              it, and one person answerable for the number.</div>
          </div>
  
          <div className={styles['mc-fn']}>
            <span className={styles['mc-fn-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 6h16v12H4z' /><path d='m4 7 8 6 8-6' /></svg></span>
            <div>
              <h3>Marketing Support</h3>
              <p>The execution layer: campaign assembly, email and social scheduling, SEO support, landing
                pages, print and collateral. The work that is not hard, but does not happen unless somebody
                owns the calendar.</p>
            </div>
            <div className={styles['mc-fn-get']}><b>What you get</b>Things go out on the day they were meant to, without a
              reminder from you.</div>
          </div>
  
          <div className={styles['mc-fn']}>
            <span className={styles['mc-fn-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 3h9l4 4v14H6z' /><path d='M15 3v4h4' /><path d='M9 12h7M9 16h5' /></svg></span>
            <div>
              <h3>Content &amp; Brand Management</h3>
              <p>One voice across every channel, held to a written brand guide rather than to whoever wrote
                the last post. Production, scheduling, repurposing and the review step that keeps it
                consistent.</p>
            </div>
            <div className={styles['mc-fn-get']}><b>What you get</b>A publishing rhythm you can rely on, and a brand that
              still sounds like itself in six months.</div>
          </div>
  
          <div className={styles['mc-fn']}>
            <span className={styles['mc-fn-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='11' cy='11' r='7' /><path d='m16.5 16.5 4 4' /></svg></span>
            <div>
              <h3>Research &amp; Analysis</h3>
              <p>Market, competitor and ICP research, plus the analysis that says which constraint is
                actually binding. This is the cheapest work on the page and skipping it is what makes the
                rest expensive.</p>
            </div>
            <div className={styles['mc-fn-get']}><b>What you get</b>A defensible answer to "where should the next dollar
              go", before you spend it.</div>
          </div>
  
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['mc-section']} style={{ background: "var(--bg-marketing-paper)" }}>
      <div className={styles['mc-wrap']}>
        <span className={styles['mc-kicker']}>Before you ask</span>
        <h2 className={styles['mc-h2']} style={{ marginTop: "14px" }}>The questions worth asking <span>before anyone touches your brand.</span></h2>
        <div className={styles['mc-faq']}>
          <details>
            <summary>Is a "pod" just freelancers with better branding?</summary>
            <p>The difference is who absorbs the coordination. A group of freelancers reports to you
              separately, which means you hold the plan, chase the handoffs and reconcile the numbers. A pod
              reports through one lead who does that work instead. Same people doing the tasks; a different
              answer to the question of who owns the gaps between them.</p>
          </details>
          <details>
            <summary>Who owns strategy — us or you?</summary>
            <p>You do. Positioning, pricing, which market you are going after and what the company stands for
              are not ours to decide, and a supplier who offers to decide them is overreaching. The pod owns
              the plan for executing against your strategy, brings you the data to revise it, and argues with
              you when the numbers disagree with it.</p>
          </details>
          <details>
            <summary>How do you keep the brand consistent?</summary>
            <p>A written brand and voice guide produced during onboarding, and a review step before anything
              publishes. Where you already have a guide we work to it; where you do not, we write one with
              you and you keep it. Consistency is a documented process, not a promise about taste.</p>
          </details>
          <details>
            <summary>Can we see case studies?</summary>
            <p>Not yet, and we would rather say that than show you somebody else's logo. Named write-ups
              publish when clients sign off on them. In the meantime the things you can actually inspect are
              the weekly pipeline report, the daily logs and a free trial — the same three things you
              would use to judge the pod after six months.</p>
          </details>
          <details>
            <summary>We already have a marketing hire. Does this replace them?</summary>
            <p>Usually it is the opposite. A single in-house marketer spends most of the week executing and
              almost none of it thinking; the pod takes the execution volume so that person can do the part
              that needs to be internal. If you tell us on the call who you already have, we will scope the
              seats around them rather than over them.</p>
          </details>
          <details>
            <summary>How quickly will we know it is working?</summary>
            <p>Leading indicators inside two weeks — meetings booked, sequences live, content shipping
              on schedule — because those are activity you can verify. Pipeline takes as long as your
              sales cycle takes, and anyone promising otherwise has not asked how you sell. The weekly report
              is built so a bad month is obvious early rather than explained late.</p>
          </details>
          <details>
            <summary>Can we start with one function?</summary>
            <p>Yes, and it is often the better move. One seat on the function that is actually stuck tells
              you more than a full pod does, and it costs less to find out. Every engagement starts with a
              free trial and you approve each seat before it starts.</p>
          </details>
        </div>
      </div>
    </section>
  
  
    
  
    
  <BlogRail
      surface="paper"
      eyebrow="From the blog"
      title={<>Reading for whoever <span>owns the output.</span></>}
      lede="Playbooks on scoping the pod, ramping it, and keeping the pipeline honest — written by the people who source and manage these marketers."
    />

  <ServiceJsonLd path='/services/marketing-and-content' />

  <ContactRail />
    </main>
  );
}
