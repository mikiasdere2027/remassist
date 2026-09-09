'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { createFaqItemAction, removeFaqItemAction } from '../actions';
import RichEditor from '../../posts/RichEditor';
import styles from '../../../../admin.module.css';

interface FaqGroup {
  id: string;
  title: string;
}

interface AddedQuestion {
  id: string;
  groupId: string;
  groupTitle: string;
  question: string;
  answer: string;
}

const MAX_FAQ_PER_PAGE = 10;

/**
 * Whether the editor holds anything worth saving.
 *
 * The empty state of a rich-text editor is `<p></p>`, not `''`, so the old
 * `!answer.trim()` check passed on a blank answer and let the server produce
 * the error instead. Tags out, entities out, then look. The server runs the
 * same test in readAnswer — this one exists so the message appears without a
 * round trip, not instead of it.
 */
function hasAnswer(html: string): boolean {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
}

export default function NewFaqForm({
  groups,
  mayWrite,
}: {
  groups: FaqGroup[];
  mayWrite: boolean;
}) {
  const [addedList, setAddedList] = useState<AddedQuestion[]>([]);
  const [openAccordion, setOpenAccordion] = useState<number>(0);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(true);

  // Form state
  const [groupId, setGroupId] = useState<string>(groups[0]?.id ?? '');
  const [question, setQuestion] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  /* TipTap owns its document, so clearing `answer` after a save leaves the
     words on screen. Remounting the editor is what empties it. */
  const [editorKey, setEditorKey] = useState<number>(0);

  const [isPending, startTransition] = useTransition();

  /* Which added question is asking to be removed. A two-click button rather
     than a dialog, matching the confirm steps everywhere else in this admin:
     the row is a draft written minutes ago, but it is still a delete. */
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleRemove = (id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await removeFaqItemAction(id);
      if (!res.ok) {
        setError(res.error || 'Failed to remove question');
        return;
      }
      setConfirmingId(null);
      setAddedList((prev) => prev.filter((q) => q.id !== id));
      /* The list shifts up under it, so an index-based open row would land on
         whichever question took its place. */
      setOpenAccordion(-1);
    });
  };

  const canAddMore = addedList.length < MAX_FAQ_PER_PAGE;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddMore) return;
    setError(null);

    const trimmedQ = question.trim();
    const trimmedA = answer.trim();

    if (!trimmedQ || !hasAnswer(trimmedA)) {
      setError('Both question and answer are required.');
      return;
    }

    startTransition(async () => {
      const res = await createFaqItemAction({
        groupId,
        question: trimmedQ,
        answer: trimmedA,
      });

      if (!res.ok) {
        setError(res.error || 'Failed to save question');
        return;
      }

      const groupObj = groups.find((g) => g.id === groupId);
      const newItem: AddedQuestion = {
        id: res.id ?? `draft-${Date.now()}`,
        groupId,
        groupTitle: groupObj?.title ?? 'Section',
        question: trimmedQ,
        /* The server's copy, not the browser's — see createFaqItemAction. */
        answer: res.answer ?? '',
      };

      // Add to list
      setAddedList((prev) => [newItem, ...prev]);
      setOpenAccordion(0); // Open the newly added item

      // Reset fields
      setQuestion('');
      setAnswer('');
      setEditorKey((k) => k + 1);

      // If reached maximum 10, close form
      if (addedList.length + 1 >= MAX_FAQ_PER_PAGE) {
        setIsFormOpen(false);
      } else {
        setIsFormOpen(false);
      }
    });
  };

  return (
    <div>
      {/* ── TOP: Added questions accordion (appears when at least 1 is added) ── */}
      {addedList.length > 0 && (
        <div className={styles.faqAddedCard}>
          <div className={styles.faqAddedHead}>
            <h3 className={styles.faqAddedTitle}>
              Added questions
              <span className={styles.faqAddedCount}>
                {addedList.length} / {MAX_FAQ_PER_PAGE} added
              </span>
            </h3>
            <span className={styles.panelNote}>
              Saved as drafts — check before publishing
            </span>
          </div>

          <div className={styles.faqAccordion} style={{ padding: '12px' }}>
            {addedList.map((item, idx) => {
              const expanded = openAccordion === idx;
              return (
                <div className={styles.faqAccordionItem} key={item.id}>
                  <button
                    type="button"
                    className={`${styles.faqAccordionHead} ${
                      expanded ? styles.faqAccordionHeadOpen : ''
                    }`}
                    aria-expanded={expanded}
                    onClick={() => setOpenAccordion(expanded ? -1 : idx)}
                  >
                    <span className={styles.faqAccordionLabel}>
                      <span className={styles.faqAccordionTitle}>{item.question}</span>
                      <span className={styles.faqAccordionCount}>
                        {item.groupTitle} · Draft
                      </span>
                    </span>
                    <span className={styles.faqAccordionIcon} aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d={expanded ? 'm6 14 6-6 6 6' : 'm6 10 6 6 6-6'} />
                      </svg>
                    </span>
                  </button>

                  {expanded && (
                    <div className={styles.faqAccordionAnswer}>
                      {/* Cleaned by the server on the way in and echoed back —
                          this never renders markup the allowlist has not seen. */}
                      <div
                        className={styles.editorProse}
                        dangerouslySetInnerHTML={{ __html: item.answer }}
                      />
                      <div className={styles.faqAccordionAnswerFoot}>
                        <span>
                          Section: <strong>{item.groupTitle}</strong>
                        </span>
                        <span className={styles.faqAddedFootActions}>
                          <Link
                            className={styles.rowLink}
                            href={`/admin/content/faq/${item.id}`}
                            target="_blank"
                          >
                            Edit question details ↗
                          </Link>
                          {mayWrite && (confirmingId === item.id ? (
                            <>
                              <button
                                type="button"
                                className={`${styles.rowLink} ${styles.rowLinkDanger}`}
                                onClick={() => handleRemove(item.id)}
                                disabled={isPending}
                              >
                                {isPending ? 'Removing…' : 'Confirm remove'}
                              </button>
                              <button
                                type="button"
                                className={styles.rowLink}
                                onClick={() => setConfirmingId(null)}
                                disabled={isPending}
                              >
                                Keep it
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className={`${styles.rowLink} ${styles.rowLinkDanger}`}
                              onClick={() => setConfirmingId(item.id)}
                            >
                              Remove
                            </button>
                          ))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Limit reached notice ── */}
      {!canAddMore && (
        <div className={styles.faqLimitNotice}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <strong>Maximum FAQ limit reached (10 of 10)</strong>
            <div>You have reached the maximum of 10 questions for this page. Return to the FAQ list to manage and publish them.</div>
          </div>
        </div>
      )}

      {/* ── Form Card: Section & Question in 2 col row, Answer full width below ── */}
      {canAddMore && isFormOpen && (
        <section className={`${styles.panel} ${styles.section}`}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>
                {addedList.length === 0 ? 'New question' : `Add another question (${addedList.length + 1} of ${MAX_FAQ_PER_PAGE})`}
              </h2>
              <p className={styles.panelSub}>
                Saved as a draft, so you can check it before it goes live
              </p>
            </div>
          </div>

          <form className={styles.stackWide} onSubmit={handleSubmit}>
            {error && (
              <p className={`${styles.signinMsg} ${styles.msgErr}`} role="alert">
                {error}
              </p>
            )}

            {/* Row 1: Section & Question in 2 columns */}
            <div className={styles.faqTwoCol}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="faq-section">
                  Section
                </label>
                <select
                  className={styles.control}
                  id="faq-section"
                  name="groupId"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  required
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="faq-question">
                  Question
                </label>
                <input
                  className={styles.control}
                  id="faq-question"
                  name="question"
                  placeholder="What do people actually ask?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={300}
                  required
                  readOnly={!mayWrite || isPending}
                  autoFocus
                />
              </div>
            </div>

            {/* Row 2: Answer full width. The narrow toolbar is the FAQ's own
                allowlist made visible — see RichEditor's `variant`. */}
            <div className={styles.field} style={{ width: '100%' }}>
              {/* A span, not a label — see the note on the edit page. */}
              <span className={styles.fieldLabel}>Answer</span>
              <RichEditor
                key={editorKey}
                name="answer"
                variant="answer"
                ariaLabel="Answer"
                placeholder="Write a helpful, detailed answer…"
                onChange={setAnswer}
              />
            </div>

            {/* Actions */}
            <div className={styles.rowActions} style={{ padding: 0 }}>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                type="submit"
                disabled={!mayWrite || isPending}
              >
                {isPending ? 'Adding...' : 'Add question'}
              </button>

              {addedList.length > 0 && (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </button>
              )}

              <span className={styles.panelNote}>
                Added as a draft, so you can check it before it goes live
              </span>
            </div>
          </form>
        </section>
      )}

      {/* ── Buttons when form is collapsed but user can add more ── */}
      {canAddMore && !isFormOpen && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button
            type="button"
            className={styles.btnHeader}
            onClick={() => setIsFormOpen(true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add more ({addedList.length} of {MAX_FAQ_PER_PAGE})
          </button>

          <Link className={`${styles.btn} ${styles.btnGhost}`} href="/admin/content/faq">
            Done — All questions ({addedList.length} added)
          </Link>
        </div>
      )}

      {/* ── Done link when limit is reached ── */}
      {!canAddMore && (
        <div style={{ marginTop: '16px' }}>
          <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/admin/content/faq">
            Done — View all questions
          </Link>
        </div>
      )}
    </div>
  );
}
