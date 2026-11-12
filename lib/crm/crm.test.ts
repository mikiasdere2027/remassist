import { describe, expect, it } from 'vitest';
import { toE164, countryCode } from './phone';
import { companyDomainFromEmail, domainFromWebsite, emailDomain, normalizeEmail } from './dedupe';
import { pickOwner } from './assignment';
import { scoreLead } from './scoring';
import { validateCustomFields, type FieldDef } from './fields';
import { EVENT_TYPES } from './events';
import { DEFAULT_WORKSPACE_ID, currentWorkspaceId } from './workspace';

describe('toE164', () => {
  it('keeps international numbers', () => {
    expect(toE164('+251 911 234 567')).toBe('+251911234567');
    expect(toE164('+1 (713) 478-1104')).toBe('+17134781104');
    expect(toE164('00251911234567')).toBe('+251911234567');
  });
  it('uses the country for national numbers and drops the trunk zero', () => {
    expect(toE164('0911 234 567', 'Ethiopia')).toBe('+251911234567');
    expect(toE164('713-478-1104', 'US')).toBe('+17134781104');
    expect(toE164('1 713 478 1104', 'United States')).toBe('+17134781104');
    expect(toE164('020 7946 0958', 'GB')).toBe('+442079460958');
  });
  it('strips extensions', () => {
    expect(toE164('+1 713 478 1104 ext. 22')).toBe('+17134781104');
  });
  it('refuses to guess', () => {
    expect(toE164('911 234 567')).toBeNull(); // no country
    expect(toE164('12345', 'US')).toBeNull();
    expect(toE164('+12')).toBeNull();
    expect(toE164('+1234567890123456')).toBeNull(); // > 15 digits
    expect(toE164('call me')).toBeNull();
    expect(toE164(null)).toBeNull();
  });
  it('reads country names and codes', () => {
    expect(countryCode('kenya')).toBe('KE');
    expect(countryCode('ke')).toBe('KE');
    expect(countryCode('Atlantis')).toBeUndefined();
  });
});

describe('dedupe keys', () => {
  it('normalises email', () => {
    expect(normalizeEmail('  Jane@Northwind.COM ')).toBe('jane@northwind.com');
    expect(normalizeEmail('not-an-email')).toBeNull();
    expect(emailDomain('jane@northwind.com')).toBe('northwind.com');
  });
  it('only work emails imply a company', () => {
    expect(companyDomainFromEmail('jane@northwind.com')).toBe('northwind.com');
    expect(companyDomainFromEmail('jane@gmail.com')).toBeNull();
    expect(companyDomainFromEmail('jane@Outlook.com')).toBeNull();
  });
  it('reduces websites to a domain', () => {
    expect(domainFromWebsite('https://www.Northwind.com/about')).toBe('northwind.com');
    expect(domainFromWebsite('northwind.com')).toBe('northwind.com');
    expect(domainFromWebsite('localhost')).toBeNull();
    expect(domainFromWebsite('')).toBeNull();
  });
});

describe('pickOwner', () => {
  const people = [{ id: 'c' }, { id: 'a' }, { id: 'b' }, { id: 'd', disabled: true }];
  it('applies the first matching rule', () => {
    const rules = [{ service: 'managed it', ownerId: 'b' }, { source: 'voice_agent', ownerId: 'c' }];
    expect(pickOwner({ service: 'Managed IT', source: 'contact_form' }, people, rules, null)).toBe('b');
    expect(pickOwner({ service: 'HR', source: 'voice_agent' }, people, rules, null)).toBe('c');
  });
  it('skips rules for disabled people and empty rules', () => {
    expect(pickOwner({ service: 'x' }, people, [{ service: 'x', ownerId: 'd' }, { ownerId: 'a' }], 'a')).toBe('b');
  });
  it('round-robins in id order and wraps', () => {
    expect(pickOwner({}, people, [], null)).toBe('a');
    expect(pickOwner({}, people, [], 'a')).toBe('b');
    expect(pickOwner({}, people, [], 'c')).toBe('a');
    expect(pickOwner({}, people, [], 'bb')).toBe('c'); // last assignee no longer listed
  });
  it('returns null with nobody eligible', () => {
    expect(pickOwner({}, [{ id: 'x', disabled: true }], [], null)).toBeNull();
  });
});

describe('scoreLead', () => {
  it('rates a hot quiz lead high and explains why', () => {
    const s = scoreLead({
      source: 'qualify_quiz', email: 'cto@northwind.com', phone: '+1 555 0100', company: 'Northwind',
      serviceInterest: 'GTM teams', quiz: { completed: true, seats: 6, timing: 'now' },
    });
    expect(s.priority).toBe('high');
    expect(s.score).toBeLessThanOrEqual(100);
    expect(s.reasons).toContain('+15 work email');
    expect(s.reasons).toContain('+15 6 seats');
  });
  it('rates a bare widget enquiry low', () => {
    const s = scoreLead({ source: 'ask_widget', email: 'someone@gmail.com' });
    expect(s).toEqual({ score: 5, priority: 'low', reasons: ['+5 source: ask widget'] });
  });
});

describe('custom fields', () => {
  const defs: FieldDef[] = [
    { key: 'seats_needed', label: 'Seats needed', type: 'number', required: true },
    { key: 'shift', label: 'Shift', type: 'select', options: ['day', 'night'] },
    { key: 'go_live', label: 'Go-live', type: 'date' },
    { key: 'old_field', label: 'Old', type: 'text', archivedAt: new Date() },
  ];
  it('accepts valid values and drops unknown keys', () => {
    const r = validateCustomFields(defs, { seats_needed: 3, shift: 'night', junk: 1 });
    expect(r.success && r.data).toEqual({ seats_needed: 3, shift: 'night' });
  });
  it('rejects bad values and missing required ones', () => {
    expect(validateCustomFields(defs, { seats_needed: 3, shift: 'weekend' }).success).toBe(false);
    expect(validateCustomFields(defs, { seats_needed: 3, go_live: '12/01/2026' }).success).toBe(false);
    expect(validateCustomFields(defs, {}).success).toBe(false);
  });
  it('keeps values of archived fields', () => {
    const r = validateCustomFields(defs, { seats_needed: 1 }, { old_field: 'kept' });
    expect(r.success && r.data).toEqual({ old_field: 'kept', seats_needed: 1 });
  });
});

describe('events and workspace', () => {
  it('event names are unique and dotted', () => {
    expect(new Set(EVENT_TYPES).size).toBe(EVENT_TYPES.length);
    for (const t of EVENT_TYPES) expect(t).toMatch(/^[a-z]+\.[a-z_]+$/);
  });
  it('there is one workspace today, matching the migration seed', () => {
    expect(currentWorkspaceId()).toBe(DEFAULT_WORKSPACE_ID);
    expect(DEFAULT_WORKSPACE_ID).toBe('00000000-0000-4000-8000-000000000001');
  });
});
