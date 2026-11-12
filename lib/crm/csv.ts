/**
 * CSV for lead import. RFC 4180: quoted fields, "" inside quotes, CRLF or LF,
 * a leading byte-order mark (Excel adds one), and comma or semicolon
 * delimiters (European Excel exports use semicolons). Pure, so it is tested
 * and runs in the browser before anything is sent.
 */

export function detectDelimiter(text: string): ',' | ';' | '\t' {
  const firstLine = text.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? '';
  const count = (c: string) => firstLine.split(c).length - 1;
  const best = ([',', ';', '\t'] as const).reduce((a, b) => (count(b) > count(a) ? b : a));
  return count(best) > 0 ? best : ',';
}

export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field === '') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop blank lines (a trailing newline, or empty rows in the middle).
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

/** The lead fields a column can map to. */
export const IMPORT_FIELDS = [
  { key: 'fullName', label: 'Full name' },
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'country', label: 'Country' },
  { key: 'serviceInterest', label: 'Service interest' },
  { key: 'message', label: 'Notes / message' },
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number]['key'];

const SYNONYMS: Record<ImportField, string[]> = {
  fullName: ['name', 'full name', 'fullname', 'contact', 'contact name', 'lead name'],
  firstName: ['first name', 'firstname', 'first', 'given name', 'forename'],
  lastName: ['last name', 'lastname', 'last', 'surname', 'family name'],
  email: ['email', 'e mail', 'email address', 'e mail address', 'mail', 'work email'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'telephone', 'tel', 'cell', 'whatsapp'],
  company: ['company', 'company name', 'organization', 'organisation', 'business', 'account'],
  country: ['country', 'location', 'region'],
  serviceInterest: ['service', 'service interest', 'interest', 'services', 'product'],
  message: ['message', 'notes', 'note', 'comments', 'comment', 'description', 'details'],
};

const norm = (h: string) => h.toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Best guess at what each header means; null = ignore. Each field is used once. */
export function guessMapping(headers: string[]): Array<ImportField | null> {
  const used = new Set<ImportField>();
  return headers.map((h) => {
    const n = norm(h);
    const hit = (Object.keys(SYNONYMS) as ImportField[]).find((f) => !used.has(f) && SYNONYMS[f].includes(n));
    if (hit) used.add(hit);
    return hit ?? null;
  });
}

export type MappedRow = Partial<Record<ImportField, string>>;

/** Apply a mapping to data rows. A full name fills first/last when those are absent. */
export function applyMapping(rows: string[][], mapping: Array<ImportField | null>): MappedRow[] {
  return rows.map((r) => {
    const out: MappedRow = {};
    mapping.forEach((f, i) => {
      const v = (r[i] ?? '').trim();
      if (f && v && !out[f]) out[f] = v;
    });
    if (out.fullName && !out.firstName && !out.lastName) {
      const parts = out.fullName.split(/\s+/);
      out.firstName = parts[0];
      if (parts.length > 1) out.lastName = parts.slice(1).join(' ');
    }
    delete out.fullName;
    return out;
  });
}
