/**
 * What each role may do — MIGRATION-PLAN §10.
 *
 * Pure and free of next-auth and next/headers imports, matching the convention
 * of allowlist.ts: these are the rules the whole admin is gated on, so they are
 * worth testing directly rather than inferring from a redirect.
 *
 * The system holds exactly one admin, enforced by a partial unique index on the
 * users table. Everyone else is a manager, invited by that admin.
 */

export const ROLES = ['admin', 'manager'] as const;
export type Role = (typeof ROLES)[number];

export function isRole(v: unknown): v is Role {
  return typeof v === 'string' && (ROLES as readonly string[]).includes(v);
}

/** Only the admin may invite, and only ever as a manager. */
export function canInvite(role: Role): boolean {
  return role === 'admin';
}

/** Viewing the team, inviting, disabling and re-enabling. Admin only. */
export function canManageUsers(role: Role): boolean {
  return role === 'admin';
}

/**
 * Nobody deletes anything, including the admin.
 *
 * A constant on purpose. Access is revoked by setting disabledAt, which keeps
 * the audit trail of who was invited by whom; deleting a row destroys it. When
 * a delete feature is genuinely wanted there is one function to change here,
 * rather than a scattering of checks that were never written in the first
 * place because nothing could delete when the code was reviewed.
 */
export function canDelete(_role: Role): boolean {
  return false;
}

/** Both roles work the pipeline — that is what a manager is for. */
export function canEditLeads(role: Role): boolean {
  return role === 'admin' || role === 'manager';
}

/** Both roles may read leads and export them. */
export function canViewLeads(role: Role): boolean {
  return role === 'admin' || role === 'manager';
}

/**
 * Both roles may edit site content.
 *
 * A manager who cannot fix a typo in the FAQ is no use for the job the CMS
 * exists to do, and content carries none of the risk that invitations and role
 * changes do — a wrong word is visible and reversible, a wrong grant is
 * neither. The narrow remit in the plan was about access, not copy.
 */
export function canEditContent(role: Role): boolean {
  return role === 'admin' || role === 'manager';
}

/**
 * Editing the price list. Admin only.
 *
 * The exception to the rule above, and deliberately so: canEditContent is
 * generous because a wrong word is visible and reversible. A wrong rate is
 * neither — it is quoted to a prospect in writing, and the first anyone hears
 * of it is a signed order at the wrong price. Managers read this screen; they
 * do not set what the company charges.
 *
 * One function to widen if that turns out to be too tight.
 */
export function canEditRates(role: Role): boolean {
  return role === 'admin';
}

/**
 * Content is unpublished, never deleted — the same rule as accounts, for the
 * same reason, one level down.
 *
 * canDelete above refuses for everyone because a deleted user row destroys the
 * record of who invited whom. A deleted review or FAQ answer destroys the
 * record of what the site once claimed, which matters just as much the first
 * time somebody asks why a published rate changed. Every content table carries
 * a `published` flag, so there is always a way to take something off the site
 * without losing what it said.
 */
export function canUnpublishContent(role: Role): boolean {
  return canEditContent(role);
}

/**
 * Deleting a blog post outright, rather than taking it off the blog.
 *
 * The one hole in the rule above, and it is deliberate rather than an
 * oversight. Reviews and FAQ answers are a record of what the site once told
 * somebody, which is why canUnpublishContent exists and nothing destroys them.
 * A drafted post that was never published is not a record of anything — it is
 * somebody's abandoned first paragraph — and a list that can only ever grow
 * fills with them.
 *
 * Two guards keep the hole the size it is meant to be, both enforced in
 * deletePost rather than only here: a published post is refused outright, so
 * deleting is always preceded by a deliberate unpublish, and the menu item
 * opens a confirm step in the row instead of deleting on click.
 */
export function canDeletePost(role: Role): boolean {
  return canEditContent(role);
}

/**
 * Removing a draft FAQ question outright, rather than taking it off the page.
 *
 * The second hole, and the same one as canDeletePost: an unpublished question
 * is not a record of anything the site ever told anybody, and the Add question
 * screen writes each one to the database as you go, so a typo made three
 * questions ago is otherwise permanent. What canUnpublishContent protects is a
 * published answer, and that is exactly what deleteFaqItem refuses.
 *
 * Fenced the same way, and enforced in deleteFaqItem rather than only here: a
 * published question is refused outright, so removing a live answer is always
 * the deliberate two steps "take off the FAQ page", then "remove"; and the
 * menu item opens a confirm step rather than deleting on click.
 */
export function canDeleteFaqItem(role: Role): boolean {
  return canEditContent(role);
}
