'use client';

import { useState } from 'react';
import type { FaqEntry } from '@/lib/faq/content';
import styles from './FaqSection.module.css';

/**
 * The homepage FAQ accordion.
 *
 * Split out of FaqSection when the questions stopped being a constant in this
 * file and became rows an editor stars in the admin: the fetch has to happen on
 * the server, the open/closed row has to be client state, and one component
 * cannot be both. Everything else about the section — the certifications panel,
 * the seals, the card — stayed on the server side of that line.
 *
 * Answers arrive as HTML that getFeaturedFaq has already cleaned against the
 * allowlist in lib/content/sanitize.ts. That is the only reason
 * dangerouslySetInnerHTML is defensible here; nothing on this page should ever
 * pass it a string from anywhere else.
 */
export default function FaqAccordion({ items }: { items: FaqEntry[] }) {
  // index.html starts at faqOpen: -1 — every row closed.
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className={styles.list}>
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.question} className={styles.item}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
              className={styles.q}
            >
              <span>{f.question}</span>
              <span className={styles.plus} aria-hidden="true" />
            </button>
            <div id={`faq-panel-${i}`} className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}>
              <div className={styles.panelInner}>
                <div
                  className={styles.answer}
                  dangerouslySetInnerHTML={{ __html: f.answer }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
