/**
 * Response shapes from the backend (remassist-backend). Kept by hand for now;
 * generating them from the backend's OpenAPI spec is planned.
 */
import type { Role } from '@/lib/auth/roles';

/** The signed-in admin, as GET /v1/admin/auth/me returns it. */
export interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
}

/** An admin account as listed on the team screen (GET /v1/admin/users). */
export interface TeamUser extends AdminUser {
  createdAt: string;
  lastLoginAt: string | null;
  disabledAt: string | null;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invitation {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  invitedByName: string | null;
  status: InvitationStatus;
}

/** POST /v1/admin/invitations — the link is only ever returned here. */
export interface CreatedInvitation {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  inviteUrl: string;
  emailed: boolean;
}

/** POST /v1/admin/users/:id/password-reset */
export interface CreatedReset {
  resetUrl: string;
  expiresAt: string;
  emailed: boolean;
}

/** GET /v1/public/invitations/:token */
export interface InvitationInfo {
  email: string;
  name: string | null;
  role: Role;
  expiresAt: string;
  status: InvitationStatus;
}

/** GET /v1/public/password-resets/:token */
export interface ResetInfo {
  username: string;
  name: string;
  expiresAt: string;
  status: 'pending' | 'used' | 'expired' | 'revoked';
}
