/**
 * Chat KB + matching tests.
 *
 * Locks the scoring/matching behaviour so the live chat never answers a service
 * question with the wrong (or stale) info, and never pretends to do work that is
 * out of scope. Mirrors the patterns in lib/quiz/quiz.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { KB, OUTSIDE } from './kb';
import { match, outsideScope } from './match';

describe('knowledge base health', () => {
  it('has unique entry ids', () => {
    const ids = KB.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers all 12 service lines with a routable link', () => {
    const serviceLinks = KB.flatMap((e) => e.links ?? []).map(([, href]) => href);
    const expected = [
      '/services/sales-and-revenue',
      '/services/customer-service-agents',
      '/services/finance-and-accounting',
      '/services/virtual-back-office-team',
      '/services/gtm-teams',
      '/services/sdr-as-a-service',
      '/services/managed-it',
      '/services/hr-and-recruiting',
      '/services/industry-specific',
      '/services/marketing-and-content',
      '/services/ai-and-automation',
      '/services/extra-services',
    ];
    for (const route of expected) {
      expect(serviceLinks).toContain(route);
    }
  });

  it('every chip id resolves to a real entry', () => {
    const ids = new Set(KB.map((e) => e.id));
    for (const e of KB) {
      for (const chip of e.chips ?? []) {
        expect(ids, `chip "${chip}" on entry "${e.id}"`).toContain(chip);
      }
    }
  });
});

describe('matching', () => {
  it('routes service questions to the right entry', () => {
    expect(match('do you offer hr and recruiting?').entry.id).toBe('hr');
    expect(match('tell me about managed it support').entry.id).toBe('managedit');
    expect(match('what is the pricing for a seat').entry.id).toBe('pricing');
    expect(match('how does onboarding work').entry.id).toBe('how_it_works');
    expect(match('i need customer support agents').entry.id).toBe('customer_service');
    expect(match('sdr as a service').entry.id).toBe('sdr');
  });

  it('handles a typo with the tolerance', () => {
    expect(['pricing']).toContain(match('whats the pricin?').entry.id);
  });

  it('flags out-of-scope trades before matching', () => {
    expect(outsideScope('do you have a home cleaning service?')).toBe('cleaning');
    expect(outsideScope('i need a plumber')).toBe('plumbing');
    expect(outsideScope('what is your pricing')).toBeNull();
  });

  it('reports all outside trades as declared', () => {
    expect(OUTSIDE.length).toBeGreaterThan(10);
    expect(OUTSIDE.every((o) => o.kw.length > 0 && o.label.length > 0)).toBe(true);
  });
});