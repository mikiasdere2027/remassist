/**
 * Report maths. Pure and unit-tested; the queries feeding them are in
 * reportsData.ts. Every figure here can be traced back to rows: nothing is
 * estimated or padded.
 */

export const RANGES = [
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: '90', label: 'Last 90 days', days: 90 },
  { key: '365', label: 'Last 12 months', days: 365 },
  { key: 'all', label: 'All time', days: null },
] as const;
export type RangeKey = (typeof RANGES)[number]['key'];

export function rangeFor(key: string | undefined): (typeof RANGES)[number] {
  return RANGES.find((r) => r.key === key) ?? RANGES[1];
}

/** Start of the range (inclusive), or null for all time. */
export function rangeStart(key: string | undefined, now = new Date()): Date | null {
  const r = rangeFor(key);
  return r.days === null ? null : new Date(now.getTime() - r.days * 86_400_000);
}

/** Percentage 0–100 rounded to one decimal; null when there is nothing to divide by. */
export function pct(part: number, whole: number): number | null {
  if (!whole) return null;
  return Math.round((part / whole) * 1000) / 10;
}

export function fmtPct(p: number | null): string {
  return p === null ? '—' : `${p}%`;
}

/** Change between two periods, as a signed percentage; null when the earlier one is 0. */
export function change(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const v = [...values].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Nearest-rank percentile (p in 0–100). */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const v = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * v.length));
  return v[Math.min(rank, v.length) - 1];
}

export interface FunnelStep { key: string; label: string; count: number }

/** Each step's share of the first step and of the step before it. */
export function funnel(steps: FunnelStep[]) {
  const top = steps[0]?.count ?? 0;
  return steps.map((s, i) => ({
    ...s,
    ofTop: pct(s.count, top),
    ofPrev: i === 0 ? null : pct(s.count, steps[i - 1].count),
  }));
}

/**
 * Time spent in each stage, from a deal's stage changes. A deal enters its
 * first stage when it is created; each change closes the previous stage.
 * The current stage of an open deal counts up to `now`.
 */
export interface StageChange { dealId: string; at: Date; toStage: string }
export interface DealStart { dealId: string; createdAt: Date; firstStage: string; closed: boolean }

export function stageDurations(deals: DealStart[], changes: StageChange[], now = new Date()): Map<string, number[]> {
  const byDeal = new Map<string, StageChange[]>();
  for (const c of changes) {
    const list = byDeal.get(c.dealId) ?? [];
    list.push(c);
    byDeal.set(c.dealId, list);
  }
  const out = new Map<string, number[]>();
  const add = (stage: string, ms: number) => {
    if (ms < 0) return;
    const list = out.get(stage) ?? [];
    list.push(ms / 86_400_000);
    out.set(stage, list);
  };
  for (const d of deals) {
    const list = (byDeal.get(d.dealId) ?? []).sort((a, b) => a.at.getTime() - b.at.getTime());
    let stage = d.firstStage, since = d.createdAt;
    for (const c of list) {
      add(stage, c.at.getTime() - since.getTime());
      stage = c.toStage;
      since = c.at;
    }
    if (!d.closed) add(stage, now.getTime() - since.getTime());
  }
  return out;
}

/** Days rendered as "2.5 days" / "4 hours". */
export function fmtDays(days: number | null): string {
  if (days === null) return '—';
  if (days < 1) return `${Math.max(1, Math.round(days * 24))} h`;
  return `${Math.round(days * 10) / 10} d`;
}

export function fmtHours(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours * 10) / 10} h`;
  return `${Math.round((hours / 24) * 10) / 10} d`;
}

/**
 * The leads-by-day calendar: whole weeks (Monday first) ending with the week
 * of `today`, each day with its count and a 0–4 intensity level.
 */
export function heatmap(counts: Map<string, number>, today: string, weeks = 12) {
  const [y, m, d] = today.split('-').map(Number);
  const end = Date.UTC(y, m - 1, d);
  const dow = (new Date(end).getUTCDay() + 6) % 7;                 // 0 = Monday
  const start = end - (dow + (weeks - 1) * 7) * 86_400_000;
  const max = Math.max(0, ...counts.values());
  const cells: Array<{ day: string; n: number; level: number; future: boolean }> = [];
  for (let t = start; t < start + weeks * 7 * 86_400_000; t += 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10);
    const n = counts.get(day) ?? 0;
    cells.push({ day, n, level: n === 0 || max === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)), future: t > end });
  }
  const busiest = [...counts.entries()].filter(([k]) => k >= cells[0].day && k <= today).sort((a, b) => b[1] - a[1])[0];
  return { cells, max, busiest: busiest && busiest[1] > 0 ? { day: busiest[0], n: busiest[1] } : null };
}

/** RFC 4180 CSV, with spreadsheet-formula injection neutralised. */
export function toCsv(header: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const cell = (v: string | number | null | undefined) => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?%?$/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
