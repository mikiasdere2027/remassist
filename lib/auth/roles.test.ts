import { describe, expect, it } from 'vitest';
import {
  ROLES, canDelete, canDeleteFaqItem, canEditContent, canEditLeads, canEditRates,
  canInvite, canManageUsers, canUnpublishContent, canViewLeads, isRole,
} from './roles';

describe('isRole', () => {
  it('accepts the two real roles', () => {
    expect(isRole('admin')).toBe(true);
    expect(isRole('manager')).toBe(true);
  });

  it('rejects anything else, including near-misses and non-strings', () => {
    // This guards the boundary where a role arrives from a form or a database
    // column, so "administrator" must not slip through as "admin".
    for (const v of ['administrator', 'Admin', 'owner', 'superuser', '', null, undefined, 1, {}]) {
      expect(isRole(v), String(v)).toBe(false);
    }
  });
});

describe('admin capabilities', () => {
  it('may invite and manage users', () => {
    expect(canInvite('admin')).toBe(true);
    expect(canManageUsers('admin')).toBe(true);
  });

  it('may work the pipeline like anyone else', () => {
    expect(canViewLeads('admin')).toBe(true);
    expect(canEditLeads('admin')).toBe(true);
  });
});

describe('manager capabilities', () => {
  it('may read and update leads', () => {
    expect(canViewLeads('manager')).toBe(true);
    expect(canEditLeads('manager')).toBe(true);
  });

  it('may NOT invite or manage users', () => {
    // The whole point of the role. If this ever flips, a manager can create
    // accounts and the single-admin rule stops meaning anything.
    expect(canInvite('manager')).toBe(false);
    expect(canManageUsers('manager')).toBe(false);
  });
});

describe('canDelete', () => {
  it('is false for every role, including admin', () => {
    // Access is revoked by disabling, never by deleting — a deleted row loses
    // the record of who invited whom.
    for (const role of ROLES) expect(canDelete(role), role).toBe(false);
  });
});

describe('rate capabilities', () => {
  it('lets only the admin edit the price list', () => {
    // The exception to the generous content rule. A wrong word is visible and
    // reversible; a wrong rate is quoted to a prospect in writing and the
    // first anyone hears of it is an order at the wrong price.
    expect(canEditRates('admin')).toBe(true);
    expect(canEditRates('manager')).toBe(false);
  });

  it('still lets a manager read them', () => {
    // Read access is not gated on canEditRates: a manager working a lead has
    // to be able to see what the site quoted them.
    for (const role of ROLES) expect(canViewLeads(role), role).toBe(true);
  });
});

describe('content capabilities', () => {
  it('lets both roles edit content', () => {
    // A manager who cannot fix a typo in the FAQ is no use for the job the CMS
    // exists to do, and a wrong word is visible and reversible in a way a
    // wrong role grant is not.
    for (const role of ROLES) expect(canEditContent(role), role).toBe(true);
  });

  it('lets both roles unpublish, and still lets nobody delete', () => {
    // Content is taken off the site by unpublishing, never by deleting — the
    // same rule as accounts, one level down. A deleted answer destroys the
    // record of what the site once claimed.
    for (const role of ROLES) {
      expect(canUnpublishContent(role), role).toBe(true);
      expect(canDelete(role), role).toBe(false);
    }
  });

  it('lets both roles remove a FAQ draft, without widening canDelete', () => {
    // The narrow exception: an unpublished question is not a record of
    // anything the site told anybody, and the Add question screen writes each
    // one to the database as you go. The published check that keeps this
    // narrow lives in deleteFaqItem, not here — this only says who may reach
    // it, and it must not leak back into the account rule above.
    for (const role of ROLES) {
      expect(canDeleteFaqItem(role), role).toBe(true);
      expect(canDelete(role), role).toBe(false);
    }
  });
});
