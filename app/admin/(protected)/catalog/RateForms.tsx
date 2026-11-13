'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import {
  CATALOG_PATH,
  type AgentTier,
  type CatalogTable,
  type CoverageOption,
} from '@/lib/api/catalog';
import styles from '../../admin.module.css';

/**
 * The in-row forms on the Rates screen: edit a coverage option, edit a tier,
 * and the deactivate confirm step. Each calls the backend
 * (PATCH …/:key with `confirm: true`, POST …/:key/deactivate), then goes back
 * to the list with a fixed `ok` code and refreshes it. A refusal stays in the
 * row with the typed values, showing the backend's message.
 *
 * The confirm box is `required` in the browser and re-checked by the backend,
 * because a required attribute is a courtesy and not a control.
 */

type Errors = Record<string, string>;

function useRowAction(doneHref: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Errors>({});

  async function run(call: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      await call();
      router.push(`${doneHref}${doneHref.includes('?') ? '&' : '?'}ok=${ok}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors());
      setError(errorText(err));
      setBusy(false);
    }
  }

  return { busy, error, fieldErrors, run };
}

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

export function EditCoverageRow({
  row,
  backHref,
  columns,
}: {
  row: CoverageOption;
  backHref: string;
  columns: number;
}) {
  const { busy, error, fieldErrors, run } = useRowAction(backHref);
  const id = `c-${row.key}`;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(
      () =>
        api.patch(`${CATALOG_PATH.coverage}/${encodeURIComponent(row.key)}`, {
          label: str(f, 'label'),
          longLabel: str(f, 'longLabel'),
          seats: Number(str(f, 'seats')),
          monthlyHours: Number(str(f, 'monthlyHours')),
          confirm: f.get('confirm') === '1',
        }),
      'saved',
    );
  }

  return (
    <tr>
      <td className={styles.editCell} colSpan={columns}>
        <form className={styles.editForm} onSubmit={submit}>
          <Field label="Label" name="label" formId={id} defaultValue={row.label} error={fieldErrors.label} autoFocus />
          <Field
            formId={id}
            label="Long label"
            name="longLabel"
            defaultValue={row.longLabel}
            className={styles.editWide}
            hint="How this reads inside a quote sentence"
            error={fieldErrors.longLabel}
          />
          <Field
            formId={id}
            label="Seats"
            name="seats"
            defaultValue={String(row.seats)}
            type="number"
            min={1}
            max={99}
            className={styles.editNarrow}
            error={fieldErrors.seats}
          />
          <Field
            formId={id}
            label="Monthly hours"
            name="monthlyHours"
            defaultValue={String(row.monthlyHours)}
            type="number"
            min={1}
            max={9999}
            className={styles.editNarrow}
            error={fieldErrors.monthlyHours}
          />
          <Confirm id={id} />
          <RowError message={error} />
          <div className={styles.rowActions} style={{ padding: 0 }}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={busy}>
              Save option
            </button>
            <Link className={styles.rowLink} href={backHref}>
              Cancel
            </Link>
          </div>
        </form>
      </td>
    </tr>
  );
}

export function EditTierRow({
  row,
  backHref,
  columns,
}: {
  row: AgentTier;
  backHref: string;
  columns: number;
}) {
  const { busy, error, fieldErrors, run } = useRowAction(backHref);
  const id = `t-${row.key}`;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(
      () =>
        api.patch(`${CATALOG_PATH.tier}/${encodeURIComponent(row.key)}`, {
          label: str(f, 'label'),
          hourlyRateUsd: str(f, 'hourlyRateUsd'),
          note: str(f, 'note') || null,
          confirm: f.get('confirm') === '1',
        }),
      'saved',
    );
  }

  return (
    <tr>
      <td className={styles.editCell} colSpan={columns}>
        <form className={styles.editForm} onSubmit={submit}>
          <Field
            formId={id}
            label="Tier"
            name="label"
            defaultValue={row.label}
            className={styles.editWide}
            error={fieldErrors.label}
            autoFocus
          />
          <Field
            formId={id}
            label="Hourly rate (USD)"
            name="hourlyRateUsd"
            defaultValue={Number(row.hourlyRateUsd).toFixed(2)}
            type="number"
            min={0.01}
            max={9999}
            step={0.01}
            className={styles.editNarrow}
            error={fieldErrors.hourlyRateUsd}
          />
          <Field
            formId={id}
            label="Note"
            name="note"
            defaultValue={row.note ?? ''}
            className={styles.editWide}
            hint="What this tier buys, in a salesperson's words"
            error={fieldErrors.note}
          />
          <Confirm id={id} />
          <RowError message={error} />
          <div className={styles.rowActions} style={{ padding: 0 }}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={busy}>
              Save tier
            </button>
            <Link className={styles.rowLink} href={backHref}>
              Cancel
            </Link>
          </div>
        </form>
      </td>
    </tr>
  );
}

/**
 * Deactivation asks first, in the row's own place — the one thing on this
 * screen that should not be one click away from the menu that offered it.
 */
export function ConfirmOffRow({
  table,
  rowKey,
  columns,
  backHref,
  what,
  detail,
  verb,
}: {
  table: CatalogTable;
  rowKey: string;
  columns: number;
  backHref: string;
  what: string;
  detail: string;
  verb: string;
}) {
  const { busy, error, run } = useRowAction(backHref);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void run(
      () => api.post(`${CATALOG_PATH[table]}/${encodeURIComponent(rowKey)}/deactivate`),
      'deactivated',
    );
  }

  return (
    <tr>
      <td className={styles.editCell} colSpan={columns}>
        <form className={styles.editForm} onSubmit={submit}>
          <p style={{ margin: 0, flex: '1 1 20rem' }}>
            <strong>{what}</strong>
            <span className={styles.cellSecondary}>{detail}</span>
          </p>
          <RowError message={error} />
          <div className={styles.rowActions} style={{ padding: 0 }}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" autoFocus disabled={busy}>
              {verb}
            </button>
            <Link className={styles.rowLink} href={backHref}>
              Keep it
            </Link>
          </div>
        </form>
      </td>
    </tr>
  );
}

function RowError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className={styles.fieldErr} role="alert" style={{ flex: '1 1 100%', margin: 0 }}>
      {message}
    </p>
  );
}

/** A labelled control, with the hint the field needs and nothing more. */
function Field({
  label,
  name,
  formId,
  defaultValue,
  className = '',
  hint,
  error,
  ...rest
}: {
  label: string;
  name: string;
  /** Which row's form this field belongs to — keeps the id unique. */
  formId: string;
  defaultValue?: string;
  className?: string;
  hint?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `f-${formId}-${name}`;
  return (
    <div className={`${styles.field} ${className}`}>
      <label className={styles.fieldLabel} htmlFor={id}>{label}</label>
      <input className={styles.control} id={id} name={name} defaultValue={defaultValue} {...rest} />
      {error ? (
        <span className={styles.fieldErr} role="alert">{error}</span>
      ) : (
        hint && <span className={styles.panelNote}>{hint}</span>
      )}
    </div>
  );
}

/** The confirmation every price edit asks for once. */
function Confirm({ id }: { id: string }) {
  return (
    <label className={styles.confirmCheck} htmlFor={`ok-${id}`}>
      <input type="checkbox" id={`ok-${id}`} name="confirm" value="1" required />
      <span>
        I know this changes the price list of record, and that this edit is logged
        with my name.
      </span>
    </label>
  );
}

/** The backend's words: each validation issue, or its message. */
function errorText(err: unknown): string {
  if (err instanceof ApiError && err.issues.length) return err.issues.map((i) => i.message).join(' ');
  return err instanceof Error ? err.message : 'Something went wrong.';
}
