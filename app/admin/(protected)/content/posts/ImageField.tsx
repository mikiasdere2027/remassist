'use client';

import Image from 'next/image';
import { useRef } from 'react';
import Req from '../../RequiredMark';
import styles from '../../../admin.module.css';

/**
 * The cover image field: a preview, a file picker, and the current file's path.
 *
 * Uploading is the only way to set a cover. The path used to be a text box an
 * editor could type into, which made the field two controls that contradicted
 * each other — pick a file *or* write a path, with a rule about which one won
 * that nobody could see. It is a read-only line now: it says where the current
 * image lives, which is worth knowing when it is a seeded asset under
 * /public/images/blog, and it cannot be edited into something that does not
 * resolve.
 *
 * The value still has to reach the action, and a disabled input submits
 * nothing, so it rides along in a hidden field. Without that, every save that
 * did not also upload a new file would post an empty path and blank the cover.
 *
 * Controlled by PostForm rather than holding its own state, because two other
 * things need this value: Preview renders the chosen cover, and the publish
 * gate counts an empty one as missing. `preview` is the object URL of a staged
 * file, owned by the parent so it can be revoked when it is replaced.
 */
export default function ImageField({
  name,
  label,
  value,
  preview,
  fileName,
  onFileChange,
  canEdit,
  required = false,
}: {
  name: string;
  label: string;
  /** Marks the label. The cover is required to publish; the gate agrees. */
  required?: boolean;
  value: string;
  preview: string | null;
  fileName: string | null;
  onFileChange: (file: File | null) => void;
  canEdit: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);

  const cancel = () => {
    if (input.current) input.current.value = '';
    onFileChange(null);
  };

  const shown = preview ?? (value.trim() || null);
  const id = `pf-${name}`;

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={`${id}-file`}>
        {label} {required && <Req />}
      </label>

      <div className={styles.imageField}>
        <span className={styles.imageCover} aria-hidden="true">
          {shown ? (
            <Image
              src={shown}
              alt=""
              width={320}
              height={180}
              style={{ objectFit: 'cover' }}
              /* A blob: URL and a stored path are both things the optimiser
                 either cannot fetch or has no business caching here. */
              unoptimized
            />
          ) : (
            <span className={styles.imageEmpty}>No image</span>
          )}
        </span>

        <span className={styles.photoControls}>
          <input
            id={`${id}-file`}
            ref={input}
            type="file"
            name={`${name}File`}
            accept="image/jpeg,image/png,image/webp"
            disabled={!canEdit}
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />

          {/* The note and the current path share a row: one says what may be
              uploaded, the other says what is there now, and stacked they left
              a field-width of empty space beside each. */}
          <span className={styles.imageMetaRow}>
            {fileName ? (
              <span className={styles.panelNote}>
                <strong>{fileName}</strong> replaces the image when you save.{' '}
                <button type="button" className={styles.linkBtn} onClick={cancel}>
                  Cancel upload
                </button>
              </span>
            ) : (
              <span className={styles.panelNote}>
                JPEG, PNG or WebP, up to 4 MB (1600×900 recommended).
              </span>
            )}

            {/* Display only — no `name`, so it submits nothing. The hidden
                field below is what the action reads. */}
            <input
              className={styles.control}
              id={id}
              value={fileName ? 'Replaced on save' : value || 'None yet — upload one'}
              aria-label={`${label} file`}
              readOnly
              disabled
            />
          </span>
          <input type="hidden" name={name} value={value} />
        </span>
      </div>
    </div>
  );
}
