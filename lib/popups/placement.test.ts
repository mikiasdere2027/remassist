import { describe, expect, it } from 'vitest';
import {
  POPUP_PLACEMENT_LABEL,
  POPUP_PLACEMENT_VALUES,
  isPopupPlacement,
  placementForPathname,
  popupAppliesTo,
} from './placement';

/**
 * The public renderer matches a popup's placement against the visitor's
 * pathname (components/popups/PopupManager.tsx). These are the rules the whole
 * placement feature is built on, so they are worth pinning down directly:
 * "Every page" on any path, a directory placement on every route under it, and
 * a scoped placement never leaking onto a page it was not given.
 */
describe('popup placements', () => {
  it('resolves every public path to its placement', () => {
    expect(placementForPathname('/')).toBe('home');
    expect(placementForPathname('/services')).toBe('services');
    expect(placementForPathname('/services/sdr-as-a-service')).toBe('services');
    expect(placementForPathname('/pricing')).toBe('pricing');
    expect(placementForPathname('/blog')).toBe('blog');
    expect(placementForPathname('/blog/some-guide')).toBe('blog');
    expect(placementForPathname('/faq')).toBe('faq');
    expect(placementForPathname('/reviews')).toBe('reviews');
  });

  it('leaves paths without a placement unmatched', () => {
    /* Not in the placement map: a popup scoped to a page group must never leak
       onto these. */
    expect(placementForPathname('/qualify')).toBeNull();
    expect(placementForPathname('/how-it-works')).toBeNull();
    expect(placementForPathname('/contact')).toBeNull();
    expect(placementForPathname('/admin/content/popups')).toBeNull();
  });

  it('lets a home placement apply to the home page only', () => {
    expect(popupAppliesTo('home', '/')).toBe(true);
    expect(popupAppliesTo('home', '/qualify')).toBe(false);
    expect(popupAppliesTo('home', '/services')).toBe(false);
  });

  it('applies a services placement across every service slug', () => {
    expect(popupAppliesTo('services', '/services')).toBe(true);
    expect(popupAppliesTo('services', '/services/hr-and-recruiting')).toBe(true);
    expect(popupAppliesTo('services', '/qualify')).toBe(false);
  });

  it('applies "everywhere" on any path, including unmatched ones', () => {
    expect(popupAppliesTo('everywhere', '/')).toBe(true);
    expect(popupAppliesTo('everywhere', '/qualify')).toBe(true);
    expect(popupAppliesTo('everywhere', '/blog/some-guide')).toBe(true);
    expect(popupAppliesTo('everywhere', '/admin/content/popups')).toBe(true);
  });

  it('keeps the enum and its labels in step', () => {
    for (const value of POPUP_PLACEMENT_VALUES) {
      expect(isPopupPlacement(value)).toBe(true);
      expect(POPUP_PLACEMENT_LABEL[value]).toBeTruthy();
    }
    expect(isPopupPlacement('everywhere-and-then-some')).toBe(false);
  });
});