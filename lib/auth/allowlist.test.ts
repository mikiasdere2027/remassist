import { describe, expect, it } from 'vitest';
import { isAllowedEmail } from './allowlist';

/**
 * The only gate in front of every lead in the database. Tested directly rather
 * than through a redirect, because a redirect passing tells you the page moved,
 * not that the rule is right.
 */
describe('isAllowedEmail', () => {
  it('admits the two internal domains', () => {
    expect(isAllowedEmail('jane@remassistance.com')).toBe(true);
    expect(isAllowedEmail('jane@remconnect.io')).toBe(true);
  });

  it('rejects an outside domain', () => {
    expect(isAllowedEmail('jane@gmail.com')).toBe(false);
  });

  it('rejects a domain that merely ends with an allowed one', () => {
    // The trap in a naive endsWith check: an attacker registers this and is in.
    expect(isAllowedEmail('jane@evil-remassistance.com')).toBe(false);
    expect(isAllowedEmail('jane@notremconnect.io')).toBe(false);
  });

  it('rejects an allowed domain that is only in the local part', () => {
    expect(isAllowedEmail('jane@remassistance.com@evil.com')).toBe(false);
  });

  it('is case insensitive on the domain', () => {
    expect(isAllowedEmail('Jane@ReMaSsIsTaNcE.CoM')).toBe(true);
  });

  it('rejects absent, empty and malformed addresses', () => {
    expect(isAllowedEmail(null)).toBe(false);
    expect(isAllowedEmail(undefined)).toBe(false);
    expect(isAllowedEmail('')).toBe(false);
    expect(isAllowedEmail('remassistance.com')).toBe(false);
    expect(isAllowedEmail('@remassistance.com')).toBe(false);
  });
});
