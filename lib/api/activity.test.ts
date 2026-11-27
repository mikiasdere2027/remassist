import { describe, expect, it } from 'vitest';
import { activityHref } from './activity';

describe('activityHref', () => {
  it('links CRM entries to their page', () => {
    expect(activityHref({ entity: 'deal', entityId: 'd1' })).toBe('/admin/deals/d1');
    expect(activityHref({ entity: 'proposal', entityId: 'p1' })).toBe('/admin/proposals/p1');
    expect(activityHref({ entity: 'engagement', entityId: 'e1' })).toBe('/admin/customers/e1');
    expect(activityHref({ entity: 'company', entityId: 'c1' })).toBe('/admin/companies/c1');
  });
  it('has no link for entries without a page, or without an id', () => {
    expect(activityHref({ entity: 'contact', entityId: 'x' })).toBeNull();
    expect(activityHref({ entity: 'deal', entityId: null })).toBeNull();
  });
});
