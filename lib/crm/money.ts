/**
 * Deal money. Everything is integer cents — never floating-point dollars —
 * so totals add up exactly. Pure, so it is unit-tested.
 */

/** "$6,400", "$6,400.50"; whole dollars drop the cents. */
export function formatMoney(cents: number | null | undefined, currency = 'USD'): string {
  const c = Number.isFinite(cents) ? Number(cents) : 0;
  const whole = c % 100 === 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(c / 100);
}

/** "$184k", "$1.2M" for column totals; exact below $10,000. */
export function formatMoneyShort(cents: number, currency = 'USD'): string {
  const d = cents / 100;
  if (Math.abs(d) < 10_000) return formatMoney(Math.round(d) * 100, currency);
  const sym = currency === 'USD' ? '$' : `${currency} `;
  if (Math.abs(d) < 1_000_000) return `${sym}${Math.round(d / 1000)}k`;
  return `${sym}${(d / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

/** "12.50" or "12" → 1250. Null for blank or invalid. */
export function parseMoneyToCents(input: string | null | undefined): number | null {
  const t = (input ?? '').replace(/[,$\s]/g, '');
  if (!t) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [w, f = ''] = t.split('.');
  return Number(w) * 100 + Number(f.padEnd(2, '0'));
}

/**
 * Monthly recurring value: hours per month × hourly rate when both are known
 * (how the fit finder quotes), otherwise the amount entered directly.
 */
export function monthlyValueCents(hoursPerMonth: number | null, rateCents: number | null, enteredCents: number | null): number {
  if (hoursPerMonth && rateCents) return Math.round(hoursPerMonth * rateCents);
  return Math.max(0, enteredCents ?? 0);
}

export function effectiveProbability(dealProbability: number | null | undefined, stageProbability: number): number {
  const p = dealProbability ?? stageProbability;
  return Math.max(0, Math.min(100, Math.round(p)));
}

/** Monthly value weighted by win probability, in cents. */
export function weightedCents(valueCents: number, probability: number): number {
  return Math.round((valueCents * probability) / 100);
}
