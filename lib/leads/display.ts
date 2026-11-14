import { QUIZ } from '@/lib/quiz/quiz';

/**
 * Presentation helpers for the admin lead views — MIGRATION-PLAN §10.
 *
 * Pure, and kept out of the components so the labelling rules can be tested
 * without rendering React or touching a database. The interesting one is
 * `unknownRawKeys`: it is what stops the admin from quietly hiding a field a
 * form starts sending.
 */

/* The status and source lists live in lib/api/leads.ts (they mirror the backend). */
export const SOURCE_LABELS: Record<string, string> = {
  qualify_quiz: 'Fit finder',
  contact_form: 'Contact form',
  ask_widget: 'Ask widget',
  pricing_cta: 'Pricing CTA',
  voice_agent: 'Voice agent',
  manual: 'Added by team',
  import: 'Imported',
  referral: 'Referral',
  outbound: 'Outbound',
  event: 'Event',
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

/**
 * Campaign attribution as one line, for the context strip.
 *
 * The detail page used to print this column as pretty JSON in its own panel,
 * which is three lines of braces to say two things. On a strip it has to be a
 * single value, so the pairs are joined the way a query string reads —
 * `utm_source=linkedin · utm_campaign=q3` — which is the form whoever set the
 * campaign up actually typed.
 *
 * Returns null rather than an empty string for "nothing recorded", so the
 * caller decides what absence looks like instead of printing a blank.
 */
export function formatUtm(utm: Record<string, string> | null | undefined): string | null {
  if (!utm) return null;
  const pairs = Object.entries(utm)
    /* A key that arrived with an empty value is not attribution, and printing
       `utm_term=` invites somebody to go looking for a term that was never
       set. */
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
    .map(([k, v]) => `${k}=${v}`);
  return pairs.length > 0 ? pairs.join(' · ') : null;
}

/** Absolute, unambiguous, and stable regardless of where the viewer sits. */
export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

/** Short month-day format for compact table cells, e.g. "Sep 04". Uses UTC. */
export function formatDateShort(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' });
}

/** Human-friendly relative time (e.g. "12 min ago", "1 h ago", "1 d ago"). */
export function formatRelativeTime(d: Date | string | null | undefined, now = new Date()): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return 'just now';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 d ago';
  if (diffDays < 30) return `${diffDays} d ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 mo ago';
  if (diffMonths < 12) return `${diffMonths} mo ago`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} y ago`;
}
