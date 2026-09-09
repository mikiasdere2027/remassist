'use client';

import { useState } from 'react';
import Link from 'next/link';
import { deleteFaqItem, setFaqItemFeatured, setFaqItemPublished } from './actions';
import MenuButton from '../../MenuButton';
import styles from '../../../admin.module.css';

/**
 * The FAQ list, separated into one accordion per category.
 *
 * Each category is a header carrying its own question count; only the open one
 * renders its rows, and opening a second closes the first — one question list
 * at a time reads like one section, not six stacked. Nothing is open until you
 * open it, so the page opens on the six sections themselves.
 *
 * The rows themselves are plain server-friendly markup (a link and a server
 * action), so only the open/closed state is client state. `children` never
 * matters: the rows are rendered here from props the server passes in.
 */
export type FaqAccordionRow = {
  id: string;
  question: string;
  published: boolean;
  /** Starred for the homepage card. See setFaqItemFeatured. */
  featured: boolean;
  /** Opens this row's confirm step, or null when it may not be removed. */
  removeHref?: string | null;
};

export type FaqAccordionSection = {
  id: string;
  title: string;
  count: number;
  rows: FaqAccordionRow[];
};

export default function FaqAccordion({
  sections,
  mayEdit,
  confirming = null,
  backHref = '/admin/content/faq',
}: {
  sections: FaqAccordionSection[];
  mayEdit: boolean;
  /** The row whose remove confirm step is open, by id. */
  confirming?: string | null;
  /** Where "Keep it" goes — the list with its filters intact. */
  backHref?: string;
}) {
  /* -1: every section starts closed. Opening the first one by default put a
     list of questions above five collapsed headers, which reads as the page
     having one section and some leftovers rather than six you choose from. */
  const [open, setOpen] = useState(-1);

  return (
    <div className={styles.faqAccordion}>
      {sections.map((s, i) => {
        const expanded = open === i;
        return (
          <div className={styles.faqAccordionItem} key={s.id}>
            <button
              type="button"
              className={`${styles.faqAccordionHead} ${expanded ? styles.faqAccordionHeadOpen : ''}`}
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? -1 : i)}
            >
              <span className={styles.faqAccordionLabel}>
                <span className={styles.faqAccordionTitle}>{s.title}</span>
                <span className={styles.faqAccordionCount}>
                  {s.count} {s.count === 1 ? 'question' : 'questions'}
                </span>
              </span>
              <span className={styles.faqAccordionIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d={expanded ? 'm6 14 6-6 6 6' : 'm6 10 6 6 6-6'} />
                </svg>
              </span>
            </button>

            {expanded && (
              <div className={styles.faqAccordionRows}>
                {s.rows.map((r) =>
                  r.id === confirming ? (
                    <ConfirmRemove key={r.id} row={r} backHref={backHref} />
                  ) : (
                  <div className={styles.faqRow} key={r.id}>
                    {/* Decorative: this admin has no client-side drag, and
                        reordering is Move up / Move down on the edit page. */}
                    <span className={styles.grip} aria-hidden="true" />

                    <Link className={styles.faqQ} href={`/admin/content/faq/${r.id}`}>
                      {r.question}
                    </Link>

                    <span
                      className={`${styles.pill} ${r.published ? styles.pillLow : styles.pillMed}`}
                    >
                      {r.published ? 'Published' : 'Draft'}
                    </span>

                    {/* Only the starred rows carry a second pill. An "Off the
                        homepage" pill on the other twenty-nine would say
                        nothing and cost every row the width. */}
                    {r.featured && (
                      <span className={`${styles.pill} ${styles.pillHome}`}>
                        {r.published ? 'Homepage' : 'Homepage when live'}
                      </span>
                    )}

                    {mayEdit && (
                      <div className={styles.actions}>
                        <MenuButton label={`Options for: ${r.question}`}>
                          <Link
                            className={styles.memberDropdownItem}
                            href={`/admin/content/faq/${r.id}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                            </svg>
                            Edit question
                          </Link>

                          <form action={setFaqItemPublished} style={{ margin: 0 }}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="published" value={r.published ? '0' : '1'} />
                            <button className={styles.memberDropdownItem} type="submit">
                              {r.published ? (
                                <>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M3 3l18 18" />
                                    <path d="M10.6 5.1A9.9 9.9 0 0 1 12 5c5 0 9 4.5 9 7 0 .8-.5 1.9-1.4 3" />
                                    <path d="M6.3 6.9C3.9 8.4 3 10.4 3 12c0 2.5 4 7 9 7 1.6 0 3-.4 4.2-1" />
                                  </svg>
                                  Take off the FAQ page
                                </>
                              ) : (
                                <>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                  Put live on the FAQ page
                                </>
                              )}
                            </button>
                          </form>

                          <form action={setFaqItemFeatured} style={{ margin: 0 }}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="featured" value={r.featured ? '0' : '1'} />
                            <button className={styles.memberDropdownItem} type="submit">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill={r.featured ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="m12 3 2.7 5.6 6.3.9-4.5 4.4 1 6.1L12 17.1 6.5 20l1-6.1L3 9.5l6.3-.9z" />
                              </svg>
                              {r.featured ? 'Take off the homepage' : 'Show on the homepage'}
                            </button>
                          </form>

                          {/* Only a draft has one: deleteFaqItem refuses a
                              published question, and an item that always fails
                              is worse than an item that is not there. */}
                          {r.removeHref && (
                            <Link
                              className={`${styles.memberDropdownItem} ${styles.memberDropdownItemDanger}`}
                              href={r.removeHref}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <path d="M10 11v6M14 11v6" />
                              </svg>
                              Remove question
                            </Link>
                          )}
                        </MenuButton>
                      </div>
                    )}
                  </div>
                  ),
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Removing asks first, in the row's own place.
 *
 * A server-rendered confirm step rather than a browser dialog, matching the
 * posts list and the rate tables. The checkbox is `required` in the browser and
 * re-checked in deleteFaqItem, because a required attribute is a courtesy and
 * not a control.
 *
 * Laid out as question-on-the-left, buttons-on-the-right, which is where the
 * row's own menu button was a moment ago — the confirm replaces that row in
 * place, so the thing you click next is where you were already looking.
 */
function ConfirmRemove({ row, backHref }: { row: FaqAccordionRow; backHref: string }) {
  return (
    <div className={styles.faqConfirmRow}>
      <form className={styles.faqConfirmForm} action={deleteFaqItem}>
        <input type="hidden" name="id" value={row.id} />
        {/* The question and its tickbox are one block: what is being asked, and
            the acknowledgement of it. The buttons answer that block, so they
            sit opposite it rather than under it. */}
        <div className={styles.faqConfirmText}>
          <p className={styles.faqConfirmLead}>
            Remove &ldquo;{row.question}&rdquo;? The question and its answer go for good.
          </p>
          <label className={styles.confirmCheck} htmlFor={`del-${row.id}`}>
            <input type="checkbox" id={`del-${row.id}`} name="confirm" value="1" required />
            <span>I understand this cannot be undone.</span>
          </label>
        </div>
        <div className={styles.rowActions} style={{ padding: 0 }}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" autoFocus>
            Remove this draft
          </button>
          <Link className={styles.rowLink} href={backHref}>
            Keep it
          </Link>
        </div>
      </form>
    </div>
  );
}