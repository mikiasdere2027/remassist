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
  { value: 'deal', label: 'Deals' },
  { value: 'proposal', label: 'Proposals' },
  { value: 'engagement', label: 'Customers' },
  { value: 'company', label: 'Companies' },
  { value: 'contact', label: 'Contacts' },
  { value: 'task', label: 'Tasks' },
  { value: 'pipeline_stage', label: 'Pipeline stages' },
  { value: 'loss_reason', label: 'Loss reasons' },
  { value: 'crm_settings', label: 'CRM settings' },
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
    case 'deal':
      return `/admin/deals/${e.entityId}`;
    case 'proposal':
      return `/admin/proposals/${e.entityId}`;
    case 'engagement':
      return `/admin/customers/${e.entityId}`;
    case 'company':
      return `/admin/companies/${e.entityId}`;
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
