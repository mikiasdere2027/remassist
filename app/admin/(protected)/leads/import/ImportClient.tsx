'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { IMPORT_FIELDS, applyMapping, guessMapping, parseCsv, type ImportField } from '@/lib/crm/csv';
import { importLeads, type ImportSummary } from './import-leads';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

const MAX_ROWS = 2000;
const MAX_BYTES = 2 * 1024 * 1024;

export default function ImportClient({ team, me }: { team: Array<{ id: string; name: string }>; me: string }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [table, setTable] = useState<string[][] | null>(null);
  const [mapping, setMapping] = useState<Array<ImportField | null>>([]);
  const [ownerId, setOwnerId] = useState(me);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [pending, start] = useTransition();

  const headers = table?.[0] ?? [];
  const dataRows = useMemo(() => table?.slice(1) ?? [], [table]);
  const mapped = useMemo(() => applyMapping(dataRows, mapping), [dataRows, mapping]);
  const hasEmail = mapping.includes('email');
  const withEmail = mapped.filter((r) => r.email).length;

  async function onFile(file: File | undefined) {
    setError(null);
    setResult(null);
    setTable(null);
    if (!file) return;
    if (file.size > MAX_BYTES) return setError('That file is over 2 MB. Split it into smaller files.');
    const rows = parseCsv(await file.text());
    if (rows.length < 2) return setError('The file needs a header row and at least one lead.');
    if (rows.length - 1 > MAX_ROWS) return setError(`The file has ${rows.length - 1} rows; import at most ${MAX_ROWS} at a time.`);
    setFileName(file.name);
    setTable(rows);
    setMapping(guessMapping(rows[0]));
  }

  function runImport() {
    setError(null);
    start(async () => {
      const rows = mapped.map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v)) as Record<string, string>);
      const r = await importLeads({ rows, ownerId: ownerId || undefined }).catch(() => ({ error: 'The import failed. Try again.' }));
      if ('error' in r) setError(r.error);
      else setResult(r);
    });
  }

  if (result) {
    return (
      <div className={s.cardBody}>
        <h3 className={s.cardTitle}>Import finished</h3>
        <ul className={s.checklist}>
          <li><span className={`${s.tick} ${s.tickOk}`} aria-hidden="true">✓</span>{result.created} {result.created === 1 ? 'lead' : 'leads'} added</li>
          <li><span className={s.tick} aria-hidden="true">·</span>{result.duplicates} skipped because the email already exists</li>
          <li><span className={s.tick} aria-hidden="true">·</span>{result.invalidCount} skipped because of a problem</li>
        </ul>
        {result.invalid.length > 0 && (
          <div className={admin.tableWrap}>
            <table className={admin.table}>
              <thead><tr><th scope="col">Row</th><th scope="col">Problem</th></tr></thead>
              <tbody>
                {result.invalid.map((x) => <tr key={x.row}><td>{x.row}</td><td>{x.error}</td></tr>)}
              </tbody>
            </table>
            {result.invalidCount > result.invalid.length && (
              <p className={s.cardNote}>Showing the first {result.invalid.length} of {result.invalidCount}.</p>
            )}
          </div>
        )}
        <div className={s.formFoot}>
          <Link className={`${admin.btn} ${admin.btnPrimary}`} href="/admin/leads?source=import">See imported leads</Link>
          <button type="button" className={`${admin.btn} ${admin.btnGhost}`} onClick={() => { setResult(null); setTable(null); setFileName(null); }}>
            Import another file
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.cardBody}>
      <div style={{ minWidth: 0, maxWidth: '100%' }}>
        <label className={s.label} htmlFor="import-file">CSV file</label>
        {/* File inputs have an intrinsic width; cap it so phones don't scroll sideways. */}
        <input
          id="import-file"
          type="file"
          accept=".csv,text/csv"
          style={{ maxWidth: '100%' }}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <p className={s.cardNote}>
          Export from Excel, Google Sheets or another CRM as CSV. The first row must be the column names.
          Up to {MAX_ROWS} leads, 2 MB.
        </p>
      </div>

      {error && <p className={s.error} role="alert">{error}</p>}

      {table && (
        <>
          <h3 className={s.sectionTitle}>Match the columns · {fileName} · {dataRows.length} rows</h3>
          <div className={admin.tableWrap}>
            <table className={admin.table}>
              <thead>
                <tr><th scope="col">Column in your file</th><th scope="col">Imports as</th><th scope="col">First value</th></tr>
              </thead>
              <tbody>
                {headers.map((h, i) => (
                  <tr key={`${h}-${i}`}>
                    <td>{h || <span className={s.muted}>(no name)</span>}</td>
                    <td>
                      <select
                        aria-label={`Import "${h}" as`}
                        className={s.select}
                        value={mapping[i] ?? ''}
                        onChange={(e) => {
                          const next = [...mapping];
                          const f = (e.target.value || null) as ImportField | null;
                          // One column per field: clear it wherever else it was used.
                          if (f) next.forEach((x, j) => { if (x === f) next[j] = null; });
                          next[i] = f;
                          setMapping(next);
                        }}
                      >
                        <option value="">Don&rsquo;t import</option>
                        {IMPORT_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                      </select>
                    </td>
                    <td className={s.muted}>{dataRows[0]?.[i] ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={s.composerRow}>
            <div>
              <label className={s.label} htmlFor="import-owner">Assign imported leads to</label>
              <select id="import-owner" className={s.select} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                <option value="">Nobody (unassigned)</option>
                {team.map((m) => <option key={m.id} value={m.id}>{m.id === me ? `${m.name} (me)` : m.name}</option>)}
              </select>
            </div>
          </div>

          {!hasEmail ? (
            <p className={s.error} role="alert">Choose which column holds the email address. Email is required for every lead.</p>
          ) : (
            <p className={s.cardNote}>
              {withEmail} of {dataRows.length} rows have an email. Rows without one, and emails already in the CRM,
              will be skipped and listed after the import.
            </p>
          )}

          <div className={s.formFoot}>
            <button type="button" className={`${admin.btn} ${admin.btnPrimary}`} disabled={!hasEmail || pending} onClick={runImport}>
              {pending ? 'Importing…' : `Import ${dataRows.length} rows`}
            </button>
            <Link className={`${admin.btn} ${admin.btnGhost}`} href="/admin/leads">Cancel</Link>
          </div>
        </>
      )}
    </div>
  );
}
