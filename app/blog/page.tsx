import type { Metadata } from 'next';
import Image from 'next/image';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Blog & Guides',
  description:
    'Hiring guides, cost breakdowns and operating templates from the team that sources, onboards and manages dedicated remote staff.',
  alternates: { canonical: '/blog' },
  openGraph: { url: '/blog' },
};

export default function Page() {
  return (
    <main>
  
  
    
  <section className={styles['bk-hero-band']}>
      <div className={styles['bk-wrap']}>
        <div className={styles['bk-hero-card']}>
          <div>
            <span className={styles['bk-eyebrow']}><i></i>REM Resources</span>
            <h1 className={styles['bk-h1']}>Playbooks for building a remote team that <span className={styles['hl']}>actually delivers.</span></h1>
            <p className={styles['bk-lede']}>Hiring guides, cost breakdowns and operating templates from the team that sources, onboards and manages dedicated remote staff every day.</p>
            <form className={styles['bk-search']} role='search'>
              <svg viewBox='0 0 24 24' fill='none' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><circle cx='11' cy='11' r='7' /><line x1='16' y1='7' x2='20.5' y2='20' /></svg>
              <input type='search' placeholder='Search guides and articles…' aria-label='Search resources' />
            </form>
          </div>
  
          <a href='/blog/hiring-offshore-without-losing-quality-control' className={styles['bk-featured']}>
            <div className={styles['bk-thumb']}>
              <span className={styles['bk-badge']}>Featured</span>
              <img className={styles['bk-thumb-pic']} src='/images/blog/hiring-offshore.svg' alt='' loading='lazy' />
            </div>
            <div className={styles['bk-featured-body']}>
              <div className={styles['bk-topic']}>Hiring Strategy</div>
              <h3>The 2026 Guide to Hiring Offshore Without Losing Quality Control</h3>
              <p>What separates teams that scale from teams that stay stuck — scope the role, run the first 90 days, and track the four KPIs that predict retention.</p>
              <div className={styles['bk-meta']}>
                <Image src='/images/teams/Johnathan.jpg' alt='' width={96} height={96} sizes="36px" />
                <div><div className={styles['who']}>Johnathan M.</div><div className={styles['when']}>Aug 6, 2026 · 11 min read</div></div>
                <span className={styles['read']}>Read more<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'><path d='M5 12h14' /><path d='m13 6 6 6-6 6' /></svg></span>
              </div>
            </div>
          </a>
        </div>
      </div>
    </section>
  
  
    
  <section className={styles['bk-band']}>
      <div className={styles['bk-wrap']}>
        <div className={styles['bk-head']}>
          <h2>Latest resources</h2>
          <p>Three practical guides to start with</p>
        </div>
  
        <div className={styles['bk-grid']}>
  
          <div className={styles['bk-card']}>
            <div className={`${styles['bk-thumb-sm']} ${styles['g1']}`}><img className={styles['bk-thumb-pic']} src='/images/blog/role-scorecard.svg' alt='' loading='lazy' /><span className={styles['bk-type']}>Guide</span></div>
            <div className={styles['bk-card-body']}>
              <div className={styles['bk-topic']}>Hiring Strategy</div>
              <h3>The Role Scorecard: Define a Remote Hire in One Page</h3>
              <p>A fill-in template that turns “I need help” into a roleable hire with clear outcomes and KPIs.</p>
              <div className={styles['bk-meta']}>
                <Image src='/images/teams/Kalkidan.jpg' alt='' width={96} height={96} sizes="36px" />
                <div><div className={styles['who']}>Kalkidan T.</div><div className={styles['when']}>Aug 4, 2026 · 7 min</div></div>
                <span className={styles['read']}>Read<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'><path d='M5 12h14' /><path d='m13 6 6 6-6 6' /></svg></span>
              </div>
            </div>
          </div>
  
          <div className={styles['bk-card']}>
            <div className={`${styles['bk-thumb-sm']} ${styles['g2']}`}><img className={styles['bk-thumb-pic']} src='/images/blog/cost-roi.svg' alt='' loading='lazy' /><span className={styles['bk-type']}>Blog</span></div>
            <div className={styles['bk-card-body']}>
              <div className={styles['bk-topic']}>Cost &amp; ROI</div>
              <h3>When Offshore Hiring Is the Wrong Call</h3>
              <p>Four situations where staying local is cheaper — and what to do instead in each one.</p>
              <div className={styles['bk-meta']}>
                <Image src='/images/teams/Minassie.jpg' alt='' width={96} height={96} sizes="36px" />
                <div><div className={styles['who']}>Minassie B.</div><div className={styles['when']}>Jul 30, 2026 · 6 min</div></div>
                <span className={styles['read']}>Read<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'><path d='M5 12h14' /><path d='m13 6 6 6-6 6' /></svg></span>
              </div>
            </div>
          </div>
  
          <div className={styles['bk-card']}>
            <div className={`${styles['bk-thumb-sm']} ${styles['g3']}`}><img className={styles['bk-thumb-pic']} src='/images/blog/onboarding-30-days.svg' alt='' loading='lazy' /><span className={styles['bk-type']}>Guide</span></div>
            <div className={styles['bk-card-body']}>
              <div className={styles['bk-topic']}>Team Management</div>
              <h3>The First 30 Days: An Onboarding Plan You Can Copy</h3>
              <p>Week-by-week milestones, access checklists and the check-in cadence that builds trust fast.</p>
              <div className={styles['bk-meta']}>
                <Image src='/images/teams/Yonas.jpg' alt='' width={96} height={96} sizes="36px" />
                <div><div className={styles['who']}>Yonas B.</div><div className={styles['when']}>Jul 25, 2026 · 9 min</div></div>
                <span className={styles['read']}>Read<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'><path d='M5 12h14' /><path d='m13 6 6 6-6 6' /></svg></span>
              </div>
            </div>
          </div>
  
        </div>
  
        <div className={styles['bk-newsletter']}>
          <div>
            <span className={styles['bk-eyebrow']}><i></i>The REM Brief</span>
            <h2>One useful email a month. Nothing else.</h2>
            <p>Salary benchmarks, hiring templates and the occasional teardown of what worked for a client last quarter.</p>
          </div>
          <form className={styles['bk-news-form']}>
            <input type='email' placeholder='you@company.com' aria-label='Work email' />
            <button type='submit'>Subscribe</button>
          </form>
        </div>
  
      </div>
    </section>
  
  
  
    </main>
  );
}
