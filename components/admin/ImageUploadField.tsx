'use client';

import Image from 'next/image';
import { useId, useRef, useState } from 'react';
import { isApiError } from '@/lib/api/errors';
import { IMAGE_ACCEPT, uploadImage, type UploadKind } from '@/lib/api/upload';
import styles from '@/app/admin/admin.module.css';

/**
 * One image field for every admin form (team photo, post cover, author avatar,
 * popup art). Picking a file uploads it straight to Cloudinary and hands the
 * resulting URL to `onChange`; the form saves that URL with the record.
 *
 * Controlled: `value` is the current URL ('' or null for none). Site paths
 * like /images/teams/x.jpg (seeded content) display as-is.
 */
export default function ImageUploadField({
  label,
  value,
  onChange,
  kind,
  canEdit = true,
  required = false,
  allowRemove = true,
  hint,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  kind: UploadKind;
  canEdit?: boolean;
  required?: boolean;
  allowRemove?: boolean;
  hint?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = value?.trim() || null;

  async function onPick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadImage(file, kind));
    } catch (err) {
      setError(
        isApiError(err, 503)
          ? 'Image uploads aren’t set up on this server yet (Cloudinary).'
          : err instanceof Error
            ? err.message
            : 'The upload failed.',
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={`${id}-file`}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {current && (
        <div style={{ position: 'relative', width: 160, height: 120, borderRadius: 8, overflow: 'hidden', background: '#f2f4f8' }}>
          <Image src={current} alt="" fill sizes="160px" style={{ objectFit: 'cover' }} unoptimized={current.startsWith('blob:')} />
        </div>
      )}
      {canEdit && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', minWidth: 0, maxWidth: '100%' }}>
          <input
            ref={input}
            id={`${id}-file`}
            type="file"
            accept={IMAGE_ACCEPT}
            style={{ maxWidth: '100%', minWidth: 0 }}
            disabled={busy}
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          {busy && <span className={styles.fieldHint}>Uploading…</span>}
          {current && allowRemove && !busy && (
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => onChange(null)}>
              Remove image
            </button>
          )}
        </div>
      )}
      {error ? (
        <p className={styles.fieldErr} role="alert">{error}</p>
      ) : hint ? (
        <p className={styles.fieldHint}>{hint}</p>
      ) : null}
    </div>
  );
}
