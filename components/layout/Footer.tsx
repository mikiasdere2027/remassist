import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

/**
 * Site footer — ported from partials/footer.html.
 * Server component. `style-hover` attributes become Tailwind `hover:`
 * classes; base styles stay inline to match the original markup exactly.
 *
 * The "Ask RemAssist" chat widget script that travels with this partial is
 * ported in Phase 02 (widgets), not here.
 */

/* Base styles moved out of an inline object and into Footer.module.css so a
   breakpoint can grow the tap target — see the .link rules there. */
const linkClass = `${styles.link} hover:text-white`;

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  // Internal app routes use next/link (client-side nav); everything else
  // (mailto:, tel:, external profiles) stays a plain anchor.
  if (href.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link href={href} className={linkClass}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={linkClass}>
      {children}
    </a>
  );
}

const socialStyle: CSSProperties = {
  width: 36,
  height: 36,
  flex: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.14)',
  color: 'var(--ink-200)',
  textDecoration: 'none',
  transition: 'all 200ms cubic-bezier(0.2,0.8,0.2,1)',
};

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label={label}
      style={socialStyle}
      className="hover:bg-[var(--brand-blue)] hover:border-[var(--brand-blue)] hover:text-white hover:-translate-y-0.5"
    >
      {children}
    </a>
  );
}

export default function Footer() {
  return (
    <footer style={{ background: 'var(--navy-900)', color: 'var(--fg-on-dark-muted)', position: 'relative', overflow: 'hidden' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          whiteSpace: 'nowrap',
          textAlign: 'center',
          lineHeight: 1,
          fontSize: 'clamp(96px,20vw,230px)',
          fontWeight: 900,
          letterSpacing: '0.06em',
          color: 'rgba(255,255,255,0.02)',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 1,
        }}
      >
        Rem Assist
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 24px 32px', position: 'relative', zIndex: 2 }}>
        <div className={styles['dc-footer-grid']}>
          <div>
            <img
              src="/images/rem-logo.svg"
              alt="Rem Assist"
              style={{ height: 38, width: 'auto', display: 'block', marginBottom: 16, filter: 'brightness(0) invert(1)' }}
            />
            <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.6, maxWidth: '36ch' }}>
              Remote teams that match your culture — results-driven, efficient, on target, thoroughly excellent. Every time.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <img
                src="/images/ISO_9001-2015.svg"
                alt="ISO 9001 certified"
                style={{ height: 44, width: 'auto', display: 'block', filter: 'brightness(0) invert(1)' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, color: '#fff' }}>ISO 9001/27001</span>
                <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: 'var(--brand-blue)' }}>Certified</span>
              </div>
            </div>
          </div>

          <div className={styles.col}>
            <div className={styles.colHead} style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-on-dark-muted)', marginBottom: 4 }}>
              Services
            </div>
            <FooterLink href="/services/sales-and-revenue">Sales &amp; Revenue</FooterLink>
            <FooterLink href="/services/customer-service-agents">Customer Service<br />Agents</FooterLink>
            <FooterLink href="/services/finance-and-accounting">Finance &amp; Accounting</FooterLink>
            <FooterLink href="/services/gtm-teams">GTM Teams</FooterLink>
            <FooterLink href="/services/sdr-as-a-service">SDR as a Service</FooterLink>
          </div>

          <div className={styles.col}>
            <div className={styles.colHead} style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-on-dark-muted)', marginBottom: 4 }}>
              Company
            </div>
            <FooterLink href="/">Home</FooterLink>
            <FooterLink href="/pricing">Pricing</FooterLink>
            {/* Named, not linked — see .linkSoon in Footer.module.css. */}
            <span className={styles.linkSoon} aria-disabled="true">
              Case Studies <i className={styles.soon}>soon</i>
            </span>
            <FooterLink href="/reviews">Reviews</FooterLink>
            <FooterLink href="/blog">Blog &amp; Guides</FooterLink>
          </div>
          <div className={styles.col}>
            <div className={styles.colHead} style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-on-dark-muted)', marginBottom: 4 }}>
              Contact
            </div>
            <FooterLink href="tel:+18322302194">(832) 230-2194</FooterLink>
            <FooterLink href="mailto:support@remassistance.com">support@remassistance.com</FooterLink>
            <span style={{ fontSize: 14, color: 'var(--fg-on-dark-muted)' }}>Support and sales available 24/7</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              <SocialLink href="https://www.linkedin.com/company/rem-assistance/" label="Rem Assist on LinkedIn">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45Z" /></svg>
              </SocialLink>
              <SocialLink href="https://www.instagram.com/remassist" label="Rem Assist on Instagram">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16ZM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.13 1.38C1.35 2.68.94 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.66 1.34 1.07 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.66-.67 1.07-1.34 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.38-2.13C21.32 1.35 20.65.94 19.86.63 19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0Zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32Zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm7.85-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0Z" /></svg>
              </SocialLink>
              <SocialLink href="https://www.youtube.com/@RemAssistant" label="Rem Assist on YouTube">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" /></svg>
              </SocialLink>
            </div>
          </div>
        </div>
      <div style={{ paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--fg-on-dark-muted)' }}>Copyright © 2026 Rem Assist. All rights reserved.</span>
          <span className={styles.legal}>
            <a href="/privacy-policy" className={`${styles.legalLink} hover:text-white`}>
              Privacy Policy
            </a>
            <a href="/terms-of-service" className={`${styles.legalLink} hover:text-white`}>
              Terms of Service
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}