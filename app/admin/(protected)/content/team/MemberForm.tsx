'use client';

import { useState, useRef, ChangeEvent } from 'react';
import Image from 'next/image';
import styles from '../../../admin.module.css';

export interface MemberFormData {
  id?: string;
  name?: string;
  role?: string;
  initials?: string;
  tag?: string;
  blurb?: string | null;
  linkedin?: string | null;
  image?: string | null;
}

export default function MemberForm({
  action,
  initialData,
  isEdit = false,
  canEdit = true,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initialData?: MemberFormData;
  isEdit?: boolean;
  canEdit?: boolean;
}) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [role, setRole] = useState(initialData?.role ?? '');
  const [initials, setInitials] = useState(initialData?.initials ?? '');
  const [tag, setTag] = useState(initialData?.tag ?? '');
  const [blurb, setBlurb] = useState(initialData?.blurb ?? '');
  const [linkedin, setLinkedin] = useState(initialData?.linkedin ?? '');

  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fallback monogram initials to show in preview
  const displayInitials = (initials.trim() || name.split(' ').map((n) => n[0]).join('').slice(0, 3) || 'JZ').toUpperCase();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(file));
      setRemoveImage(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveClick = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setRemoveImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasPhoto = Boolean((preview || (initialData?.image && !removeImage)));

  return (
    /* Named so a control outside the form can still belong to it: the Add
       screen puts the order field up beside "Back to members", where the edit
       screen has its own, and `form=` is how that field is submitted here. */
    <form id="member-form" action={action}>
      {initialData?.id && <input type="hidden" name="id" value={initialData.id} />}
      {removeImage && <input type="hidden" name="removeImage" value="1" />}

      {/* Hidden file input controlled by buttons */}
      <input
        type="file"
        ref={fileInputRef}
        name="image"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        disabled={!canEdit}
        onChange={handleFileChange}
      />

      {/* ── Headshot + Name/Role/Initials/Tags ── */}
      <div className={styles.memberFormTopGrid}>
        {/* Left: Headshot */}
        <div className={styles.memberHeadshotBlock}>
          <label className={styles.memberHeadshotLabel}>Headshot</label>
          <div className={styles.memberHeadshotRow}>
            {/* 130x130 Preview Box */}
            <div className={styles.memberHeadshotPreviewBox} aria-hidden="true">
              {hasPhoto ? (
                <Image
                  src={preview ?? initialData!.image!}
                  alt=""
                  width={130}
                  height={130}
                  className={styles.memberHeadshotImg}
                  unoptimized={Boolean(preview)}
                />
              ) : (
                <>
                  <div className={styles.memberHeadshotMonogram}>
                    {displayInitials}
                  </div>
                  <div className={styles.memberHeadshotCameraBadge}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                </>
              )}
            </div>

            {/* Actions: Upload & Remove */}
            <div className={styles.memberHeadshotActions}>
              <button
                type="button"
                className={styles.memberHeadshotBtn}
                onClick={handleUploadClick}
                disabled={!canEdit}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload photo
              </button>

              <button
                type="button"
                className={styles.memberHeadshotBtn}
                onClick={handleRemoveClick}
                disabled={!canEdit || (!preview && !initialData?.image)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Remove
              </button>

              <span
                className={`${styles.memberHeadshotStatusText} ${
                  hasPhoto ? styles.memberHeadshotStatusSet : styles.memberHeadshotStatusNotSet
                }`}
              >
                {hasPhoto ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Photo set
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    Not set
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Right: 2-Column Fields */}
        <div className={styles.memberFieldsTwoCol}>
          {/* Column 1: Name & Initials */}
          <div>
            <div className={styles.memberFieldGroup}>
              <label className={styles.memberFieldLabel} htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className={styles.memberFieldInput}
                placeholder="Enter full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  // Auto-fill initials if not yet touched
                  if (!initials) {
                    const letters = e.target.value
                      .split(' ')
                      .filter(Boolean)
                      .map((p) => p[0])
                      .join('')
                      .slice(0, 3)
                      .toUpperCase();
                    setInitials(letters);
                  }
                }}
                maxLength={120}
                required
                autoFocus={!isEdit}
                readOnly={!canEdit}
              />
            </div>

            <div className={styles.memberFieldGroup}>
              <label className={styles.memberFieldLabel} htmlFor="initials">
                Initials (fallback)
              </label>
              <input
                id="initials"
                name="initials"
                type="text"
                className={styles.memberFieldInput}
                placeholder="e.g. JZ"
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                maxLength={4}
                pattern="[A-Za-z]{1,4}"
                title="Up to four letters"
                required
                readOnly={!canEdit}
              />
            </div>
          </div>

          {/* Column 2: Role & Tags */}
          <div>
            <div className={styles.memberFieldGroup}>
              <label className={styles.memberFieldLabel} htmlFor="role">
                Role
              </label>
              <input
                id="role"
                name="role"
                type="text"
                className={styles.memberFieldInput}
                placeholder="Enter role / job title"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                maxLength={120}
                required
                readOnly={!canEdit}
              />
            </div>

            <div className={styles.memberFieldGroup}>
              <label className={styles.memberFieldLabel} htmlFor="tag">
                Tags (optional)
              </label>
              <input
                id="tag"
                name="tag"
                type="text"
                className={styles.memberFieldInput}
                placeholder="Exec, Tech, Ops..."
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                maxLength={40}
                readOnly={!canEdit}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Additional Info: bio and links in one column, placement beside ── */}
      <div className={styles.memberExtraSection}>
        <div className={styles.memberExtraSectionHead}>
          <h3 className={styles.memberExtraSectionTitle}>Additional info</h3>
          <span className={styles.memberExtraSectionSub}>Bio and social links</span>
        </div>

        <div className={styles.memberExtraTwoCol}>
          {/* Col 1: Blurb */}
          <div className={styles.memberFieldGroup}>
            <label className={styles.memberFieldLabel} htmlFor="blurb">
              Blurb (optional)
            </label>
            <div className={styles.memberTextareaWrap}>
              <textarea
                id="blurb"
                name="blurb"
                className={styles.memberTextarea}
                placeholder="Write a short bio about this member..."
                value={blurb}
                onChange={(e) => setBlurb(e.target.value)}
                maxLength={280}
                rows={4}
                readOnly={!canEdit}
              />
              <span className={styles.memberCharCount}>
                {blurb.length} / 280
              </span>
            </div>
          </div>

          {/* Col 2: LinkedIn */}
          <div className={styles.memberFieldGroup}>
            <label className={styles.memberFieldLabel} htmlFor="linkedin">
              LinkedIn URL (optional)
            </label>
            <input
              id="linkedin"
              name="linkedin"
              type="url"
              className={styles.memberFieldInput}
              placeholder="https://www.linkedin.com/in/..."
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              maxLength={300}
              readOnly={!canEdit}
            />
            <span className={styles.memberFieldHelper}>
              Add their LinkedIn profile link
            </span>
          </div>
        </div>
      </div>

      {/* ── Submit Row ── */}
      <div className={styles.memberSubmitRow}>
        <button
          type="submit"
          className={styles.memberSubmitBtn}
          disabled={!canEdit}
        >
          {isEdit ? 'Save changes' : 'Add member'}
        </button>
        <span className={styles.memberSubmitNote}>
          {isEdit
            ? 'Saving updates the member details immediately.'
            : 'Added as a draft, so you can check it before it goes live'}
        </span>
      </div>
    </form>
  );
}
