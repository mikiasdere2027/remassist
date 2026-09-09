import { describe, expect, it } from 'vitest';
import {
  VERIFY_GRACE_SEC, hoursToVerify, isLockedForVerification, verifyDeadline,
  verifyReturnPath, verifyState,
} from './verify';

/**
 * The activation deadline — MIGRATION-PLAN §10, phase 5.
 *
 * Worth testing directly rather than through a redirect: this is the rule that
 * decides whether somebody can reach the admin at all, the boundary cases are
 * an exact instant, and the cost of getting one of them backwards is either a
 * lock that never engages or an administrator locked out a day early.
 */
const CREATED = new Date('2026-08-01T09:00:00Z');
const at = (offsetSec: number) => new Date(CREATED.getTime() + offsetSec * 1000);

describe('verifyState', () => {
  it('is verified whenever the address has been proved, however old the row', () => {
    // The deadline is about proving the address, not about account age. A
    // verified account a year old must never be treated as out of time.
    const user = { emailVerified: at(60), createdAt: CREATED };
    expect(verifyState(user, at(365 * 86_400))).toBe('verified');
  });

  it('is pending inside the window', () => {
    expect(verifyState({ emailVerified: null, createdAt: CREATED }, at(3600))).toBe('pending');
  });

  it('is locked once the window has passed', () => {
    expect(verifyState({ emailVerified: null, createdAt: CREATED }, at(VERIFY_GRACE_SEC + 1)))
      .toBe('locked');
  });

  it('locks exactly at the deadline, not a moment after', () => {
    // The boundary is the whole rule. `>=` rather than `>` so the state cannot
    // sit in an instant that is neither pending nor locked.
    const user = { emailVerified: null, createdAt: CREATED };
    expect(verifyState(user, at(VERIFY_GRACE_SEC - 1))).toBe('pending');
    expect(verifyState(user, at(VERIFY_GRACE_SEC))).toBe('locked');
  });
});

describe('verifyDeadline', () => {
  it('is a day after the row was created', () => {
    expect(verifyDeadline(CREATED).toISOString()).toBe('2026-08-02T09:00:00.000Z');
  });
});

describe('isLockedForVerification', () => {
  it('is the only question the gates ask', () => {
    expect(isLockedForVerification({ emailVerified: null, createdAt: CREATED }, at(0)))
      .toBe(false);
    expect(isLockedForVerification({ emailVerified: null, createdAt: CREATED }, at(86_401)))
      .toBe(true);
    expect(isLockedForVerification({ emailVerified: at(10), createdAt: CREATED }, at(86_401)))
      .toBe(false);
  });
});

describe('hoursToVerify', () => {
  it('rounds up, so a live account never reads as zero hours left', () => {
    const user = { emailVerified: null, createdAt: CREATED };
    expect(hoursToVerify(user, at(0))).toBe(24);
    // One second of grace is still "1 hour left" rather than "0".
    expect(hoursToVerify(user, at(VERIFY_GRACE_SEC - 1))).toBe(1);
  });

  it('is zero once out of time, never negative', () => {
    const user = { emailVerified: null, createdAt: CREATED };
    expect(hoursToVerify(user, at(VERIFY_GRACE_SEC))).toBe(0);
    expect(hoursToVerify(user, at(VERIFY_GRACE_SEC * 9))).toBe(0);
  });
});

describe('verifyReturnPath', () => {
  it('resolves the two screens that send an activation code', () => {
    expect(verifyReturnPath('verify')).toBe('/admin/verify');
    expect(verifyReturnPath('settings')).toBe('/admin/settings');
  });

  it('falls back for anything else, so no form field reaches a redirect', () => {
    // The value arrives from a posted form, and the caller puts the result in
    // redirect(). Anything not in the table has to resolve to one of ours.
    expect(verifyReturnPath('https://evil.example')).toBe('/admin/settings');
    expect(verifyReturnPath('//evil.example')).toBe('/admin/settings');
    expect(verifyReturnPath(undefined)).toBe('/admin/settings');
    expect(verifyReturnPath('')).toBe('/admin/settings');
  });
});
