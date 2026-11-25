'use client';

import s from '../../p/[token]/page.module.css';

/** Print or save as PDF — the page prints as just the invoice. */
export default function PrintButton() {
  return (
    <div className={s.buttons}>
      <button type="button" className={s.primary} onClick={() => window.print()}>Print or save as PDF</button>
    </div>
  );
}
