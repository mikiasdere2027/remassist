import Image from 'next/image';
import ContactRailForm from './ContactRailForm';
import styles from './ContactRail.module.css';

/**
 * The "Let's Talk Outcomes" booking band.
 *
 * Shared across /services and individual service pages (including /services/virtual-back-office-team).
 * Features a split container:
 *   - Left side: Dark navy showcase with customer support representative, key value propositions, and trust badge
 *   - Right side: Clean white direct brief intake form
 */
export default function ContactRail() {
  return (
    <section id="contact" className={styles.rail}>
      <div className={styles.wrap}>
        <div className={styles.head}>
          <h2 className={styles.title}>
            Let&rsquo;s Talk <span>Outcomes</span>
          </h2>
          <p className={styles.lede}>
            Tell us what needs covering — we come back with the seats, the rate, and a trial plan.
          </p>
        </div>

        <div className={styles.card}>
          {/* Left Dark Column */}
          <div className={styles.leftCol}>
            <div className={styles.agentPhotoWrap}>
              <Image
                src="/images/Agents/Virtual-assitant.png"
                alt="Rem Assist support specialist with headset"
                width={500}
                height={650}
                className={styles.agentImg}
                priority
              />
            </div>

            <div className={styles.leftContent}>
              <div>
                <span className={styles.leftEyebrow}>TELL US YOUR NEEDS</span>
                <h3 className={styles.leftHeading}>
                  Book the consult,<br />
                  or send the brief.
                </h3>
                <div className={styles.accentLine} aria-hidden="true" />

                <div className={styles.pointsList}>
                  <div className={styles.pointItem}>
                    <div className={styles.pointIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div className={styles.pointText}>
                      <strong>Tailored to your needs</strong>
                      <p>We understand your goals and recommend the right solution.</p>
                    </div>
                  </div>

                  <div className={styles.pointItem}>
                    <div className={styles.pointIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <polyline points="9 12 11 14 15 10" />
                      </svg>
                    </div>
                    <div className={styles.pointText}>
                      <strong>Expert guidance</strong>
                      <p>Our specialists will help you find the perfect fit.</p>
                    </div>
                  </div>

                  <div className={styles.pointItem}>
                    <div className={styles.pointIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <div className={styles.pointText}>
                      <strong>Quick response</strong>
                      <p>We&rsquo;ll get back to you within one business day.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* A sibling of .leftContent, not a child of it. .leftContent is
                position:relative with a z-index, which makes it a stacking
                context — so a z-index on anything inside it is resolved
                WITHIN that context and can never rise above the cutout, no
                matter how high the number. The badge has to sit outside to
                paint over her. */}
            <div className={styles.trustBadge}>
              <div className={styles.avatarStack}>
                <Image src="/images/Agents/cs-1.jpg" alt="" width={26} height={26} className={styles.avatarImg} />
                <Image src="/images/Agents/cs-2.jpg" alt="" width={26} height={26} className={styles.avatarImg} />
                <Image src="/images/Agents/cs-3.jpg" alt="" width={26} height={26} className={styles.avatarImg} />
                <Image src="/images/Agents/sdr-1.jpg" alt="" width={26} height={26} className={styles.avatarImg} />
              </div>
              <div className={styles.trustText}>
                <strong>Trusted by 100+ businesses</strong>
                <span>to build high-performing remote teams.</span>
              </div>
            </div>
          </div>

          {/* Right White Column Form */}
          <div className={styles.rightCol}>
            <span className={styles.rightEyebrow}>CONNECT WITH US</span>
            <ContactRailForm />
          </div>
        </div>
      </div>
    </section>
  );
}