/**
 * Team members (the public "meet the team" cards — not admin accounts) —
 * response shapes and small wrappers for the backend's team module
 * (remassist-backend src/modules/team).
 *
 *   GET   /v1/admin/team          → AdminTeamMember[] (homepage order)
 *   GET   /v1/admin/team/:id      → AdminTeamMember & { position, total }
 *   POST  /v1/admin/team          → AdminTeamMember (always a draft; optional 1-based position)
 *   PATCH /v1/admin/team/:id      → AdminTeamMember (fields, { published })
 *   PUT   /v1/admin/team/order    → AdminTeamMember[] — every id exactly once (409 if stale)
 *   GET   /v1/public/team         → PublicTeamMember[] (lib/team/content.ts)
 *
 * `image` is a URL. Seeded members hold site paths (/images/teams/*.jpg),
 * which the backend keeps but refuses as new input: only a Cloudinary URL
 * (from lib/api/upload.ts) or null may be sent, so send `image` only when it
 * changed. There is no delete — unpublish instead.
 */
import { api } from './client';
import { ApiError } from './errors';

export interface AdminTeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  tag: string;
  blurb: string | null;
  linkedin: string | null;
  image: string | null;
  sortOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTeamMemberDetail extends AdminTeamMember {
  /** 1-based place in the homepage order. */
  position: number;
  total: number;
}

export interface TeamMemberFields {
  name: string;
  role: string;
  /** Blank on create → derived from the name by the backend. */
  initials: string;
  tag: string;
  blurb: string | null;
  linkedin: string | null;
  image?: string | null;
}

export const teamApi = {
  create: (body: TeamMemberFields & { position?: number }) =>
    api.post<AdminTeamMember>('/admin/team', body),
  update: (id: string, patch: Partial<TeamMemberFields> & { published?: boolean }) =>
    api.patch<AdminTeamMember>(`/admin/team/${id}`, patch),
  setPublished: (id: string, published: boolean) =>
    api.patch<AdminTeamMember>(`/admin/team/${id}`, { published }),
  /** Every member's id exactly once, in the new homepage order. */
  reorder: (ids: string[]) => api.put<AdminTeamMember[]>('/admin/team/order', { ids }),
};

/** The first validation issue if there is one, else the API's message. */
export function teamErrorText(err: unknown): string {
  if (err instanceof ApiError) return err.issues[0]?.message ?? err.message;
  return err instanceof Error ? err.message : 'Something went wrong.';
}
