'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { CATALOG_PATH } from '@/lib/api/catalog';
import styles from '../../../admin.module.css';

/**
 * The add form for a coverage option or an agent tier. Posts to the backend
 * and goes back to the matching tab of the list; a refusal (bad key, key
 * taken, bad rate…) stays here with the typed values and the backend's message.
 */
export default function NewRateForm({ kind }: { kind: 'coverage' | 'tier' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? '').trim();
    const body =
      kind === 'coverage'
        ? {
            key: str('key'),
            label: str('label'),
            longLabel: str('longLabel'),
            seats: Number(str('seats')),
            monthlyHours: Number(str('monthlyHours')),
          }
        : {
            key: str('key'),
            label: str('label'),
            hourlyRateUsd: str('hourlyRateUsd'),
            note: str('note') || null,
          };
    setBusy(true);
    setError(null);
    setErrs({});
    try {
      await api.post(CATALOG_PATH[kind], body);
      router.push(kind === 'tier' ? '/admin/catalog?tab=tiers&ok=added' : '/admin/catalog?ok=added');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) setErrs(err.fieldErrors());
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <>
      {error && (
        <p className={`${styles.signinMsg} ${styles.msgErr}`} role="alert">
          {error}
        </p>
      )}
    {kind === 'coverage' ? (
      <form onSubmit={submit}>
        <div className={styles.formGrid2}>
          <Field
            id="k"
            name="key"
            error={errs.key}
            label="Key"
            placeholder="e.g. team-shift"
            pattern="[a-z0-9][a-z0-9\-]*"
            title="Lowercase letters, digits and hyphens — the quote calculator matches on it"
            maxLength={32}
            hint="Permanent — the quote calculator matches on it"
            required
            autoFocus
          />
          <Field
            id="l"
            name="label"
            error={errs.label}
            label="Label"
            placeholder="Part-time"
            maxLength={80}
            required
          />
        </div>

        <Field
          id="ll"
          name="longLabel"
          error={errs.longLabel}
          label="Long label"
          placeholder="How this reads inside a quote sentence"
          maxLength={160}
          hint="Used mid-sentence in a quote, so it reads lowercase"
        />

        <div className={styles.formGrid2}>
          <Field
            id="st"
            name="seats"
            error={errs.seats}
            label="Seats"
            type="number"
            min={1}
            max={99}
            defaultValue={1}
            required
          />
          <Field
            id="mh"
            name="monthlyHours"
            error={errs.monthlyHours}
            label="Monthly hours"
            type="number"
            min={1}
            max={9999}
            defaultValue={160}
            required
          />
        </div>

        <div className={styles.memberSubmitRow}>
          <button className={styles.memberSubmitBtn} type="submit" disabled={busy}>
            Add coverage option
          </button>
          <span className={styles.memberSubmitNote}>
            Quoted immediately, and logged with your name.
          </span>
        </div>
      </form>
    ) : (
      <form onSubmit={submit}>
        <div className={styles.formGrid2}>
          <Field
            id="tk"
            name="key"
            error={errs.key}
            label="Key"
            placeholder="e.g. senior"
            pattern="[a-z0-9][a-z0-9\-]*"
            title="Lowercase letters, digits and hyphens — the quote calculator matches on it"
            maxLength={32}
            hint="Permanent — the quote calculator matches on it"
            required
            autoFocus
          />
          <Field
            id="tl"
            name="label"
            error={errs.label}
            label="Tier"
            placeholder="Senior"
            maxLength={80}
            required
          />
        </div>

        <div className={styles.formGrid2}>
          <Field
            id="tr"
            name="hourlyRateUsd"
            error={errs.hourlyRateUsd}
            label="Hourly rate (USD)"
            type="number"
            min={0.01}
            max={9999}
            step={0.01}
            hint="What one hour at this tier costs"
            required
          />
          <Field
            id="tn"
            name="note"
            error={errs.note}
            label="Note (optional)"
            placeholder="What this tier buys, in a salesperson's words"
            maxLength={160}
          />
        </div>

        <div className={styles.memberSubmitRow}>
          <button className={styles.memberSubmitBtn} type="submit" disabled={busy}>
            Add agent tier
          </button>
          <span className={styles.memberSubmitNote}>
            Live in the quote calculator immediately, and logged with your name.
          </span>
        </div>
      </form>
    )}
    </>
  );
}

/** A labelled field in the card, with the hint or the backend's complaint. */
function Field({
  id,
  label,
  hint,
  error,
  ...rest
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={styles.memberFieldGroup}>
      <label className={styles.memberFieldLabel} htmlFor={id}>{label}</label>
      <input className={styles.memberFieldInput} id={id} {...rest} />
      {error ? (
        <span className={styles.fieldErr} role="alert">{error}</span>
      ) : (
        hint && <span className={styles.memberFieldHelper}>{hint}</span>
      )}
    </div>
  );
}

/** The backend's words: each validation issue, or its message. */
function errorText(err: unknown): string {
  if (err instanceof ApiError && err.issues.length) return err.issues.map((i) => i.message).join(' ');
  return err instanceof Error ? err.message : 'Something went wrong.';
}
