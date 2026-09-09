'use client';

import { SOURCE_LABEL } from '../display';
import styles from '../../../../admin.module.css';

/**
 * The source dropdown on the Add review page.
 *
 * Client for one reason: which source is selected decides whether the headline
 * field (Trustpilot only) is shown. The selection still rides the form as a
 * normal `name="source"` control, so no routing is involved — only which
 * fields are on screen changes.
 *
 * Dressed as .selectField rather than a bare .control select, the same as the
 * dropdowns on the FAQ, catalog and leads screens: same box, but the native
 * arrow swapped for an inline chevron that looks the same on every platform.
 */
export default function ReviewSourcePicker({
  sources,
  value,
  onChange,
}: {
  sources: Array<{ source: string }>;
  value: string;
  onChange?: (source: string) => void;
}) {
  return (
    <div className={styles.formGrid2}>
      <div className={styles.memberFieldGroup}>
        <label className={styles.memberFieldLabel} htmlFor="src">Source</label>
        <span className={styles.selectField}>
          <select
            id="src"
            name="source"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
          >
            {sources.map((s) => (
              <option key={s.source} value={s.source}>{SOURCE_LABEL[s.source] ?? s.source}</option>
            ))}
          </select>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
        <span className={styles.memberFieldHelper}>Where the quote was published</span>
      </div>

      <div className={styles.memberFieldGroup}>
        {value === 'trustpilot' ? (
          <>
            <label className={styles.memberFieldLabel} htmlFor="nhd">
              Headline (optional)
            </label>
            <input className={styles.memberFieldInput} id="nhd" name="headline" maxLength={200} />
            <span className={styles.memberFieldHelper}>
              The bold line Trustpilot prints above the review
            </span>
          </>
        ) : (
          <>
            <span className={styles.memberFieldLabel}>Headline</span>
            <p className={styles.memberFieldHelper} style={{ margin: 0 }}>
              Google doesn&rsquo;t print one, so there is no field for it.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
