import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Reviews',
  description:
    'Reviews left on our Trustpilot profile, shown verbatim and linked to the original so you can verify them yourself.',
  alternates: { canonical: '/reviews' },
  openGraph: { url: '/reviews' },
};

export default function Page() {
  return (
    <main>
  
    
  <section style={{ background: "linear-gradient(180deg,#f7faff 0%,var(--bg-marketing-paper) 70%)" }}>
      <div className={styles['rs-wrap']} style={{ paddingTop: "76px", paddingBottom: "80px" }}>
        <p className={styles['rs-eyebrow']}>Reviews</p>
        <h1 className={styles['rs-h1']}>What clients <span>say about us on Trustpilot.</span></h1>
        <p className={styles['rs-lede']}>These are the reviews left on our Trustpilot profile — shown here verbatim and
          linked to the original so you can verify them yourself. Three reviews were left; one was removed
          by the reviewer, so two are currently live.</p>
  
        
        <div className={styles['tp-band']}>
          <div className={styles['tp-summary']}>
            <div className={styles['tp-summary-left']}>
              <img className={styles['tp-logo']} src='/images/trustpilot-logo.svg' alt='Trustpilot' width='120' height='32' />
              <div className={styles['tp-score']}>
                <b>5.0</b>
                <span className={styles['tp-stars']} aria-label='Rated 5 out of 5 stars'>
                  <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 1.5 15 8l7 .8-5.2 4.8 1.4 6.9L12 17l-6.2 3.5 1.4-6.9L2 8.8 9 8z' /></svg>
                  <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 1.5 15 8l7 .8-5.2 4.8 1.4 6.9L12 17l-6.2 3.5 1.4-6.9L2 8.8 9 8z' /></svg>
                  <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 1.5 15 8l7 .8-5.2 4.8 1.4 6.9L12 17l-6.2 3.5 1.4-6.9L2 8.8 9 8z' /></svg>
                  <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 1.5 15 8l7 .8-5.2 4.8 1.4 6.9L12 17l-6.2 3.5 1.4-6.9L2 8.8 9 8z' /></svg>
                  <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 1.5 15 8l7 .8-5.2 4.8 1.4 6.9L12 17l-6.2 3.5 1.4-6.9L2 8.8 9 8z' /></svg>
                </span>
              </div>
            </div>
            <div className={styles['tp-summary-right']}>
              <p className={styles['tp-note']}>Rated <b>Excellent</b> · based on <b>2 reviews</b><br />
                on <a href='https://www.trustpilot.com/review/remassistance.com' target='_blank' rel='noopener' style={{ color: "var(--brand-blue)", textDecoration: "underline" }}>our live Trustpilot profile</a></p>
              <a className={styles['rs-btn']} href='https://www.trustpilot.com/review/remassistance.com' target='_blank' rel='noopener'>Open Trustpilot <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg></a>
            </div>
          </div>
  
          <div className={styles['tp-grid']}>
          <article className={styles['tp-card']}>
              <div className={styles['tp-card-top']}>
                <div>
                  <h3 className={styles['tp-name']}>TANO Group</h3>
                  <p className={styles['tp-meta']}>US · 1 review</p>
                </div>
                <span className={styles['tp-stars']} aria-label='Rated 5 out of 5 stars'>
                  <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 1.5 15 8l7 .8-5.2 4.8 1.4 6.9L12 17l-6.2 3.5 1.4-6.9L2 8.8 9 8z' /></svg>
                  <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 1.5 15 8l7 .8-5.2 4.8 1.4 6.9L12 17l-6.2 3.5 1.4-6.9L2 8.8 9 8z' /></svg>
                  <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 1.5 15 8l7 .8-5.2 4.8 1.4 6.9L12 17l-6.2 3.5 1.4-6.9L2 8.8 9 8z' /></svg>
                  <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 1.5 15 8l7 .8-5.2 4.8 1.4 6.9L12 17l-6.2 3.5 1.4-6.9L2 8.8 9 8z' /></svg>
                  <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 1.5 15 8l7 .8-5.2 4.8 1.4 6.9L12 17l-6.2 3.5 1.4-6.9L2 8.8 9 8z' /></svg>
                </span>
              </div>
              <p className={styles['tp-date']}>Jun 18, 2025</p>
              <h4 className={styles['tp-title']}>Great Service</h4>
              <p className={styles['tp-quote']}>“They helped me with a virtual sales team and processed everything together quickly.
                I would recommend to any business owner that’s looking to grow their company quickly &amp; effectively.”</p>
              <div className={styles['tp-actions']}>
                <a className={styles['tp-act']} href='https://www.trustpilot.com/review/remassistance.com' target='_blank' rel='noopener' aria-label='Mark TANO Group review as useful'><svg viewBox='0 0 24 24'><path d='M7 10.5v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Zm10-1v-4A2.4 2.4 0 0 0 14.6 3.1c-.9 0-1.6.5-1.9 1.3L8 12v8h9.5a2.8 2.8 0 0 0 2.8-2.4l1.3-7A2.8 2.8 0 0 0 18.8 7.5Z' /></svg>Useful</a>
                <a className={styles['tp-act']} href='https://www.trustpilot.com/review/remassistance.com' target='_blank' rel='noopener' aria-label='Share TANO Group review'><svg viewBox='0 0 24 24'><circle cx='18' cy='5' r='2.6' /><circle cx='6' cy='12' r='2.6' /><circle cx='18' cy='19' r='2.6' /><path d='m8.3 10.8 7.4-4.3m-7.4 6.7 7.4 4.3' /></svg>Share</a>
                <a className={styles['tp-read']} href='https://www.trustpilot.com/review/remassistance.com' target='_blank' rel='noopener'>Read on Trustpilot</a>
              </div>
            </article>
  
            <article className={styles['tp-card']}>
              <div className={styles['tp-card-top']}>
                <div>
                  <h3 className={styles['tp-name']}>ROOFING PROS</h3>
                  <p className={styles['tp-meta']}>ET · 1 review</p>
                </div>
                <span className={styles['tp-stars']} aria-label='Rated 5 out of 5 stars'>
                  <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 1.5 15 8l7 .8-5.2 4.8 1.4 6.9L12 17l-6.2 3.5 1.4-6.9L2 8.8 9 8z' /></svg>
                  <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 1.5 15 8l7 .8-5.2 4.8 1.4 6.9L12 17l-6.2 3.5 1.4-6.9L2 8.8 9 8z' /></svg>
                  <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 1.5 15 8l7 .8-5.2 4.8 1.4 6.9L12 17l-6.2 3.5 1.4-6.9L2 8.8 9 8z' /></svg>
                  <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 1.5 15 8l7 .8-5.2 4.8 1.4 6.9L12 17l-6.2 3.5 1.4-6.9L2 8.8 9 8z' /></svg>
                  <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 1.5 15 8l7 .8-5.2 4.8 1.4 6.9L12 17l-6.2 3.5 1.4-6.9L2 8.8 9 8z' /></svg>
                </span>
              </div>
              <p className={styles['tp-date']}>May 27, 2025</p>
              <h4 className={styles['tp-title']}>Nice work</h4>
              <p className={styles['tp-quote']}>“Its Very Convenient and has ease of access to create a portfolio and apply.
                really nice job.”</p>
              <div className={styles['tp-actions']}>
                <a className={styles['tp-act']} href='https://www.trustpilot.com/review/remassistance.com' target='_blank' rel='noopener' aria-label='Mark ROOFING PROS review as useful'><svg viewBox='0 0 24 24'><path d='M7 10.5v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Zm10-1v-4A2.4 2.4 0 0 0 14.6 3.1c-.9 0-1.6.5-1.9 1.3L7 12v8h9.5a2.8 2.8 0 0 0 2.8-2.4l2.3-7A2.8 2.8 0 0 0 18.8 7.5Z' /></svg>Useful</a>
                <a className={styles['tp-act']} href='https://www.trustpilot.com/review/remassistance.com' target='_blank' rel='noopener' aria-label='Share ROOFING PROS review'><svg viewBox='0 0 24 24'><circle cx='18' cy='5' r='2.6' /><circle cx='6' cy='12' r='2.6' /><circle cx='18' cy='19' r='2.6' /><path d='m8.3 10.8 7.4-4.3m-7.4 6.7 7.4 4.3' /></svg>Share</a>
                <a className={styles['tp-read']} href='https://www.trustpilot.com/review/remassistance.com' target='_blank' rel='noopener'>Read on Trustpilot</a>
              </div>
            </article>
          </div>
        </div>
  
        <h2 className={styles['rs-verify-title']}>What else you can <span>verify today</span></h2>
        <p className={styles['rs-verify-note']}>Reviews are the loudest signal, but they are not the only one. These three stand up to your own inspection before you spend a minute on a call.</p>
  
        <div className={styles['rs-verify']}>
          <div className={styles['rs-card']}>
            <span className={styles['rs-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3 4 6.5V12c0 4.4 3.2 8 8 9 4.8-1 8-4.6 8-9V6.5z' /><path d='m8.7 12.2 2.3 2.3 4.4-4.7' /></svg></span>
            <h3>Independently audited</h3>
            <p>ISO 9001 quality management and ISO 27001 information security, audited by a third party rather than asserted on a page.</p>
            <span className={styles['rs-iso']}>
              <img src='/images/ISO_9001-2015.svg' alt='ISO 9001:2015 certified' />
              <img src='/images/ISO_27001-2022.svg' alt='ISO 27001:2022 certified' />
            </span>
          </div>
          <div className={styles['rs-card']}>
            <span className={styles['rs-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='8' r='3.6' /><path d='M4 20v-1.4A4.6 4.6 0 0 1 8.6 14h6.8a4.6 4.6 0 0 1 4.6 4.6V20' /></svg></span>
            <h3>Meet the actual agents</h3>
            <p>Real profiles at both tiers before anything is signed. Interview them yourself, or approve the shortlist — nobody is assigned to your account without your sign-off.</p>
          </div>
          <div className={styles['rs-card']}>
            <span className={styles['rs-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='5' width='18' height='16' rx='2' /><path d='M8 3v4M16 3v4M3 10h18' /><path d='m9.5 15.5 1.8 1.8 3.6-3.8' /></svg></span>
            <h3>Judge the work, not the words</h3>
            <p>A 30—60 day pilot at smaller scale, so you measure our SLAs and quality on your own processes before a full rollout.</p>
          </div>
        </div>
  
        <div className={styles['rs-alts']}>
          <a className={styles['rs-alt']} href='/faq'><b>FAQ</b><span>Thirty-odd questions answered, including the ones with awkward answers.</span></a>
          <a className={styles['rs-alt']} href='/pricing'><b>Pricing</b><span>Published rates and the monthly grid, so nothing waits on a call.</span></a>
          <a className={styles['rs-alt']} href='/qualify'><b>Qualify in two minutes</b><span>Five questions, then the service line, tier and an estimate.</span></a>
        </div>
      </div>
    </section>
  
  
    </main>
  );
}
