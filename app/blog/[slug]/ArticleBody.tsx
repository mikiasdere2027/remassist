import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';

/**
 * The body of "The 2026 Guide to Hiring Offshore Talent Without Losing Quality
 * Control", ported from Blog Post.dc.html. Rendered by app/blog/[slug] when the
 * matching slug is requested.
 *
 * Phase 03 replaces this with content from Postgres; until then the one written
 * article lives here as markup, and lib/blog/posts.ts is what decides whether a
 * slug resolves at all.
 */
export default function ArticleBody() {

  return (
    <main>
  
  
    
  <div className={styles['bp-progress']} id='bpProgress' aria-hidden='true'></div>
  
  
    
  
    
  <section className={styles['bp-hero-band']}>
      <div className={styles['bp-wrap']}>
        <nav className={styles['bp-breadcrumb']} aria-label='Breadcrumb'>
          <Link href='/'>Home</Link><span>/</span>
          <Link href='/blog'>Resources</Link><span>/</span>
          <b>Hiring offshore talent</b>
        </nav>
  
        <article className={styles['bp-hero-card']}>
          <div className={styles['bp-hero-inner']}>
            <div className={styles['bp-kicker']}>
              <span className={styles['bp-type']}>Guide</span>
              <Link href='/blog' className={styles['bp-tag']}>Hiring Strategy</Link>
              <Link href='/blog' className={styles['bp-tag']}>Retention</Link>
            </div>
  
            <h1 className={styles['bp-h1']}>The 2026 Guide to Hiring Offshore Talent Without Losing Quality Control</h1>
  
            <p className={styles['bp-deck']}>
              What separates teams that scale offshore from teams that churn through hires: scoping the role
              properly, structuring the first 90 days, and the four KPIs that predict whether someone is
              still with you a year from now.
            </p>
  
            <div className={styles['bp-byline']}>
              <Image src='/images/teams/Johnathan.jpg' alt='' className={styles['bp-avatar']} width={96} height={96} sizes="36px" />
              <div>
                <div className={styles['bp-who']}>Johnathan M.</div>
                <div className={styles['bp-role']}>Head of Client Delivery, Rem Assist</div>
              </div>
              <span className={styles['bp-dot']}></span>
              <span className={styles['bp-when']}>August 6, 2026</span>
              <span className={styles['bp-dot']}></span>
              <span className={styles['bp-when']}>11 min read</span>
  
              <div className={styles['bp-share']}>
                <a className={styles['bp-share-btn']} id='bpShareLinkedIn' href='#' aria-label='Share on LinkedIn'><svg viewBox='0 0 24 24'><path d='M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.75V21h-4v-5.6c0-1.34-.03-3.06-1.9-3.06-1.9 0-2.2 1.45-2.2 2.96V21H9z' /></svg></a>
                <a className={styles['bp-share-btn']} id='bpShareX' href='#' aria-label='Share on X'><svg viewBox='0 0 24 24'><path d='M18.9 2H22l-7 8 8.2 12h-6.4l-5-7.3L5.9 22H2.8l7.5-8.6L2.4 2h6.6l4.5 6.7zm-1.1 18h1.7L7.3 3.8H5.4z' /></svg></a>
                <button className={styles['bp-share-btn']} id='bpCopyLink' type='button' aria-label='Copy link'><svg viewBox='0 0 24 24'><path d='M10.6 13.4a1 1 0 0 0 1.4 0l3.5-3.5a2.5 2.5 0 1 0-3.5-3.5l-1 1a1 1 0 0 0 1.4 1.4l1-1a.5.5 0 1 1 .7.7L10.6 12a1 1 0 0 0 0 1.4zm2.8-2.8a1 1 0 0 0-1.4 0l-3.5 3.5a2.5 2.5 0 1 0 3.5 3.5l1-1a1 1 0 1 0-1.4-1.4l-1 1a.5.5 0 1 1-.7-.7L13.4 12a1 1 0 0 0 0-1.4z' /></svg></button>
              </div>
            </div>
          </div>
  <div className={styles['bp-figure']}>
            <Image className={styles['bp-figure-pic']} src='/images/blog/hiring-offshore.jpg'
              alt='Two colleagues reviewing work together at a desk' fill priority
              sizes="(max-width: 900px) 100vw, 1120px" style={{ objectPosition: '50% 18%' }} />
          </div>
        </article>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['bp-post-body']}>
      <div className={styles['bp-wrap']}>
        <div className={styles['bp-layout']}>
  
          <aside className={styles['bp-toc']} id='bpToc'>
            <button className={styles['bp-toc-toggle']} id='bpTocToggle' type='button' aria-expanded='false'>In this article</button>
            <div className={styles['bp-toc-panel']}>
              <h4>In this article</h4>
              <ol id='bpTocList'>
                <li><a href='#scope'>Scope the role before you shortlist</a></li>
                <li><a href='#cost'>What the real cost comparison looks like</a></li>
                <li><a href='#vetting'>Vetting: what actually predicts performance</a></li>
                <li><a href='#onboarding'>The first 90 days</a></li>
                <li><a href='#kpis'>Four KPIs that predict retention</a></li>
                <li><a href='#security'>Security and compliance basics</a></li>
                <li><a href='#faq'>Frequently asked questions</a></li>
              </ol>
              <div className={styles['bp-toc-cta']}>
                <a className={styles['bp-btn'] + ' ' + styles['bp-btn--primary']} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>Book a Strategy Call</a>
              </div>
            </div>
          </aside>
  
          <article className={styles['bp-article']}>
            <div className={styles['bp-prose']}>
  
              <div className={styles['bp-glance']}>
                <h4>At a glance</h4>
                <ul>
                  <li><svg viewBox='0 0 20 20'><circle cx='10' cy='10' r='10' fill='#0085fe' /><path d='M6 10.2l2.6 2.6L14 7.4' stroke='#fff' strokeWidth='2' fill='none' strokeLinecap='round' /></svg>How to turn “I need help” into a scoped, hireable role in one page.</li>
                  <li><svg viewBox='0 0 20 20'><circle cx='10' cy='10' r='10' fill='#0085fe' /><path d='M6 10.2l2.6 2.6L14 7.4' stroke='#fff' strokeWidth='2' fill='none' strokeLinecap='round' /></svg>The full cost of a U.S. hire vs. a dedicated remote professional — with the assumptions written out.</li>
                  <li><svg viewBox='0 0 20 20'><circle cx='10' cy='10' r='10' fill='#0085fe' /><path d='M6 10.2l2.6 2.6L14 7.4' stroke='#fff' strokeWidth='2' fill='none' strokeLinecap='round' /></svg>A 90-day onboarding structure you can copy, week by week.</li>
                  <li><svg viewBox='0 0 20 20'><circle cx='10' cy='10' r='10' fill='#0085fe' /><path d='M6 10.2l2.6 2.6L14 7.4' stroke='#fff' strokeWidth='2' fill='none' strokeLinecap='round' /></svg>Who this is for: founders, COOs and ops leads making their first three offshore hires.</li>
                </ul>
              </div>
  
              <p>
                Most teams evaluate offshore hiring the same way they evaluate a software purchase — by price.
                They compare hourly rates, pick the lowest credible number, and treat the result as a cost line
                rather than a role. Six months later the seat has turned over twice and the “savings” have been
                spent on re-hiring.
              </p>
  
              <p>
                The harder question is not <strong>what does this cost</strong> but <strong>what has to be true
                for this person to still be productive in month twelve</strong>. That depends on decisions you
                make before anyone is interviewed: how tightly the role is scoped, who owns the outcome
                internally, and what the first ninety days look like.
              </p>
  <h2 id='scope'>Scope the role before you shortlist</h2>
  
              <p>
                The most common failure in offshore hiring is not a bad candidate. It is a role that was never
                defined well enough for anyone to succeed in it. “Someone to help with admin” is not a role —
                it is a symptom of an overloaded team, and it produces a hire who spends six months guessing.
              </p>
  
              <p>
                Before you look at a single r&amp;eacute;sum&amp;eacute;, write the role down as outcomes, not tasks. A useful test:
                could a stranger read your one-page scope and know what a good week looks like? If not, the
                scope is not finished.
              </p>
  
              <div className={styles['bp-ask']}>
                <h4>
                  <svg viewBox='0 0 24 24' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='9' /><path d='M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.6.2-1 .8-1 1.4v.4' /><line x1='12' y1='17' x2='12' y2='17.01' /></svg>
                  Questions to answer before you shortlist
                </h4>
                <ol>
                  <li>What three outcomes is this person accountable for in the first quarter?</li>
                  <li>Which of your current team members loses work from their plate on day one?</li>
                  <li>Who reviews this person’s output, and how often?</li>
                  <li>What does a good week look like, measured in something other than hours?</li>
                  <li>What tools and access do they need, and who provisions them?</li>
                  <li>What decisions can they make without asking?</li>
                </ol>
              </div>
  
              <p>
                The last question is the one most teams skip, and it is the one that determines whether you have
                hired a colleague or created a queue. If every decision routes back to you, the hire adds
                coordination overhead instead of removing it.
              </p>
  
              <blockquote>
                A role that can only be done by asking you a question every hour is not a role. It is your job,
                with extra steps.
                <cite>— From our internal onboarding playbook</cite>
              </blockquote>
  
              <h2 id='cost'>What the real cost comparison looks like</h2>
  
              <p>
                Salary is the visible part of a hire and roughly 62% of the actual cost. The rest — payroll
                taxes, benefits, software seats, workspace, equipment, recruiting fees and the management time
                to keep all of it running — is what makes the comparison lopsided once you total it honestly.
              </p>
  
              <div className={styles['bp-stats']}>
                <div><b>62%</b><span>Share of the true cost of a U.S. hire that base salary represents</span></div>
                <div><b>~80%</b><span>Typical reduction in total cost with a dedicated remote professional</span></div>
                <div><b>21 days</b><span>Median time from a scoped role to the first working day</span></div>
              </div>
  
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG source. next/image needs the dangerouslyAllowSVG flag to touch one, and has nothing to optimise in a vector: no resize, no format conversion. */}
                <div className={styles['bp-figure-art']}><img className={styles['bp-figure-pic']} src='/images/blog/total-cost-breakdown.svg' alt='Stacked bar showing the six components of total cost of employment: base pay, payroll taxes, benefits, tools and software, management time, and onboarding and ramp.' loading='lazy' /></div>
                <figcaption>Total cost of employment, broken into the six components most budgets leave out.</figcaption>
              </figure>
  <h2 id='vetting'>Vetting: what actually predicts performance</h2>
  
              <p>
                Technical screening tells you whether someone can do the work. It tells you very little about
                whether they will do it well without supervision, across a time zone, with imperfect
                instructions. Those are different skills, and they need different questions.
              </p>
  
              <p>
                We weight three signals heavily: written clarity, how a candidate handles an ambiguous brief,
                and whether they ask questions before starting. The third is the strongest single predictor we
                track — candidates who clarify scope before working almost never produce the wrong thing twice.
              </p>
  
              <div className={styles['bp-table-wrap']}>
                <table>
                  <thead>
                    <tr>
                      <th>Evaluation factor</th>
                      <th>Weak evidence</th>
                      <th>Strong evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Autonomy</td>
                      <td>“I’m a self-starter”</td>
                      <td className={styles['good']}>Describes a decision they made without approval, and what happened</td>
                    </tr>
                    <tr>
                      <td>Written clarity</td>
                      <td>Polished r&amp;eacute;sum&amp;eacute;, thin answers</td>
                      <td className={styles['good']}>Structured written response to a real scenario, unedited</td>
                    </tr>
                    <tr>
                      <td>Handling ambiguity</td>
                      <td>Starts work immediately</td>
                      <td className={styles['good']}>Asks two or three sharpening questions first</td>
                    </tr>
                    <tr>
                      <td>Continuity</td>
                      <td>Long list of short engagements</td>
                      <td className={styles['good']}>Multi-year tenure with growing responsibility</td>
                    </tr>
                  </tbody>
                </table>
              </div>
  
              <h2 id='onboarding'>The first 90 days</h2>
  
              <p>
                Retention is decided in the first three months, not at the twelve-month review. The pattern that
                works is narrow at first and widens deliberately: one workflow in week one, a second in week
                three, ownership of a full process by week six, and a written review at day ninety against the
                outcomes you scoped at the start.
              </p>
  
              <ul>
                <li><strong>Week 1</strong> — access, context and one repeatable task done end to end.</li>
                <li><strong>Weeks 2–3</strong> — shadow the person whose work is transferring, then reverse the roles.</li>
                <li><strong>Weeks 4–6</strong> — full ownership of one process, with a daily written handoff.</li>
                <li><strong>Weeks 7–12</strong> — second process added; check-ins drop from daily to twice weekly.</li>
                <li><strong>Day 90</strong> — written review against the three scoped outcomes.</li>
              </ul>
  
              <div className={styles['bp-inline-cta']}>
                <h3>Want this mapped to your team?</h3>
                <p>
                  Tell us the bottleneck and we’ll come back with the roles, the cost and a 30-day onboarding
                  plan — no charge, no commitment.
                </p>
                <div className={styles['bp-cta-actions']}>
                  <a className={styles['bp-btn'] + ' ' + styles['bp-btn--primary']} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>Book a Free Strategy Call</a>
                  <Link className={styles['bp-btn'] + ' ' + styles['bp-btn--light']} href='/blog'>Browse more guides</Link>
                </div>
              </div>
  <h2 id='kpis'>Four KPIs that predict retention</h2>
  
              <p>
                None of these are productivity metrics. They measure whether the working relationship is healthy
                enough for productivity to be sustainable, which is the thing that actually breaks first.
              </p>
  
              <ol>
                <li><strong>Rework rate</strong> — how often output has to be redone. Rising rework almost always means the scope drifted, not that the person got worse.</li>
                <li><strong>Question latency</strong> — how long a blocked person waits for an answer. Anything over a day compounds badly across time zones.</li>
                <li><strong>Decision ratio</strong> — the share of decisions made without escalation. This should climb every month.</li>
                <li><strong>Check-in load</strong> — how much manager time the role consumes. If it isn’t falling by month three, the onboarding didn’t transfer context.</li>
              </ol>
  
              <h2 id='security'>Security and compliance basics</h2>
  
              <p>
                Remote does not mean informal. Before day one, settle device policy, access control, credential
                handling and what happens to data when someone leaves. If you operate in a regulated industry,
                this is also where certifications matter — Rem Assist operates under
                <Link href='/#certifications'>ISO 9001 and ISO 27001</Link>, which set out how information is
                handled and audited rather than merely promised.
              </p>
  
              <p>
                A practical baseline: company-managed devices or a documented BYOD standard, SSO with enforced
                MFA, least-privilege access reviewed quarterly, and a written offboarding checklist that revokes
                access the same day.
              </p>
  
              
              <section className={styles['bp-faq']} id='faq'>
                <h2>Frequently asked questions</h2>
                <div className={styles['bp-faq-list']}>
                  <details className={styles['bp-faq-item']} open={true}>
                    <summary>How long does it take to place a dedicated remote professional?</summary>
                    <div className={styles['bp-faq-a']}>Median is 21 days from a finished role scope to the first working day. Most of the variance is on the scoping side, not sourcing — teams that arrive with clear outcomes move considerably faster.</div>
                  </details>
                  <details className={styles['bp-faq-item']}>
                    <summary>What happens if the first hire isn’t the right fit?</summary>
                    <div className={styles['bp-faq-a']}>We replace the placement at no additional cost. In practice, a poor fit usually traces back to a scope that changed after hiring, so the replacement process starts with re-scoping rather than re-sourcing.</div>
                  </details>
                  <details className={styles['bp-faq-item']}>
                    <summary>Do remote professionals work in U.S. business hours?</summary>
                    <div className={styles['bp-faq-a']}>Yes. Staff are placed on your time zone by default, with overlap agreed before the offer. Fully async arrangements are possible where the role genuinely allows it.</div>
                  </details>
                  <details className={styles['bp-faq-item']}>
                    <summary>Who manages the person day to day?</summary>
                    <div className={styles['bp-faq-a']}>You do — they work as part of your team. Rem Assist handles sourcing, contracting, payroll, equipment and HR escalation, and a delivery manager checks in on retention and performance trends monthly.</div>
                  </details>
                </div>
              </section>
  
              <div className={styles['bp-sources']}>
                <h4>Sources &amp; further reading</h4>
                <ol>
                  <li>U.S. Bureau of Labor Statistics. <a href='#'>Employer Costs for Employee Compensation</a>.</li>
                  <li>Rem Assist. <Link href='/blog'>Cost &amp; ROI: What 80% savings looks like on a real P&amp;L</Link>.</li>
                  <li>Rem Assist. <Link href='/blog'>The First 30 Days: An onboarding plan you can copy</Link>.</li>
                  <li>International Organization for Standardization. <a href='#'>ISO/IEC 27001 Information Security Management</a>.</li>
                </ol>
              </div>
  
              
              <div className={styles['bp-tags']}>
                <span className={styles['bp-label']}>Filed under</span>
                <Link href='/blog'>Hiring Strategy</Link>
                <Link href='/blog'>Retention</Link>
                <Link href='/blog'>Onboarding</Link>
                <Link href='/blog'>Cost &amp; ROI</Link>
              </div>
  
              
              <div className={styles['bp-author']}>
                <Image src='/images/teams/Johnathan.jpg' alt='' width={96} height={96} sizes="36px" />
                <div className={styles['bp-a-body']}>
                  <h4>Johnathan M.</h4>
                  <div className={styles['bp-a-role']}>Head of Client Delivery, Rem Assist</div>
                  <p>
                    Johnathan has overseen more than 300 placements across healthcare, real estate and
                    e-commerce teams, and writes about what actually holds up after the first quarter.
                  </p>
                  <div className={styles['bp-a-links']}>
                    <Link className={styles['bp-btn'] + ' ' + styles['bp-btn--secondary']} href='/blog'>More from Johnathan</Link>
                  </div>
                </div>
              </div>
  
              
              <nav className={styles['bp-post-nav']}>
                <Link href='/blog'>
                  <div className={styles['dir']}>← Previous</div>
                  <div className={styles['t']}>The Role Scorecard: Define a Remote Hire in One Page</div>
                </Link>
                <Link href='/blog' className={styles['next']}>
                  <div className={styles['dir']}>Next →</div>
                  <div className={styles['t']}>Nine Interview Questions That Predict Remote Performance</div>
                </Link>
              </nav>
  
            </div>
          </article>
  
        </div>
      </div>
    </section>
  
  
    
  
    
  <section className={styles['bp-related']}>
      <div className={styles['bp-wrap']}>
        <div className={styles['bp-related-head']}>
          <h2>Other resources</h2>
          <Link href='/blog'>See all →</Link>
        </div>
        <div className={styles['bp-rgrid']}>
  
          <Link href='/blog' className={styles['bp-rcard']}>
            <div className={styles['bp-rthumb'] + ' ' + styles['g1']}><span className={styles['bp-rtype']}>Guide</span></div>
            <div className={styles['bp-rbody']}>
              <div className={styles['bp-rtopic']}>Hiring Strategy</div>
              <h3>The Role Scorecard: Define a Remote Hire in One Page</h3>
              <p>A fill-in template that turns a vague “I need help” into a hireable role with clear outcomes.</p>
              <div className={styles['bp-meta']}>
                <Image src='/images/teams/Kalkidan.jpg' alt='' width={96} height={96} sizes="36px" />
                <div><div className={styles['who']}>Kalkidan T.</div><div className={styles['when']}>Aug 4, 2026 · 7 min</div></div>
                <span className={styles['read']}>Read<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'><path d='M5 12h14' /><path d='m13 6 6 6-6 6' /></svg></span>
              </div>
            </div>
          </Link>
  
          <Link href='/blog' className={styles['bp-rcard']}>
            <div className={styles['bp-rthumb'] + ' ' + styles['g3']}><span className={styles['bp-rtype']}>Blog</span></div>
            <div className={styles['bp-rbody']}>
              <div className={styles['bp-rtopic']}>Cost &amp; ROI</div>
              <h3>The True Cost of a U.S. Hire vs. a Dedicated Remote Professional</h3>
              <p>Salary is only 62% of it. We break down benefits, software, workspace and management overhead.</p>
              <div className={styles['bp-meta']}>
                <Image src='/images/teams/Minassie.jpg' alt='' width={96} height={96} sizes="36px" />
                <div><div className={styles['who']}>Minassie B.</div><div className={styles['when']}>Jul 22, 2026 · 6 min</div></div>
                <span className={styles['read']}>Read<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'><path d='M5 12h14' /><path d='m13 6 6 6-6 6' /></svg></span>
              </div>
            </div>
          </Link>
  
          <Link href='/blog' className={styles['bp-rcard']}>
            <div className={styles['bp-rthumb'] + ' ' + styles['g2']}><span className={styles['bp-rtype']}>Case Study</span></div>
            <div className={styles['bp-rbody']}>
              <div className={styles['bp-rtopic']}>Client Stories</div>
              <h3>How a 12-Agent Brokerage Doubled Listings With 3 Remote ISAs</h3>
              <p>Inside the 60-day rollout: lead routing, call scripts, and the dashboard that kept everyone honest.</p>
              <div className={styles['bp-meta']}>
                <Image src='/images/teams/Yonas.jpg' alt='' width={96} height={96} sizes="36px" />
                <div><div className={styles['who']}>Yonas A.</div><div className={styles['when']}>Jul 29, 2026 · 9 min</div></div>
                <span className={styles['read']}>Read<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'><path d='M5 12h14' /><path d='m13 6 6 6-6 6' /></svg></span>
              </div>
            </div>
          </Link>
  
        </div>
      </div>
    </section>
  
  
  
    </main>
  );
}
