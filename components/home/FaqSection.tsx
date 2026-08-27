'use client';

import { useState, type ReactNode } from 'react';
import shared from './HomeSections.module.css';
import styles from './FaqSection.module.css';

/**
 * FaqSection — "Certifications & FAQ", ported from index.html §faq (Phase 02).
 *
 * The artboard is a two-column grid (0.9fr / 1.1fr): a navy certifications
 * panel carrying the two ISO seals on the left, the accordion card on the
 * right. The first port rendered only the accordion, on a plain white band —
 * this restores the left column and the artboard's #f5f7fa section ground.
 *
 * The artboard's "Verify Here" pill is deliberately not reproduced: its href
 * in index.html is "#", so it links nowhere. It goes back in as soon as there
 * is a real certificate-registry URL to point it at.
 */
const ROLES = [
  'Executive Assistants',
  'Bookkeepers / AP–AR',
  'Operations Associates',
  'Customer Support',
  'Sales (SDRs)',
  'Data Entry / Reporting',
  'Marketing Assistants',
];

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: 'What types of roles can I fill offshore?',
    a: (
      <>
        <p className={styles.a} style={{ paddingBottom: 14 }}>We specialize in remote hires for:</p>
        <span className={styles.chips}>
          {ROLES.map((c) => <span key={c} className={styles.chip}>{c}</span>)}
        </span>
      </>
    ),
  },
  {
    q: 'What if I don’t like any of the candidates?',
    a: (
      <p className={styles.a}>
        No problem. If none of the vetted candidates feel like a fit, <b>you don’t pay anything</b>.
        We’ll keep looking or part ways — no strings attached.
      </p>
    ),
  },
  {
    q: 'How quickly can they start?',
    a: (
      <p className={styles.a}>
        Most roles are filled within <b>7 to 21 days</b>. Once you choose a candidate, they can
        typically start within a few business days.
      </p>
    ),
  },
  {
    q: 'Do I have to pay upfront?',
    a: (
      <p className={styles.a}>
        No. <b>You only pay if you hire.</b> There are no upfront fees or hidden costs — zero risk
        until you find the right match.
      </p>
    ),
  },
];

const BOOK = 'https://calendly.com/j-zemene-remassistance/new-meeting';

/** One ISO seal. `id` namespaces the gradients and text paths so the two
 *  medallions on the page do not share defs. */
function Seal({ id, standard }: { id: string; standard: string }) {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={`ISO ${standard} certified`}>
      <defs>
        <linearGradient id={`sealOuter-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1B2C5E" />
          <stop offset="1" stopColor="#000543" />
        </linearGradient>
        <linearGradient id={`sealInner-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34bdf0" />
          <stop offset="1" stopColor="#518de0" />
        </linearGradient>
        <radialGradient id={`sealSheen-${id}`} cx=".3" cy=".25" r=".9">
          <stop offset="0" stopColor="#fff" stopOpacity=".25" />
          <stop offset=".55" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <path id={`sealTop-${id}`} d="M 27 100 A 73 73 0 0 1 173 100" />
        <path id={`sealBottom-${id}`} d="M 18 100 A 82 82 0 0 0 182 100" />
      </defs>
      <circle cx="100" cy="100" r="96" fill={`url(#sealOuter-${id})`} />
      <circle cx="100" cy="100" r="96" fill={`url(#sealSheen-${id})`} />
      <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(255,255,255,.18)" />
      <text fontSize="13" fontWeight="600" letterSpacing="4" fill="#C9D6FF">
        <textPath href={`#sealTop-${id}`} startOffset="50%" textAnchor="middle">CERTIFIED</textPath>
      </text>
      <text fontSize="13" fontWeight="600" letterSpacing="5" fill="#C9D6FF">
        <textPath href={`#sealBottom-${id}`} startOffset="50%" textAnchor="middle">ACERTA</textPath>
      </text>
      <circle cx="100" cy="100" r="62" fill={`url(#sealInner-${id})`} stroke="rgba(255,255,255,.4)" strokeWidth="1.5" />
      <g fill="none" stroke="#fff" strokeWidth="1.6">
        <circle cx="100" cy="76" r="15" />
        <path d="M85 76h30M100 61c4.6 4.3 7 9.3 7 15s-2.4 10.7-7 15c-4.6-4.3-7-9.3-7-15s2.4-10.7 7-15Z" />
      </g>
      <text x="100" y="122" textAnchor="middle" fontSize="30" fontWeight="800" fill="#fff">ISO</text>
      <text x="100" y="145" textAnchor="middle" fontSize="17" fontWeight="600" letterSpacing="2" fill="#fff">{standard}</text>
    </svg>
  );
}

export default function FaqSection() {
  // index.html starts at faqOpen: -1 — every row closed.
  const [open, setOpen] = useState<number | null>(null);

  return (
    // id is a link target: /case-studies links to /#faq, as index.html did.
    <section id="faq" className={styles.section}>
      {/* Drifting dot field — same effect as the Our Services section (index.html).
          Sits on the #f5f7fa ground; .inner is z-index 1 and stays above it. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '-40px',
          backgroundImage: 'radial-gradient(rgba(14,42,74,0.11) 1.6px, transparent 1.7px)',
          backgroundSize: '22px 22px',
          animation: 'dotDrift 34s linear infinite',
          pointerEvents: 'none',
        }}
      />
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div className={styles.certs}>
            <span aria-hidden="true" className={styles.dots} />
            <div className={styles.certsCopy}>
              <span className={`${shared.eyebrow} ${shared.eyebrowDark}`}>Certifications</span>
              <h3 className={styles.certsTitle}>Your peace of mind is our <span>priority</span></h3>
              <p className={styles.certsDesc}>
                Rem Assist maintains dual ISO certifications — quality and security are embedded
                into every task we perform, for every partnership.
              </p>
            </div>
            <span className={styles.seals}>
              <span className={`${styles.seal} ${styles.sealA}`}><Seal id="a" standard="27001" /></span>
              <span className={`${styles.seal} ${styles.sealB}`}><Seal id="b" standard="9001" /></span>
            </span>
          </div>

          <div className={styles.card}>
            <span className={shared.eyebrow}>Help Center</span>
            <div className={`${shared.head} ${shared.headSolo}`}>
              <h2 className={shared.title}>Frequently Asked <span>Questions</span></h2>
            </div>
            <p className={styles.lede}>
              Still have questions?{' '}
              <a href={BOOK} target="_blank" rel="noopener">Chat with us.</a>
            </p>

            <div className={styles.list}>
              {FAQS.map((f, i) => {
                const isOpen = open === i;
                return (
                  <div key={f.q} className={styles.item}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className={styles.q}
                    >
                      <span>{f.q}</span>
                      <span className={styles.chev}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                      </span>
                    </button>
                    <div id={`faq-panel-${i}`} className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}>
                      <div className={styles.panelInner}>
                        {f.a}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
