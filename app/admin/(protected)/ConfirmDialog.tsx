'use client';

import { useEffect, useRef } from 'react';
import styles from '../admin.module.css';

/**
 * A centred "are you sure?" dialog, built on the native <dialog> element.
 *
 * The sibling of ModalDialog, and the reason there are two: that one keeps its
 * open state in the URL, so Cancel is a link and a refresh survives. That is
 * right for a screen you navigate to, and wrong for a question asked in the
 * middle of a form — pushing a search param would re-render the page from the
 * server and throw away everything typed since the last save, which is exactly
 * what the question is trying to protect. So this one is driven by state and
 * answers with callbacks.
 *
 * What it keeps from the native element is everything a hand-rolled overlay
 * has to reimplement and usually gets wrong: it is centred by the browser, it
 * traps focus, it restores focus to whatever opened it, it makes the page
 * behind inert, Esc closes it, and ::backdrop is a real thing that can be
 * styled. No z-index, no scroll lock, no focus bookkeeping.
 *
 * Esc and a backdrop click both mean "no", which is the safe answer to every
 * question this dialog is used for.
 */
export default function ConfirmDialog({
  title,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  /* Opened on mount rather than rendered with the `open` attribute: a
     statically-open dialog is not modal — no focus trap, no inert background,
     and ::backdrop never paints. */
  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);

  return (
    <dialog
      className={`${styles.modal} ${styles.modalNarrow}`}
      ref={ref}
      aria-label={title}
      /* preventDefault stops the browser closing the element behind our back,
         which would leave the dialog gone with the caller still thinking it is
         open. */
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      /* The backdrop is not a child, so a click on it targets the dialog
         itself — that identity check is the whole test, and it is why the
         panel below is an element rather than bare children. */
      onClick={(e) => {
        if (e.target === ref.current) onCancel();
      }}
    >
      <div className={styles.modalPanel}>
        <div className={styles.modalHead}>
          <h2 className={styles.panelTitle}>{title}</h2>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onCancel}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.modalBody}>
          {children}
          <div className={styles.modalFoot}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={onCancel}
              /* The safe answer holds the focus the dialog opens with, so a
                 stray Enter keeps the article where it is. */
              autoFocus
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
