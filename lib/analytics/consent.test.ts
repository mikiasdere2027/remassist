import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONSENT_COOKIE, DENY_ALL, GRANT_ALL,
  googleConsentPayload, hasConsent, onConsentChange, readConsent, setConsent,
} from './consent';

/**
 * The suite runs on `environment: 'node'`, and jsdom is not a dependency of
 * this project. A cookie jar is the entire browser surface this module uses,
 * so it is cheaper to model it than to pull in a DOM — and it keeps the
 * document.cookie set-one-read-all asymmetry explicit, which is the part of
 * the API that actually catches people out.
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

beforeEach(() => {
  jar.clear();
  Object.assign(globalThis, {
    document: fakeDocument,
    location: { protocol: 'http:' },
    window: globalThis,
  });
  (globalThis as { dataLayer?: unknown[] }).dataLayer = [];
});

describe('consent state', () => {
  it('is undecided until asked — absence of a decision is not consent', () => {
    expect(readConsent()).toBeNull();
    expect(hasConsent('analytics')).toBe(false);
    expect(hasConsent('marketing')).toBe(false);
  });

  it('records a grant and reads it back', () => {
    setConsent(GRANT_ALL);
    expect(readConsent()).toEqual(GRANT_ALL);
    expect(hasConsent('marketing')).toBe(true);
  });

  /* A refusal is a decision. It must persist, or the banner nags forever and
     the visitor is worn down into accepting — which is not free consent. */
  it('records a refusal as a decision, not as absence', () => {
    setConsent(DENY_ALL);
    expect(readConsent()).toEqual(DENY_ALL);
    expect(hasConsent('analytics')).toBe(false);
  });

  it('allows the two categories to differ', () => {
    setConsent({ analytics: true, marketing: false });
    expect(hasConsent('analytics')).toBe(true);
    expect(hasConsent('marketing')).toBe(false);
  });

  it('ignores a record written under an older consent version', () => {
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
      JSON.stringify({ v: 0, analytics: true, marketing: true }),
    )}; Path=/`;
    expect(readConsent()).toBeNull();
  });

  it('treats a corrupt cookie as undecided rather than throwing', () => {
    document.cookie = `${CONSENT_COOKIE}=not-json; Path=/`;
    expect(readConsent()).toBeNull();
  });

  it('notifies subscribers, and stops after unsubscribe', () => {
    const seen: unknown[] = [];
    const off = onConsentChange((s) => seen.push(s));
    setConsent(GRANT_ALL);
    off();
    setConsent(DENY_ALL);
    expect(seen).toEqual([GRANT_ALL]);
  });
});

describe('Google Consent Mode mapping', () => {
  it('maps marketing onto all three ad signals', () => {
    expect(googleConsentPayload(GRANT_ALL)).toEqual({
      ad_storage: 'granted', ad_user_data: 'granted',
      ad_personalization: 'granted', analytics_storage: 'granted',
    });
  });

  it('denies everything when nothing is granted', () => {
    expect(googleConsentPayload(DENY_ALL)).toEqual({
      ad_storage: 'denied', ad_user_data: 'denied',
      ad_personalization: 'denied', analytics_storage: 'denied',
    });
  });

  /* Consent Mode only recognises a real Arguments object. An object literal
     with 0/1/2 keys looks the same when logged and is silently ignored, which
     is exactly the kind of failure nobody notices until an audit. */
  it('pushes an Arguments object to the dataLayer, not an object literal', () => {
    setConsent(GRANT_ALL);
    const pushed = (globalThis as { dataLayer?: unknown[] }).dataLayer?.at(-1);
    expect(Object.prototype.toString.call(pushed)).toBe('[object Arguments]');
    expect(Array.from(pushed as unknown as ArrayLike<unknown>)).toEqual([
      'consent', 'update', googleConsentPayload(GRANT_ALL),
    ]);
  });
});

describe('consentMode off', () => {
  it('grants everything without a banner when explicitly disabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_CONSENT_MODE', 'off');
    vi.resetModules();
    const mod = await import('./consent');
    expect(mod.readConsent()).toEqual(GRANT_ALL);
    expect(mod.hasConsent('marketing')).toBe(true);
    vi.unstubAllEnvs();
  });
});
