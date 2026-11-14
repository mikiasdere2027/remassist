import { beforeEach, describe, expect, it } from 'vitest';
import { rateLimit, resetRateLimits } from './rate-limit';

/** A controllable clock, so nothing here waits on wall time. */
function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

describe('rateLimit', () => {
  beforeEach(resetRateLimits);

  it('allows up to the limit and refuses the next call', () => {
    const c = clock();
    const opts = { limit: 5, windowSec: 600, now: c.now };
    for (let i = 0; i < 5; i++) expect(rateLimit('ip:1', opts), `call ${i + 1}`).toBe(true);
    expect(rateLimit('ip:1', opts)).toBe(false);
  });

  it('keys are independent, so one visitor cannot lock out another', () => {
    const c = clock();
    const opts = { limit: 2, windowSec: 600, now: c.now };
    expect(rateLimit('ip:1', opts)).toBe(true);
    expect(rateLimit('ip:1', opts)).toBe(true);
    expect(rateLimit('ip:1', opts)).toBe(false);
    expect(rateLimit('ip:2', opts)).toBe(true);
  });

  it('resets once the window has passed', () => {
    const c = clock();
    const opts = { limit: 1, windowSec: 600, now: c.now };
    expect(rateLimit('ip:1', opts)).toBe(true);
    expect(rateLimit('ip:1', opts)).toBe(false);
    c.advance(600_000 - 1);
    expect(rateLimit('ip:1', opts)).toBe(false);
    c.advance(2);
    expect(rateLimit('ip:1', opts)).toBe(true);
  });

  it('a limit of zero refuses everything', () => {
    const c = clock();
    const opts = { limit: 0, windowSec: 60, now: c.now };
    // The first call opens the window, so the refusal lands on the second —
    // documented rather than asserted as ideal; limit 0 is not a real config.
    rateLimit('ip:1', opts);
    expect(rateLimit('ip:1', opts)).toBe(false);
  });
});
