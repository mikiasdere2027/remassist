import { QUIZ } from '@/lib/quiz/quiz';

/**
 * Presentation helpers for the admin lead views — MIGRATION-PLAN §10.
 *
 * Pure, and kept out of the components so the labelling rules can be tested
 * without rendering React or touching a database. The interesting one is
 * `unknownRawKeys`: it is what stops the admin from quietly hiding a field a
 * form starts sending.
 */

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const SOURCE_LABELS: Record<string, string> = {
  qualify_quiz: 'Fit finder',
  contact_form: 'Contact form',
  ask_widget: 'Ask widget',
  pricing_cta: 'Pricing CTA',
};

/**
 * Raw form field names that a named row on the detail page already shows.
 * Anything outside this set gets surfaced and flagged, so a new form field
 * appears in the admin the day it starts arriving rather than the day someone
 * remembers to add it here.
 */
export const KNOWN_RAW_KEYS = new Set([
  'first_name', 'last_name', 'company', 'phone', 'email',
  'country', 'service', 'message', 'consent',
]);

export function unknownRawKeys(raw: Record<string, string> | null | undefined): string[] {
  if (!raw) return [];
  return Object.keys(raw).filter((k) => !KNOWN_RAW_KEYS.has(k));
}

/** Question text for a quiz answer key, so the admin reads as prose not codes. */
export function questionFor(key: string): string | undefined {
  return QUIZ.find((q) => q.id === key)?.q;
}

/**
 * Answers in the order the quiz asks them.
 *
 * Postgres jsonb does not preserve key order — it normalises by key length then
 * bytewise — so reading Object.entries straight out of the column presents the
 * questions shuffled. Anything not in QUIZ (a retired question on an old
 * submission) is kept and appended rather than dropped.
 */
export function orderedAnswers(
  answers: Record<string, unknown> | null | undefined,
): Array<[string, string]> {
  if (!answers) return [];
  const seen = new Set<string>();
  const out: Array<[string, string]> = [];
  for (const q of QUIZ) {
    if (q.id in answers) {
      out.push([q.id, String(answers[q.id])]);
      seen.add(q.id);
    }
  }
  for (const [k, v] of Object.entries(answers)) {
    if (!seen.has(k)) out.push([k, String(v)]);
  }
  return out;
}

/** The chosen option's label and note, resolved from the stored answer value. */
export function answerFor(key: string, value: string): { label: string; note?: string } {
  const opt = QUIZ.find((q) => q.id === key)?.options.find((o) => o.value === value);
  return opt ? { label: opt.label, note: opt.note } : { label: value };
}

/** Absolute, unambiguous, and stable regardless of where the viewer sits. */
export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

/**
 * RFC 4180 CSV escaping.
 *
 * Not optional here: lead messages routinely contain commas, quotes and hard
 * newlines, and an unescaped one silently shifts every later column in the row.
 */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(',');
}
