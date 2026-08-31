import type { Metadata } from 'next';
import { pageOg } from '@/lib/site';
import styles from './page.module.css';
import { ServiceJsonLd } from '@/components/layout/JsonLd';
import InterviewRail from '@/components/services/InterviewRail';
import BlogRail from '@/components/services/BlogRail';
import ServicesHero from '@/components/services/ServicesHero';
import ServiceDirectory from '@/components/services/ServiceDirectory';
import ContactRail from '@/components/services/ContactRail';
import { interviewsFor } from '@/lib/interviews';

export const metadata: Metadata = {
  title: 'All Services',
  description:
    'Everything we staff, in one place. One trained seat often covers several of these at once — take a single role, or a whole pod.',
  alternates: { canonical: '/services' },
  openGraph: pageOg('/services'),
};

export default function Page() {
  return (
    <main>
  
  
    
  
    
  <ServicesHero />
  
  <ServiceDirectory />
  
  
    
  
    

    <InterviewRail
      surface="paper"
      eyebrow="Meet the bench"
      title={<>Whichever desk you pick, <span>these are the people.</span></>}
      lede="Clips from our screening interviews, one from five different desks — the same recordings that come with a shortlist, so you can hear how someone explains their work before a call is booked."
      seats={interviewsFor('services')}
    />

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
  
  
    
  
    
  <section className={styles['xs-navy-strip']}>
      <div className={styles['xs-wrap']}>
        <div className={styles['xs-incl']}>
          <div>
            {/* The page's own section-title classes, not a parallel set. The
                only thing the navy ground changes is colour, so `--on-navy` is
                a colour-only modifier stacked on top — the size, weight,
                tracking and rhythm cannot drift from the rest of the page
                because they are not restated here. */}
            <p className={styles['xs-eyebrow']}>Regardless of which service</p>
            <h2 className={`${styles['xs-h2']} ${styles['xs-h2--on-navy']}`}>What every seat <span>comes with.</span></h2>
            <p className={`${styles['xs-lede']} ${styles['xs-lede--on-navy']}`}>The same operating model sits behind all of it, so the thing that differs
              between these lines is the training, not the standard of delivery.</p>
            
            <div className={styles['xs-features-grid']}>
              <div className={styles['xs-feature-card']}>
                <div className={styles['xs-feature-icon']}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                </div>
                <div className={styles['xs-feature-content']}>
                  <h4>Recruiting & Vetting</h4>
                  <p>Rigorous multi-stage vetting, background verification, and comprehensive core training.</p>
                </div>
              </div>

              <div className={styles['xs-feature-card']}>
                <div className={styles['xs-feature-icon']}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <div className={styles['xs-feature-content']}>
                  <h4>Process Build & SOPs</h4>
                  <p>Workflows and operational standard operating procedures written during onboarding — yours to keep.</p>
                </div>
              </div>

              <div className={styles['xs-feature-card']}>
                <div className={styles['xs-feature-icon']}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                </div>
                <div className={styles['xs-feature-content']}>
                  <h4>QA & Supervision</h4>
                  <p>Proactive quality audits, dedicated team leads, and immediate seamless replacement if needed.</p>
                </div>
              </div>

              <div className={styles['xs-feature-card']}>
                <div className={styles['xs-feature-icon']}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div className={styles['xs-feature-content']}>
                  <h4>Daily Logs & Reporting</h4>
                  <p>Hourly activity logs, transparent monitoring, and automated daily email reports on each seat.</p>
                </div>
              </div>

              <div className={styles['xs-feature-card']}>
                <div className={styles['xs-feature-icon']}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                </div>
                <div className={styles['xs-feature-content']}>
                  <h4>ISO 9001 & ISO 27001</h4>
                  <p>ISO-certified quality standards and bank-grade data security protocols and safeguards.</p>
                </div>
              </div>

              <div className={styles['xs-feature-card']}>
                <div className={styles['xs-feature-icon']}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                </div>
                <div className={styles['xs-feature-content']}>
                  <h4>Zero Setup Fee & Flexible</h4>
                  <p>No upfront onboarding fees. Effortlessly scale, add, or adjust seats with flexible terms.</p>
                </div>
              </div>
            </div>
          </div>

          <aside className={styles['xs-rate-glass']}>
            <div className={styles['xs-rate-header']}>
              <span className={styles['xs-rate-badge']}>Published rates</span>
              <span className={styles['xs-rate-status']}>
                <span className={styles['xs-rate-dot']}></span> Transparent pricing
              </span>
            </div>
            
            <div className={styles['xs-rate-tiers']}>
              <div className={styles['xs-rate-row-glass']}>
                <div className={styles['xs-rate-info']}>
                  <span className={styles['xs-rate-name-glass']}>Pro Tier</span>
                  <span className={styles['xs-rate-desc-glass']}>Trained agents & execution</span>
                </div>
                <div className={styles['xs-rate-price-glass']}>
                  <small>from</small><b>$8</b><em>/hr</em>
                </div>
              </div>

              <div className={styles['xs-rate-row-glass']}>
                <div className={styles['xs-rate-info']}>
                  <span className={styles['xs-rate-name-glass']}>Expert Tier</span>
                  <span className={styles['xs-rate-desc-glass']}>Senior specialists & leads</span>
                </div>
                <div className={styles['xs-rate-price-glass']}>
                  <small>from</small><b>$11</b><em>/hr</em>
                </div>
              </div>
            </div>

            <div className={styles['xs-rate-footer']}>
              <p className={styles['xs-rate-note-glass']}>
                Same rate whichever service line the seat sits in. Coverage drives the cost, not the category.
              </p>
              <a className={styles['xs-rate-cta-glass']} href='/pricing'>
                <span>See full pricing grid</span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
            </div>
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
  
  
    
  
    

    <BlogRail
      surface="paper"
      eyebrow="From the blog"
      title={<>How to decide <span>which seat to staff first.</span></>}
      lede="Guides on scoping the role, ramping it, and knowing which of these desks is actually your bottleneck — written by the people who source and manage these seats."
    />

  {/* No cross-link band here. "Seats that work alongside this one" is what
      this entire page is — a reader on /services has just been shown all nine
      lines and thirty-five roles, and three more links to three of them says
      nothing new. The band stays on the twelve individual service pages, where
      it is the only route sideways.

      The Service and BreadcrumbList JSON-LD the band used to emit for this
      route does not go with it: the page still describes a service and still
      needs its breadcrumb, so that moves here on its own. */}
  <ServiceJsonLd path='/services' />

  <ContactRail />

    </main>
  );
}
