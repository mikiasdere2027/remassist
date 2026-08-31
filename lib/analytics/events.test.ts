import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GRANT_ALL, DENY_ALL, setConsent } from './consent';
import { analyticsEnabled, track } from './events';

/**
 * The gate is the whole point of this module. Every branch below is a way the
 * site has already been able to leak measurement into the wrong place — or,
 * in the case of NEXT_PUBLIC_ANALYTICS_ENV, to collect nothing at all on the
 * one host that matters while reporting a clean deploy.
 *
 * Same node-environment cookie jar as consent.test.ts: `setConsent` writes a
 * real cookie string, and this models just enough document to read it back.
 */
const jar = new Map<string, string>();

const fakeDocument = {
  get cookie(): string {
    return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  },
  set cookie(str: string) {
    const [pair, ...attrs] = str.split('; ');
    const eq = pair.indexOf('=');
    const key = pair.slice(0, eq);
    if (attrs.some((a) => /^max-age=0$/i.test(a.trim()))) jar.delete(key);
    else jar.set(key, pair.slice(eq + 1));
  },
};

function dataLayer(): Record<string, unknown>[] {
  return (globalThis as { dataLayer?: Record<string, unknown>[] }).dataLayer ?? [];
}

/** Only the custom events — `setConsent` pushes its own `consent update`. */
function events(): unknown[] {
  return dataLayer().filter((e) => typeof e.event === 'string');
}

beforeEach(() => {
  jar.clear();
  Object.assign(globalThis, {
    document: fakeDocument,
    location: { protocol: 'http:' },
    window: globalThis,
  });
  (globalThis as { dataLayer?: unknown[] }).dataLayer = [];

  // The everything-permits baseline; each test below removes one thing.
  vi.stubEnv('NEXT_PUBLIC_GTM_ID', 'GTM-TESTONLY');
  vi.stubEnv('NEXT_PUBLIC_ANALYTICS_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', '');
  setConsent(GRANT_ALL);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('the emit gate', () => {
  it('permits an event when the container, the environment and consent all agree', () => {
    expect(analyticsEnabled()).toBe(true);
    track('book_click', { placement: 'header' });
    expect(events()).toEqual([{ event: 'book_click', placement: 'header' }]);
  });

  it('is silent with no container — an unset GTM id must not half-load anything', () => {
    vi.stubEnv('NEXT_PUBLIC_GTM_ID', '');
    expect(analyticsEnabled()).toBe(false);
    track('chat_open', { placement: 'launcher' });
    expect(events()).toEqual([]);
  });

  /* The bug this replaced: the gate tested NEXT_PUBLIC_VERCEL_ENV, which the
     Hostinger VPS never sets, so production — the only host serving
     remassistance.com — silently emitted nothing. */
  it('is silent unless the production flag is set explicitly, on any host', () => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_ENV', '');
    expect(analyticsEnabled()).toBe(false);
    track('video_play', { video_id: 'kalkidan' });
    expect(events()).toEqual([]);
  });

  it('is silent on a Vercel preview even when the production flag is set', () => {
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'preview');
    expect(analyticsEnabled()).toBe(false);
    track('generate_lead', { lead_source: 'qualify_quiz', has_quiz: true });
    expect(events()).toEqual([]);
  });

  it('is silent without analytics consent, whatever the container is configured to do', () => {
    setConsent(DENY_ALL);
    expect(analyticsEnabled()).toBe(false);
    track('quiz_start', { quiz_id: 'fit_finder' });
    expect(events()).toEqual([]);
  });

  it('is silent while the visitor has not decided — absence of a no is not a yes', () => {
    jar.clear();
    expect(analyticsEnabled()).toBe(false);
    track('quiz_start', { quiz_id: 'qualify' });
    expect(events()).toEqual([]);
  });
});

describe('the payload', () => {
  it('flattens params beside the event name, which is the shape GTM triggers on', () => {
    track('quiz_complete', { quiz_id: 'qualify', service: 'back', seats: 3 });
    expect(events()).toEqual([
      { event: 'quiz_complete', quiz_id: 'qualify', service: 'back', seats: 3 },
    ]);
  });

  it('creates dataLayer when GTM has not loaded yet, so early events are not lost', () => {
    delete (globalThis as { dataLayer?: unknown[] }).dataLayer;
    track('book_click', { placement: 'home_hero' });
    expect(events()).toEqual([{ event: 'book_click', placement: 'home_hero' }]);
  });

  it('appends rather than replacing, so a queued event survives the next one', () => {
    track('book_click', { placement: 'header' });
    track('chat_open', { placement: 'launcher' });
    expect(events()).toHaveLength(2);
  });
});
