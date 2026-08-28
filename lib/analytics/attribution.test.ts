import { beforeEach, describe, expect, it } from 'vitest';
import { readTouch, mergeAttribution } from './attribution';

const SELF = 'https://remassist.vercel.app';

describe('readTouch', () => {
  it('records the campaign parameters on the landing URL', () => {
    const t = readTouch(`${SELF}/?utm_source=google&utm_medium=cpc&utm_campaign=spring`, undefined);
    expect(t).toMatchObject({
      utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'spring',
      landing_page: `${SELF}/`,
    });
  });

  it('records click identifiers, which are what ad platforms reconcile on', () => {
    const t = readTouch(`${SELF}/pricing?gclid=abc123`, undefined);
    expect(t?.gclid).toBe('abc123');
  });

  /* The defect this whole module exists to prevent. */
  it('returns nothing for a direct visit, so it cannot clobber an earlier touch', () => {
    expect(readTouch(`${SELF}/pricing`, undefined)).toBeNull();
  });

  it('treats internal navigation as no touch at all', () => {
    expect(readTouch(`${SELF}/pricing`, `${SELF}/services/managed-it`)).toBeNull();
  });

  it('treats an external referrer as a touch, so organic and referral are attributed', () => {
    const t = readTouch(`${SELF}/pricing`, 'https://www.google.com/');
    expect(t).not.toBeNull();
    expect(t?.referrer).toBe('https://www.google.com/');
  });

  it('does not record a referrer field for a self-referral that also carries a campaign', () => {
    const t = readTouch(`${SELF}/?utm_source=news`, `${SELF}/blog`);
    expect(t?.utm_source).toBe('news');
    expect(t?.referrer).toBeUndefined();
  });

  it('caps values so a crafted URL cannot write an unbounded string', () => {
    const t = readTouch(`${SELF}/?utm_campaign=${'x'.repeat(500)}`, undefined);
    expect(t?.utm_campaign).toHaveLength(200);
  });

  it('survives a malformed URL rather than throwing on page load', () => {
    expect(readTouch('not-a-url', undefined)).toBeNull();
  });

  it('strips the query from landing_page, which is a page not a URL', () => {
    const t = readTouch(`${SELF}/pricing?utm_source=x&secret=shh`, undefined);
    expect(t?.landing_page).toBe(`${SELF}/pricing`);
  });
});

describe('mergeAttribution', () => {
  it('is undefined when there is nothing at all to record', () => {
    expect(mergeAttribution(undefined, undefined)).toBeUndefined();
  });

  it('keeps the bare utm_ keys readable, so existing consumers are unaffected', () => {
    const merged = mergeAttribution({ utm_source: 'page' }, undefined);
    expect(merged).toEqual({ utm_source: 'page' });
  });

  it('prefixes first touch and leaves last touch bare', () => {
    const merged = mergeAttribution(undefined, {
      first: { utm_source: 'google' },
      last: { utm_source: 'linkedin' },
    });
    expect(merged).toEqual({ utm_source: 'linkedin', first_utm_source: 'google' });
  });

  /* The cookie was written on arrival at a campaign URL; the page query may
     just have been carried along by a share or a copy-paste. */
  it('lets a recorded last touch override the submitting page query', () => {
    const merged = mergeAttribution({ utm_source: 'stale' }, { last: { utm_source: 'real' } });
    expect(merged?.utm_source).toBe('real');
  });

  it('still records first touch when the visitor converted on a direct visit', () => {
    const merged = mergeAttribution(undefined, { first: { utm_campaign: 'spring' } });
    expect(merged).toEqual({ first_utm_campaign: 'spring' });
  });
});


/**
 * The consent gate, and the part of it that is easy to get wrong: a visitor
 * who lands on a campaign URL, refuses to decide, browses on, and only then
 * accepts. Recomputing the touch at that moment would read a URL with no
 * campaign on it and quietly attribute the lead to nothing.
 *
 * The browser confirms the gate itself (no cookie is written before consent);
 * this covers the timing, which is fiddly to drive through a real page.
 */
const jar = new Map<string, string>();
const fakeDocument = {
  referrer: '',
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

function visit(href: string) {
  Object.assign(globalThis, {
    document: fakeDocument,
    location: { href, protocol: 'http:' },
    window: globalThis,
  });
}

describe('consent gating', () => {
  beforeEach(() => {
    jar.clear();
    visit(`${SELF}/?utm_source=google&utm_campaign=spring`);
  });

  it('writes nothing while the visitor has not consented', async () => {
    const { captureTouch } = await import('./attribution');
    captureTouch();
    expect(document.cookie).not.toContain('ra_attr');
  });

  it('sends nothing to the server without consent', async () => {
    const { captureTouch, attributionForSubmit } = await import('./attribution');
    captureTouch();
    expect(attributionForSubmit()).toBeUndefined();
  });

  it('still attributes the campaign when consent arrives two pages later', async () => {
    const { captureTouch, persistPendingTouch, attributionForSubmit } = await import('./attribution');
    const { setConsent, GRANT_ALL } = await import('./consent');

    captureTouch();                                   // arrives on the campaign URL
    visit(`${SELF}/pricing`);                         // browses on — no campaign here
    setConsent(GRANT_ALL);                            // and only now accepts
    persistPendingTouch();

    expect(attributionForSubmit()?.first?.utm_campaign).toBe('spring');
  });
});
