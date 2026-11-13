/** GET /v1/admin/activity — the audit log, newest first. */

export interface ActivityEntry {
  id: string;
  createdAt: string;
  actorId: string | null;
  actorName: string;
  /** e.g. 'lead', 'post', 'faq_item', 'agent_tier', 'user', 'session'. */
  entity: string;
  entityId: string | null;
  /** Short verb: created, updated, status_changed, signed_in… */
  action: string;
  summary: string;
  before: unknown;
  after: unknown;
}

export interface ActivityPage {
  items: ActivityEntry[];
  nextCursor: string | null;
}

/**
 * Entity names the backend records today, with the label the filter shows.
 * Managers never see the admin-only ones (the backend filters them out).
 */
export const ACTIVITY_ENTITIES: Array<{ value: string; label: string; adminOnly?: boolean }> = [
  { value: 'lead', label: 'Leads' },
  { value: 'post', label: 'Posts' },
  { value: 'faq_item', label: 'FAQ items' },
  { value: 'faq_group', label: 'FAQ groups' },
  { value: 'review', label: 'Reviews' },
  { value: 'review_source', label: 'Review sources' },
  { value: 'team_member', label: 'Team members' },
  { value: 'popup', label: 'Popups' },
  { value: 'agent_tier', label: 'Rate tiers' },
  { value: 'coverage_option', label: 'Coverage options' },
  { value: 'user', label: 'Users', adminOnly: true },
  { value: 'invitation', label: 'Invitations', adminOnly: true },
  { value: 'password_reset', label: 'Password resets', adminOnly: true },
  { value: 'session', label: 'Sign-ins', adminOnly: true },
];

/** Where an entry's subject lives in the admin, when it has a page. */
export function activityHref(e: Pick<ActivityEntry, 'entity' | 'entityId'>): string | null {
  if (!e.entityId) return null;
  switch (e.entity) {
    case 'lead':
      return `/admin/leads/${e.entityId}`;
    case 'post':
      return `/admin/content/posts/${e.entityId}`;
    case 'faq_item':
      return `/admin/content/faq/${e.entityId}`;
    case 'popup':
      return `/admin/content/popups/${e.entityId}`;
    case 'review':
      return `/admin/content/reviews/${e.entityId}`;
    case 'team_member':
      return `/admin/content/team/${e.entityId}`;
    default:
      return null;
  }
}
