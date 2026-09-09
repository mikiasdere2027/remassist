import { describe, expect, it } from 'vitest';
import { missingForPopupPublish, requiredFieldsFor } from './completeness';
import {
  POPUP_TEMPLATE_BLURB,
  POPUP_TEMPLATE_LABEL,
  POPUP_TEMPLATE_VALUES,
  isPopupTemplate,
  templateNeedsImage,
  templateShowsCopy,
} from './templates';

/**
 * The template decides three things that have to agree: what the renderer
 * draws (components/popups/PopupManager.tsx), which fields the editor shows,
 * and what the save and publish actions demand. The third is the one worth
 * pinning down here — an editor who cannot publish a finished-looking popup,
 * or who is refused a save over a field the form never showed, is the failure
 * these rules exist to prevent.
 */

const complete = {
  name: 'July push',
  title: 'Book your free call this week',
  message: 'Fifteen minutes, no obligation.',
  image: '/uploads/popup/art.png',
  ctaLabel: 'Book a call',
  ctaHref: 'https://example.com/book',
  campaign: 'Summer promo',
  trackingKey: 'summer-promo-2026',
  template: 'corner',
};

describe('popup templates', () => {
  it('keeps the list, its labels and its blurbs in step', () => {
    for (const value of POPUP_TEMPLATE_VALUES) {
      expect(isPopupTemplate(value)).toBe(true);
      expect(POPUP_TEMPLATE_LABEL[value]).toBeTruthy();
      expect(POPUP_TEMPLATE_BLURB[value]).toBeTruthy();
    }
    expect(isPopupTemplate('lightbox')).toBe(false);
  });

  it('says which template renders copy and which needs artwork', () => {
    expect(templateShowsCopy('corner')).toBe(true);
    expect(templateNeedsImage('corner')).toBe(false);
    expect(templateShowsCopy('spotlight')).toBe(false);
    expect(templateNeedsImage('spotlight')).toBe(true);
  });
});

describe('what each template requires before publishing', () => {
  it('asks a corner card for its copy but not for artwork', () => {
    const required = requiredFieldsFor('corner');
    expect(required).toContain('Message');
    expect(required).toContain('CTA label');
    expect(required).not.toContain('Image');

    /* A text-only push is a valid corner card. */
    expect(missingForPopupPublish({ ...complete, image: null })).toEqual([]);
    expect(missingForPopupPublish({ ...complete, message: '  ' })).toEqual(['Message']);
  });

  it('asks a spotlight for artwork and not for copy it never shows', () => {
    const required = requiredFieldsFor('spotlight');
    expect(required).toContain('Image');
    expect(required).not.toContain('Message');
    expect(required).not.toContain('CTA label');

    const spotlight = { ...complete, template: 'spotlight', message: '', ctaLabel: '' };
    expect(missingForPopupPublish(spotlight)).toEqual([]);
    expect(missingForPopupPublish({ ...spotlight, image: null })).toEqual(['Image']);
  });

  it('requires the headline either way — a spotlight uses it as alt text', () => {
    expect(missingForPopupPublish({ ...complete, title: '' })).toEqual(['Title']);
    expect(
      missingForPopupPublish({ ...complete, template: 'spotlight', title: '', message: '', ctaLabel: '' }),
    ).toEqual(['Title']);
  });

  it('always requires the link, the campaign and the tracking key', () => {
    for (const template of POPUP_TEMPLATE_VALUES) {
      const required = requiredFieldsFor(template);
      expect(required).toContain('Name');
      expect(required).toContain('Title');
      expect(required).toContain('CTA link');
      expect(required).toContain('Campaign');
      expect(required).toContain('Tracking key');
    }
  });

  it('lists what is missing in editor order', () => {
    const bare = {
      ...complete,
      name: '',
      title: '',
      message: '',
      ctaLabel: '',
      ctaHref: '',
      campaign: '',
      trackingKey: '',
    };
    expect(missingForPopupPublish(bare)).toEqual([
      'Name',
      'Title',
      'Message',
      'CTA label',
      'CTA link',
      'Campaign',
      'Tracking key',
    ]);
  });
});
