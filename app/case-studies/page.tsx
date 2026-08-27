import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Case Studies',
  description:
    'How specific teams handed work over, what changed, and what it cost. Each study goes up only with the client’s sign-off.',
  alternates: { canonical: '/case-studies' },
  // Deliberately empty until the first study is signed off — see lib/site.ts.
  robots: { index: false, follow: true },
  openGraph: { url: '/case-studies' },
};

export default function Page() {
  return (
    <main>
  
  
    
  <section style={{ background: "linear-gradient(180deg,#f7faff 0%,var(--bg-marketing-paper) 70%)" }}>
      <div className={styles['rs-wrap']} style={{ paddingTop: "76px", paddingBottom: "80px" }}>
        <p className={styles['rs-eyebrow']}>Case studies</p>
        <h1 className={styles['rs-h1']}>Engagements, <span>written up.</span></h1>
        <p className={styles['rs-lede']}>How specific teams handed work over, what changed, and what it cost. Each study goes up only with the client’s sign-off.</p>
  
        
        <div className={styles['rs-empty']}>
          <span className={styles['rs-empty-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 3h9l4 4v14H6z' /><path d='M15 3v4h4' /><path d='M9 12h7M9 16h5' /></svg></span>
          <div>
            <h2>The first write-ups are in progress</h2>
            <p>We publish a study only once the client has approved the numbers in it, so this page is deliberately empty rather than padded out. On a consult we will walk you through comparable engagements directly — the process, the staffing, and the actual rate.</p>
            <div className={styles['rs-cta-row']}>
              <a className={styles['rs-btn']} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>Book a free consult
                <svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg></a>
              <a className={`${styles['rs-btn']} ${styles['rs-btn--ghost']}`} href='/services/extra-services'>Browse all 35 services</a>
            </div>
          </div>
        </div>
  
        <div className={styles['rs-meanwhile']}>
          <a className={styles['rs-alt']} href='/#faq'><b>FAQ</b><span>Pricing, onboarding, replacement, and how data is handled.</span></a>
          <a className={styles['rs-alt']} href='/qualify'><b>Qualify in two minutes</b><span>Five questions and we name the service line, tier, and estimate.</span></a>
          <a className={styles['rs-alt']} href='/pricing'><b>Pricing</b><span>Pro from $8/hr, Expert from $11/hr, free trial either way.</span></a>
        </div>
      </div>
    </section>
  
  
  
    </main>
  );
}
