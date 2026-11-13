/**
 * FAQ — response shapes and small wrappers for the backend's
 * /v1/admin/faq/* and /v1/public/faq/* endpoints (remassist-backend
 * src/modules/faq). Safe to import from client components: it only uses the
 * browser client.
 */
import { api } from './client';

/**
 * How many questions the homepage card holds. Mirrors MAX_FEATURED in the
 * backend's faq.featured.ts, which enforces it (409 on a seventh star).
 */
export const MAX_FEATURED = 6;

/** A section, as GET /v1/admin/faq/groups lists it. */
export interface FaqAdminGroup {
  id: string;
  slug: string;
  title: string;
  blurb: string | null;
  linkHref: string | null;
  linkLabel: string | null;
  sortOrder: number;
  itemCount: number;
  publishedCount: number;
}

/** A question row, as GET /v1/admin/faq/items lists it (public page order). */
export interface FaqAdminItem {
  id: string;
  groupId: string;
  question: string;
  /** Stored (cleaned) HTML — or a plain sentence for rows imported before the editor. */
  answer: string;
  sortOrder: number;
  published: boolean;
  featured: boolean;
  featuredOrder: number;
}

/** GET /v1/admin/faq/items/:id — the row plus what the edit page needs to place it. */
export interface FaqItemDetail extends FaqAdminItem {
  group: { id: string; title: string; slug: string };
  /** Every question in its section, in order. */
  siblingIds: string[];
  /** Every starred question, in homepage order. */
  featuredIds: string[];
  maxFeatured: number;
}

export interface FaqGroupInput {
  title: string;
  slug: string;
  blurb: string | null;
  linkHref: string | null;
  linkLabel: string | null;
}

export type FaqItemPatch = Partial<{
  question: string;
  answer: string;
  groupId: string;
  published: boolean;
  featured: boolean;
}>;

/** Browser-side calls. Each throws ApiError on failure. */
export const faqApi = {
  createGroup: (input: FaqGroupInput) => api.post<FaqAdminGroup>('/admin/faq/groups', input),
  updateGroup: (id: string, patch: Partial<FaqGroupInput>) =>
    api.patch<FaqAdminGroup>(`/admin/faq/groups/${id}`, patch),
  deleteGroup: (id: string) => api.delete(`/admin/faq/groups/${id}`),
  /** `ids` must be every section, in the new order. */
  reorderGroups: (ids: string[]) => api.put<FaqAdminGroup[]>('/admin/faq/groups/order', { ids }),
  /** `ids` must be every question in the section, in the new order. */
  reorderItems: (groupId: string, ids: string[]) =>
    api.put<FaqAdminItem[]>(`/admin/faq/groups/${groupId}/items/order`, { ids }),
  /** `ids` must be every starred question, in the new homepage order. */
  reorderFeatured: (ids: string[]) => api.put<FaqAdminItem[]>('/admin/faq/featured/order', { ids }),

  /** New questions are drafts. Returns the stored row, with the cleaned answer. */
  createItem: (input: { groupId: string; question: string; answer: string }) =>
    api.post<FaqAdminItem>('/admin/faq/items', input),
  updateItem: (id: string, patch: FaqItemPatch) =>
    api.patch<FaqAdminItem>(`/admin/faq/items/${id}`, patch),
  /** Drafts only — the backend refuses a published question with 409. */
  deleteItem: (id: string) => api.delete(`/admin/faq/items/${id}`),
};

/** `ids` with `id` swapped with its neighbour in `direction`. */
export function swapped(ids: readonly string[], id: string, direction: 'up' | 'down'): string[] | null {
  const at = ids.indexOf(id);
  const to = direction === 'up' ? at - 1 : at + 1;
  if (at === -1 || to < 0 || to >= ids.length) return null;
  const next = ids.slice();
  [next[at], next[to]] = [next[to], next[at]];
  return next;
}
