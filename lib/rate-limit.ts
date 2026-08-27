/**
 * Rate limiter — MIGRATION-PLAN §9.1.
 *
 * In-memory and per-process, which is the right shape for the target: a single
 * Node instance behind Nginx (§2.2 rules out cluster mode). If the app is ever
 * run multi-process this becomes per-worker and the effective limit multiplies
 * — move it to Postgres or Redis at that point, do not just raise the number.
 *
 * Fixed windows, not a sliding log: a burst can straddle a boundary and get
 * 2x the limit. For "stop one IP hammering the lead form" that is fine, and it
 * keeps the whole thing to a Map with no eviction thread.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Stops the Map growing without bound on a long-running process. */
function sweep(now: number) {
  if (buckets.size < 5_000) return;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

export interface RateLimitOptions {
  limit: number;
  windowSec: number;
  /** Injectable for tests; defaults to wall clock. */
  now?: () => number;
}

/** True when the call is allowed, false when the caller is over its limit. */
export function rateLimit(key: string, { limit, windowSec, now = Date.now }: RateLimitOptions): boolean {
  const t = now();
  sweep(t);
  const b = buckets.get(key);
  if (!b || b.resetAt <= t) {
    buckets.set(key, { count: 1, resetAt: t + windowSec * 1000 });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/** Test seam — drops all state. */
export function resetRateLimits() {
  buckets.clear();
}
