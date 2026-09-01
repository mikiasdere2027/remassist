import { describe, expect, it } from 'vitest';
import { LeadBody, leadColumns, utmFromPage } from './schema';

/**
 * The validation boundary decides what reaches Postgres, so it is the part
 * worth testing hardest — and it needs no database or server to exercise.
 */
const valid = { email: 'a@b.com', source: 'contact_form' as const };

describe('LeadBody', () => {
  it('accepts the minimum: an email and a source', () => {
    expect(LeadBody.safeParse(valid).success).toBe(true);
  });

  it('rejects a missing or malformed email', () => {
    expect(LeadBody.safeParse({ source: 'contact_form' }).success).toBe(false);
    expect(LeadBody.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
    expect(LeadBody.safeParse({ ...valid, email: '' }).success).toBe(false);
  });

  it('normalises email to trimmed lowercase, so duplicates collapse', () => {
    const r = LeadBody.safeParse({ ...valid, email: '  Someone@Example.COM ' });
    expect(r.success && r.data.email).toBe('someone@example.com');
  });

  it('rejects an unknown source rather than storing it', () => {
    expect(LeadBody.safeParse({ ...valid, source: 'facebook_ad' }).success).toBe(false);
  });

  it('accepts every source the schema enum declares', () => {
    for (const s of ['qualify_quiz', 'ask_widget', 'contact_form', 'pricing_cta']) {
      expect(LeadBody.safeParse({ ...valid, source: s }).success, s).toBe(true);
    }
  });

  it('enforces the field length caps', () => {
    expect(LeadBody.safeParse({ ...valid, name: 'x'.repeat(121) }).success).toBe(false);
    expect(LeadBody.safeParse({ ...valid, name: 'x'.repeat(120) }).success).toBe(true);
    expect(LeadBody.safeParse({ ...valid, message: 'x'.repeat(5001) }).success).toBe(false);
    expect(LeadBody.safeParse({ ...valid, company: 'x'.repeat(161) }).success).toBe(false);
    expect(LeadBody.safeParse({ ...valid, phone: 'x'.repeat(41) }).success).toBe(false);
  });

  it('requires page to be a real URL when present', () => {
    expect(LeadBody.safeParse({ ...valid, page: '/pricing' }).success).toBe(false);
    expect(LeadBody.safeParse({ ...valid, page: 'https://remassistance.com/pricing' }).success).toBe(true);
  });

  it('lets a filled honeypot through validation so the route can drop it silently', () => {
    // Rejecting it here would answer 400 and tell the bot what to change; the
    // route answers 200 and writes nothing instead.
    expect(LeadBody.safeParse({ ...valid, honey: '' }).success).toBe(true);
    expect(LeadBody.safeParse({ ...valid, honey: 'http://spam' }).success).toBe(true);
  });

  it('accepts a quiz payload alongside the lead', () => {
    const r = LeadBody.safeParse({
      ...valid,
      source: 'qualify_quiz',
      quiz: { answers: { gap: 'back', hours: 'ft' }, result: { cost: '$1,280+' }, completed: true },
    });
    expect(r.success).toBe(true);
  });

  it('accepts the fields the contact form sends discretely', () => {
    const r = LeadBody.safeParse({
      ...valid,
      firstName: 'Ada',
      lastName: 'Lovelace',
      country: 'United Kingdom',
      service: 'Virtual Back Office Pod',
      consent: true,
      rawFields: { first_name: 'Ada', consent: 'yes' },
    });
    expect(r.success).toBe(true);
  });

  it('caps the new field lengths', () => {
    expect(LeadBody.safeParse({ ...valid, firstName: 'x'.repeat(61) }).success).toBe(false);
    expect(LeadBody.safeParse({ ...valid, lastName: 'x'.repeat(61) }).success).toBe(false);
    expect(LeadBody.safeParse({ ...valid, country: 'x'.repeat(81) }).success).toBe(false);
    expect(LeadBody.safeParse({ ...valid, service: 'x'.repeat(121) }).success).toBe(false);
  });

  it('fences rawFields, which lands unbounded in a jsonb column otherwise', () => {
    const keys = (n: number) => Object.fromEntries(
      Array.from({ length: n }, (_, i) => [`k${i}`, 'v']),
    );
    expect(LeadBody.safeParse({ ...valid, rawFields: keys(40) }).success).toBe(true);
    expect(LeadBody.safeParse({ ...valid, rawFields: keys(41) }).success).toBe(false);
    expect(LeadBody.safeParse({ ...valid, rawFields: { k: 'x'.repeat(5001) } }).success).toBe(false);
    expect(LeadBody.safeParse({ ...valid, rawFields: { ['k'.repeat(61)]: 'v' } }).success).toBe(false);
  });

  it('rejects a non-boolean consent rather than coercing it', () => {
    expect(LeadBody.safeParse({ ...valid, consent: 'yes' }).success).toBe(false);
  });

  it('rejects null and non-object bodies', () => {
    expect(LeadBody.safeParse(null).success).toBe(false);
    expect(LeadBody.safeParse('nope').success).toBe(false);
    expect(LeadBody.safeParse([]).success).toBe(false);
  });
});

describe('utmFromPage', () => {
  it('pulls the campaign parameters off the page URL', () => {
    expect(utmFromPage('https://remassistance.com/p?utm_source=li&utm_campaign=q3')).toEqual({
      utm_source: 'li',
      utm_campaign: 'q3',
    });
  });

  it('returns undefined when there is nothing to record, so the column stays NULL', () => {
    expect(utmFromPage(undefined)).toBeUndefined();
    expect(utmFromPage('https://remassistance.com/pricing')).toBeUndefined();
  });

  it('survives a malformed URL instead of throwing into the request', () => {
    expect(utmFromPage('not a url')).toBeUndefined();
  });

  it('ignores non-utm query parameters', () => {
    expect(utmFromPage('https://x.com/?ref=twitter&utm_medium=social')).toEqual({ utm_medium: 'social' });
  });
});

describe('leadColumns', () => {
  const at = new Date('2026-09-01T10:00:00Z');
  const parse = (b: Record<string, unknown>) => {
    const r = LeadBody.safeParse({ ...valid, ...b });
    if (!r.success) throw new Error('fixture failed validation');
    return r.data;
  };

  it('joins first and last into the display name the webhook renders', () => {
    expect(leadColumns(parse({ firstName: 'Ada', lastName: 'Lovelace' })).name)
      .toBe('Ada Lovelace');
  });

  it('keeps the single name field the quiz sends, which has no first/last', () => {
    expect(leadColumns(parse({ name: 'Ada Lovelace' })).name).toBe('Ada Lovelace');
  });

  it('joins what it has when only one half is present', () => {
    expect(leadColumns(parse({ firstName: 'Ada' })).name).toBe('Ada');
  });

  it('keeps country and service as columns instead of flattening them into message', () => {
    // The bug this whole change exists to fix: these two used to be concatenated
    // into the message string and were unrecoverable as structured data.
    const c = leadColumns(parse({ country: 'Kenya', service: 'Bookkeeping, AP / AR' }));
    expect(c.country).toBe('Kenya');
    expect(c.serviceInterest).toBe('Bookkeeping, AP / AR');
  });

  it('stamps consent with the server clock when the box was ticked', () => {
    expect(leadColumns(parse({ consent: true }), at).consentAt).toBe(at);
  });

  it('leaves consent null when it was not ticked, and when it was never sent', () => {
    // Null has to mean "no consent recorded" for the admin to tell the truth
    // about rows written before the column existed.
    expect(leadColumns(parse({ consent: false }), at).consentAt).toBeNull();
    expect(leadColumns(parse({}), at).consentAt).toBeNull();
  });

  it('passes the raw payload through untouched', () => {
    const raw = { first_name: 'Ada', country: 'Kenya', some_future_field: 'kept' };
    expect(leadColumns(parse({ rawFields: raw })).rawFields).toEqual(raw);
  });

  it('leaves absent fields undefined so the columns stay NULL', () => {
    const c = leadColumns(parse({}));
    expect(c.country).toBeUndefined();
    expect(c.serviceInterest).toBeUndefined();
    expect(c.rawFields).toBeUndefined();
  });
});
