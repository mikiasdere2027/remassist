/**
 * Ask RemAssist — matching engine.
 *
 * Scores a user message against the knowledge base and returns the best entry
 * (with runner-up "alts" chips), plus an out-of-scope guard for trades we do not
 * perform. Ported from the RemAssist-Html/assets/ask-remassist.js scoring, in TypeScript
 * so it is unit-testable and shared by any surface that needs an answer.
 */
import { KB, OUTSIDE, type KbEntry } from './kb';

type K = KbEntry;

/* Normalisation: lowercase, keep letters/digits/$ as word characters, collapse
 * whitespace (a word boundary either side lets us match phrases exactly). */
function norm(s: string): string {
  return (' ' + s.toLowerCase().replace(/[^a-z0-9$]+/g, ' ') + ' ').replace(/\s+/g, ' ');
}

/* Cheap edit-distance-of-1: enough for "pricin"/"serivces", nothing more.
   Ignores short words so a single "to" can't collide with a long keyword. */
function near(a: string, b: string): boolean {
  if (a === b) return true;
  if (b.length >= 4 && (a === b + 's' || b === a + 's')) return true;
  if (b.length < 5) return false;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    edits = 0;
  while (i < a.length && j < b.length) {
    if (a.charAt(i) === b.charAt(j)) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function score(text: string, kws: string[]): number {
  const n = norm(text);
  const toks = n.trim().split(' ').filter(Boolean);
  let total = 0;
  for (const raw of kws) {
    const k = norm(raw).trim();
    if (!k) continue;
    if (k.indexOf(' ') >= 0) {
      if (n.indexOf(' ' + k + ' ') >= 0) total += 4 + k.split(' ').length;
      continue;
    }
    if (n.indexOf(' ' + k + ' ') >= 0) {
      total += 3;
      continue;
    }
    for (const t of toks) {
      if (near(t, k)) {
        total += 2;
        break;
      }
    }
  }
  return total;
}

const MIN_SCORE = 2;

/* Runs ahead of match(): returns the trade label if the visitor is asking for
 * work we do not perform, else null. Longest phrase wins. */
export function outsideScope(text: string): string | null {
  const n = norm(text);
  let best: string | null = null;
  let bestLen = 0;
  for (const item of OUTSIDE) {
    for (const raw of item.kw) {
      const k = norm(raw).trim();
      if (!k || n.indexOf(' ' + k + ' ') < 0) continue;
      if (k.length > bestLen) {
        bestLen = k.length;
        best = item.label;
      }
    }
  }
  return best;
}

export interface Match {
  entry: K;
  alts: K[]; // runner-up entries offered as chips
}

/* Returns best entry + runner-ups. If nothing scores, falls back to the generic
 * `services` entry and marks that we're not confident (via alts). */
export function match(text: string): Match {
  const ranked: { entry: K; score: number }[] = [];
  for (const entry of KB) {
    const s = score(text, entry.kw);
    if (s >= MIN_SCORE) ranked.push({ entry, score: s });
  }
  ranked.sort((a, b) => b.score - a.score);

  if (!ranked.length) {
    // No confident hit — fall back to the services overview as a safe default.
    const svc = KB.find((e) => e.id === 'services');
    return { entry: svc ?? KB[0], alts: [] };
  }

  const [best, ...rest] = ranked;
  const alts = rest.slice(0, 3).map((r) => r.entry);
  return { entry: best.entry, alts };
}

/* Shown when nothing scores a confident hit. Kept here so the widget can render
 * a friendly "I didn't catch that" instead of guessing. */
export const NO_MATCH_ENTRY: K = {
  id: '__unknown',
  kw: [],
  title: 'I did not quite catch that',
  text: [
    'Try one of the topics below, or ask about a specific service.',
    'I can help with pricing, onboarding, security, and all 12 service lines.',
  ],
  chips: ['services', 'pricing', 'how_it_works', 'book'],
};