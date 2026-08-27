'use client';

import { useState } from 'react';

/**
 * FaqSection — interactive FAQ accordion, ported from index.html (Phase 02).
 * One open at a time; the chevron rotates and the row expands via grid-rows.
 */
const FAQS = [
  {
    q: 'What types of roles can I fill offshore?',
    a: (
      <>
        <p>We specialize in remote hires for:</p>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '0 0 14px' }}>
          {['Executive Assistants', 'Bookkeepers / AP–AR', 'Operations Associates', 'Customer Support', 'Sales (SDRs)', 'Data Entry / Reporting', 'Marketing Assistants'].map((c) => (
            <span key={c} style={{ background: '#fff', border: '1px solid rgba(0,5,67,.08)', borderRadius: 999, padding: '8px 15px', fontSize: 12, fontWeight: 600, color: 'var(--brand-navy)' }}>{c}</span>
          ))}
        </span>
      </>
    ) as React.ReactNode,
  },
  {
    q: 'How quickly can they start?',
    a: <p>Most roles are filled within <b>7 to 21 days</b>. Once you choose a candidate, they can typically start within a few business days.</p>,
  },
  {
    q: 'Do I have to pay upfront?',
    a: <p>No. <b>You only pay if you hire.</b> There are no upfront fees or hidden costs — zero risk until you find the right match.</p>,
  },
];

const BOOK = 'https://calendly.com/j-zemene-remassistance/new-meeting';

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    // id is a link target: /case-studies links to /#faq, as index.html did.
    <section id="faq" style={{ background: '#fff', position: 'relative', overflow: 'hidden' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '88px 24px', position: 'relative', zIndex: 1 }}>
        <span className="t-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-blue)' }} />
          FAQ
        </span>
        <h2 style={{ margin: '18px 0 0', fontFamily: 'var(--font-display)', fontSize: 'clamp(30px,4vw,46px)', fontWeight: 700, color: 'var(--brand-navy)', lineHeight: 1.08 }}>
          Frequently Asked <span style={{ color: 'var(--brand-blue)' }}>Questions</span>
        </h2>
        <p style={{ margin: '8px 0 26px', color: 'var(--ink-600)', fontSize: 16 }}>
          Still have questions?{' '}
          <a href={BOOK} target="_blank" rel="noopener" style={{ color: 'var(--brand-blue)', fontWeight: 600, textDecoration: 'none', borderBottom: '1.5px solid var(--brand-blue)' }}>
            Chat with us.
          </a>
        </p>

        <div style={{ borderTop: '1px solid rgba(0,5,67,.1)' }}>
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} style={{ borderBottom: '1px solid rgba(0,5,67,.1)' }}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, background: 'none', border: 0, padding: '24px 4px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                >
                  <span style={{ color: 'var(--brand-navy)', fontWeight: 600, fontSize: 16 }}>{f.q}</span>
                  <span
                    style={{
                      flex: 'none', width: 40, height: 40, borderRadius: '50%', background: isOpen ? 'var(--brand-blue)' : 'var(--ink-50)',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .35s, background .35s',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                  </span>
                </button>
                <div style={{ display: 'grid', transition: 'grid-template-rows .5s', gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
                  <div style={{ overflow: 'hidden', minHeight: 0 }}>
                    <div style={{ color: 'var(--ink-600)', fontSize: 15, lineHeight: 1.75, padding: '0 4px 24px', maxWidth: '62ch' }}>
                      {f.a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}