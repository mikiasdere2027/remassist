'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import Image from 'next/image';
import { ApiError, isApiError } from '@/lib/api/errors';
import { IMAGE_ACCEPT, uploadImage } from '@/lib/api/upload';
import { teamApi, teamErrorText, type TeamMemberFields } from '@/lib/api/team';
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

/**
 * The member profile form, for both Add and Edit. Posts to the API directly:
 * Add creates a draft (at the position from the order field the Add screen
 * puts beside "Back to members", tied to this form with `form=`) and returns
 * to the list; Edit saves in place and refreshes.
 *
 * The headshot is uploaded the moment it is picked — browser → Cloudinary,
 * signed by the backend (lib/api/upload.ts) — and the resulting URL is saved
 * with the record. Seeded members hold site paths (/images/teams/*.jpg) that
 * the API keeps but will not accept back as input, so `image` is only sent
 * when it actually changed.
 */
export default function MemberForm({
  initialData,
  isEdit = false,
  canEdit = true,
}: {
  initialData?: MemberFormData;
  isEdit?: boolean;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name ?? '');
  const [role, setRole] = useState(initialData?.role ?? '');
  const [initials, setInitials] = useState(initialData?.initials ?? '');
  const [tag, setTag] = useState(initialData?.tag ?? '');
  const [blurb, setBlurb] = useState(initialData?.blurb ?? '');
  const [linkedin, setLinkedin] = useState(initialData?.linkedin ?? '');

  const initialImage = initialData?.image ?? null;
  const [image, setImage] = useState<string | null>(initialImage);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fallback monogram initials to show in preview
  const displayInitials = (initials.trim() || name.split(' ').map((n) => n[0]).join('').slice(0, 3) || 'JZ').toUpperCase();

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      setImage(await uploadImage(file, 'team'));
    } catch (err) {
      setMessage({
        tone: 'err',
        text: isApiError(err, 503)
          ? 'Image uploads aren’t set up on this server yet (Cloudinary).'
          : teamErrorText(err),
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveClick = () => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasPhoto = Boolean(image);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const fields: TeamMemberFields = {
      name: name.trim(),
      role: role.trim(),
      initials: initials.trim(),
      tag: tag.trim(),
      blurb: blurb.trim() || null,
      linkedin: linkedin.trim() || null,
    };
    if (image !== initialImage) fields.image = image;

    setSaving(true);
    setMessage(null);
    setErrors({});
    try {
      if (isEdit && initialData?.id) {
        await teamApi.update(initialData.id, fields);
        setMessage({ tone: 'ok', text: 'Saved.' });
        router.refresh();
        setSaving(false);
      } else {
        const raw = form.get('position');
        const position = raw === null || raw === '' ? undefined : Number(raw);
        await teamApi.create({
          ...fields,
          position: Number.isFinite(position) ? position : undefined,
        });
        router.push('/admin/content/team');
        router.refresh();
      }
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors());
      setMessage({ tone: 'err', text: teamErrorText(err) });
      setSaving(false);
    }
  }

  const err = (k: string) =>
    errors[k] && <span className={styles.fieldErr}>{errors[k]}</span>;

  return (
    /* Named so a control outside the form can still belong to it: the Add
       screen puts the order field up beside "Back to members", where the edit
       screen has its own, and `form=` is how that field is submitted here. */
    <form id="member-form" onSubmit={submit}>
      {message && (
        <p
          className={`${styles.signinMsg} ${message.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
          role={message.tone === 'ok' ? 'status' : 'alert'}
        >
          {message.text}
        </p>
      )}

      {/* Hidden file input controlled by buttons; uploads on pick */}
      <input
        type="file"
        ref={fileInputRef}
        accept={IMAGE_ACCEPT}
        style={{ display: 'none' }}
        disabled={!canEdit || uploading}
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
                  src={image!}
                  alt=""
                  width={130}
                  height={130}
                  className={styles.memberHeadshotImg}
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
                disabled={!canEdit || uploading}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {uploading ? 'Uploading…' : 'Upload photo'}
              </button>

              <button
                type="button"
                className={styles.memberHeadshotBtn}
                onClick={handleRemoveClick}
                disabled={!canEdit || uploading || !image}
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
              {err('image')}
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
              {err('name')}
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
              {err('initials')}
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
              {err('role')}
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
              {err('tag')}
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
            {err('blurb')}

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
              {err('linkedin')}
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
          disabled={!canEdit || saving || uploading}
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add member'}
        </button>
        <span className={styles.memberSubmitNote}>
          {isEdit
            ? 'Saving updates the homepage immediately if the member is live.'
            : 'Added as a draft, so you can check it before it goes live'}
        </span>
      </div>
    </form>
  );
}
