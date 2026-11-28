'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import type { SiteSettings } from '@/lib/site/settings';
import styles from '../../../admin.module.css';

const FIELDS: Array<{ key: keyof SiteSettings; label: string; hint: string; type?: string }> = [
  { key: 'phone', label: 'Phone number', hint: 'As it should read on the site, e.g. (832) 230-2194. The dial link is made from it.' },
  { key: 'email', label: 'Support email', hint: 'Shown in the footer, on pricing and in the legal pages; the "Email us" links use it.', type: 'email' },
  { key: 'bookingUrl', label: 'Booking link', hint: 'Where every "Book a call" button leads (the booking window embeds it). A full https:// link, e.g. your Calendly page.', type: 'url' },
  { key: 'linkedin', label: 'LinkedIn', hint: 'A full https:// link.', type: 'url' },
  { key: 'instagram', label: 'Instagram', hint: 'A full https:// link.', type: 'url' },
  { key: 'youtube', label: 'YouTube', hint: 'A full https:// link.', type: 'url' },
  { key: 'trustpilot', label: 'Trustpilot', hint: 'A full https:// link.', type: 'url' },
  { key: 'google', label: 'Google Business', hint: 'A full https:// link.', type: 'url' },
];

/**
 * The phone, email, booking link and social links the public site shows.
 * Admins only; a change reaches the public pages within moments (no deploy).
 * What was typed stays in the form if the backend refuses a value.
 */
export default function SiteSettingsForm({ initial }: { initial: SiteSettings }) {
  const [values, setValues] = useState<SiteSettings>(initial);
  const [saved, setSaved] = useState<SiteSettings>(initial);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const dirty = FIELDS.some((f) => values[f.key] !== saved[f.key]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    setFieldErrors({});
    try {
      const res = await api.put<SiteSettings>('/admin/site-settings', values);
      const next: SiteSettings = Object.fromEntries(FIELDS.map((f) => [f.key, res[f.key]])) as unknown as SiteSettings;
      setValues(next);
      setSaved(next);
      setMsg({ tone: 'ok', text: 'Saved. The site shows the new details within a moment.' });
    } catch (err) {
      if (isApiError(err)) setFieldErrors(err.fieldErrors());
      setMsg({ tone: 'err', text: isApiError(err) && err.status === 400 ? 'Check the highlighted fields.' : err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form method="post" onSubmit={onSubmit} className={styles.signinForm} noValidate>
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label className={styles.fieldLabel} htmlFor={`site-${f.key}`}>{f.label}</label>
          <input
            id={`site-${f.key}`}
            name={f.key}
            type={f.type ?? 'text'}
            className={styles.signinInput}
            value={values[f.key]}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            aria-invalid={fieldErrors[f.key] ? true : undefined}
            aria-describedby={`site-${f.key}-hint`}
            maxLength={500}
            autoComplete="off"
          />
          <p id={`site-${f.key}-hint`} className={fieldErrors[f.key] ? `${styles.signinMsg} ${styles.msgErr}` : styles.panelSub}>
            {fieldErrors[f.key] ?? f.hint}
          </p>
        </div>
      ))}
      <div>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={pending || !dirty}>
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
      {msg && <p role={msg.tone === 'err' ? 'alert' : 'status'} className={`${styles.signinMsg} ${msg.tone === 'err' ? styles.msgErr : ''}`}>{msg.text}</p>}
    </form>
  );
}
