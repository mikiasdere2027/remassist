'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from '../../../admin.module.css';

/**
 * The headshot picker on the Team new/edit forms.
 *
 * A client component for one narrow reason: the preview has to swap to the new
 * file the instant it is chosen, which needs local state. Everything else stays
 * a plain server-rendered `<form action={serverAction}>` — the file input's
 * name is just `image`, and the server action reads it as a File.
 *
 * The "Remove photo" checkbox short-circuits the file input in the action
 * (removeImage wins), which is why this component disables the checkbox when
 * there is nothing to remove. The initials shown in the placeholder come from
 * the form's initials field, live, so the fallback always matches what the
 * editor would see on the card.
 */
export default function PhotoField({
  image,
  initials,
  canEdit,
}: {
  image: string | null;
  initials: string;
  canEdit: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);

  const show = (source: string | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(source);
  };

  return (
    <div className={styles.photoField}>
      <span className={styles.photoPreview} aria-hidden="true">
        {preview || (image && !remove) ? (
          <Image
            src={preview ?? image!}
            alt=""
            width={96}
            height={96}
            style={{ objectFit: 'cover' }}
            unoptimized={Boolean(preview)}
          />
        ) : (
          initials
        )}
      </span>
      <span className={styles.photoControls}>
        <label className={styles.fieldLabel} htmlFor="team-photo">
          Headshot
        </label>
        <input
          id="team-photo"
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          disabled={!canEdit || remove}
          onChange={(e) => {
            const f = e.target.files?.[0];
            show(f ? URL.createObjectURL(f) : null);
          }}
        />
        {image && canEdit && (
          <label className={styles.checkRow} style={{ marginTop: 2 }}>
            <input
              type="checkbox"
              name="removeImage"
              value="1"
              checked={remove}
              onChange={(e) => {
                setRemove(e.target.checked);
                if (e.target.checked) show(null);
              }}
            />
            Remove photo
          </label>
        )}
        {!image && (
          <span className={styles.panelNote}>
            No photo — the card shows the initials monogram.
          </span>
        )}
      </span>
    </div>
  );
}