import { describe, expect, it } from 'vitest';
import { authorise, type UserRow } from './session';

/**
 * The authorisation gate — MIGRATION-PLAN §10.
 *
 * Every rule that decides who reaches /admin is here, and none of them needs a
 * session, a request or a database. That is the whole reason session.ts exists
 * as its own module: the alternative was importing require.ts, which drags in
 * next-auth and buys a test of one `if` for double the suite runtime.
 */
const CREATED = new Date('2026-08-01T09:00:00Z');

function row(over: Partial<UserRow> = {}): UserRow {
  return {
    id: 'u1',
    email: 'boss@remassistance.com',
    name: 'Boss',
    role: 'admin',
    emailVerified: null,
    createdAt: CREATED,
    disabledAt: null,
    passwordHash: 'scrypt$16384$8$1$c2FsdA==$aGFzaA==',
    ...over,
  };
}

describe('authorise, when it allows', () => {
  it('returns the admin for a live row on a company domain', () => {
    const user = authorise('boss@remassistance.com', row());
    expect(user).toEqual({
      id: 'u1',
      email: 'boss@remassistance.com',
      name: 'Boss',
      role: 'admin',
      emailVerified: null,
      createdAt: CREATED,
      hasPassword: true,
    });
  });

  it('allows a manager just the same — the role is reported, not enforced here', () => {
    // requireRole and assertRole enforce. This function only says who they are;
    // conflating the two is how a page ends up being the only thing standing
    // between a manager and an admin-only action.
    expect(authorise('m@remassistance.com', row({ role: 'manager' }))?.role).toBe('manager');
  });

  it('allows an unverified account — the activation deadline is not decided here', () => {
    // Unverified is now enforced, but one layer up: authorise says who this
    // request is, and requireUser/assertUser apply the deadline in
    // lib/auth/verify.ts. Keeping them apart is what lets /admin/verify resolve
    // the very account it exists to unlock, which a denial here would make
    // impossible.
    expect(authorise('boss@remassistance.com', row({ emailVerified: null }))).not.toBeNull();
  });
});

describe('authorise, when it denies', () => {
  it('refuses an address off the company domain even with a live row', () => {
    // The outer fence, and it earns its keep now that the allowlist is one
    // domain: the @remconnect.io rows created before 2026-09-09 are still in
    // the users table, live and undisabled, and this is what refuses them.
    const r = row({ email: 'boss@remconnect.io' });
    expect(authorise('boss@remconnect.io', r)).toBeNull();
  });
  it('denies with no row at all — which is also the no-database case', () => {
    // currentUser passes undefined both when the query found nothing and when
    // there is no DATABASE_URL to query. Failing CLOSED is structural here
    // rather than a branch somebody has to remember, and it is the opposite of
    // lib/auth/attempts.ts on purpose: failing open there means "do not
    // throttle", failing open here would mean "everyone is an admin".
    expect(authorise('boss@remassistance.com', undefined)).toBeNull();
    expect(authorise(null, undefined)).toBeNull();
  });

  it('denies a disabled account', () => {
    // The single most important rule in this file. Access is revoked by
    // setting disabledAt, and it is checked on every request, so a disabled
    // person loses access immediately rather than at their next sign-in.
    const disabled = row({ disabledAt: new Date('2026-08-20T00:00:00Z') });
    expect(authorise('boss@remassistance.com', disabled)).toBeNull();
  });

  it('denies a disabled admin too, not just a disabled manager', () => {
    const disabled = row({ role: 'admin', disabledAt: new Date() });
    expect(authorise('boss@remassistance.com', disabled)).toBeNull();
  });

  it('denies an address off a company domain even when a row exists', () => {
    // Defence in depth. The row is authoritative, but if the allowlist ever
    // narrows, existing rows must stop working rather than being grandfathered
    // in by a check that only runs at sign-in.
    const outsider = row({ email: 'someone@gmail.com' });
    expect(authorise('someone@gmail.com', outsider)).toBeNull();
  });

  it('denies an unrecognised role rather than defaulting to manager', () => {
    // A role nobody wrote on purpose is a row nobody should be trusting. The
    // near-misses matter: 'administrator' and 'Admin' must not resolve.
    for (const role of ['', 'administrator', 'Admin', 'owner', 'superuser', 'root']) {
      expect(authorise('boss@remassistance.com', row({ role })), role).toBeNull();
    }
  });

  it('denies when there is no session email', () => {
    for (const email of [null, undefined, '']) {
      expect(authorise(email, row()), String(email)).toBeNull();
    }
  });

  it('checks disabled before role, so a disabled row with a bad role still denies', () => {
    const both = row({ role: 'nonsense', disabledAt: new Date() });
    expect(authorise('boss@remassistance.com', both)).toBeNull();
  });
});

describe('authorise never leaks the password hash', () => {
  it('reports only whether one is set', () => {
    // The hash must not reach a server-component payload or a log. hasPassword
    // is what the settings screen needs to choose between "set" and "change".
    const withPw = authorise('boss@remassistance.com', row({ passwordHash: 'scrypt$...' }));
    const without = authorise('boss@remassistance.com', row({ passwordHash: null }));

    expect(withPw?.hasPassword).toBe(true);
    expect(without?.hasPassword).toBe(false);
    expect(JSON.stringify(withPw)).not.toContain('scrypt');
    expect(Object.keys(withPw!)).not.toContain('passwordHash');
  });

  it('returns no disabledAt either — the caller has no use for it', () => {
    expect(Object.keys(authorise('boss@remassistance.com', row())!)).toEqual([
      'id', 'email', 'name', 'role', 'emailVerified', 'createdAt', 'hasPassword',
    ]);
  });
});

/**
 * NOT COVERED, on purpose, and consistent with the note at the foot of
 * lib/leads/route.test.ts: the plumbing in require.ts — reading the session and
 * running the query — plus requireUser, requireRole and assertRole. Those need
 * a live session AND a live Postgres, and mocking the Drizzle chain would
 * assert that the mock was called, not that a disabled account loses access.
 *
 * They are covered by the phase 3 matrix in the plan, run in a browser against
 * a real database: signed out, manager, admin and disabled user against
 * /admin/leads, /admin/leads/export, /admin/settings, /admin/settings/team and
 * the setLeadStatus action. Move them here the moment CI has a DATABASE_URL.
 */
