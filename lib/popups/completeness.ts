import { templateNeedsImage, templateShowsCopy } from './templates';

/**
 * What a popup needs before it may be published.
 *
 * One shared fact with three readers, for the same reason the blog's copy is:
 * the save action must refuse a popup missing what its template renders, the
 * publish action must refuse an incomplete one, and the editor must be able to
 * say which fields are missing before anybody presses the button. Two copies
 * of this list would drift, and the version that drifts is always the one the
 * editor sees.
 *
 * The list depends on the template, because the two templates render different
 * things (lib/popups/templates.ts). A corner card needs its headline, message
 * and button wording; a spotlight renders none of the three and needs the
 * artwork instead, since without it there is nothing to show. The headline is
 * required either way — a spotlight uses it as the image's alt text, which is
 * the only description a screen reader gets.
 */

export type PopupForPublish = {
  name: string;
  title: string;
  message: string;
  image: string | null;
  ctaLabel: string;
  ctaHref: string;
  campaign: string;
  trackingKey: string;
  template: string;
};

/**
 * Field order matches the editor, so the list reads top to bottom. `on` is
 * which templates the field applies to; a field left out of a template is not
 * missing when empty, because nothing renders it.
 */
const FIELDS: ReadonlyArray<{
  label: string;
  of: (p: PopupForPublish) => string | null;
  on?: (template: string) => boolean;
}> = [
  { label: 'Name', of: (p) => p.name },
  { label: 'Title', of: (p) => p.title },
  { label: 'Message', of: (p) => p.message, on: templateShowsCopy },
  { label: 'Image', of: (p) => p.image, on: templateNeedsImage },
  { label: 'CTA label', of: (p) => p.ctaLabel, on: templateShowsCopy },
  { label: 'CTA link', of: (p) => p.ctaHref },
  { label: 'Campaign', of: (p) => p.campaign },
  { label: 'Tracking key', of: (p) => p.trackingKey },
];

/** The labels a template requires at all, empty or not. */
export function requiredFieldsFor(template: string): string[] {
  return FIELDS.filter((f) => !f.on || f.on(template)).map((f) => f.label);
}

/** The labels of everything still missing, in editor order. Empty means ready. */
export function missingForPopupPublish(popup: PopupForPublish): string[] {
  return FIELDS.filter((f) => (!f.on || f.on(popup.template)) && !(f.of(popup) ?? '').trim())
    .map((f) => f.label);
}

/** Sentence-ready: "Title, Message and CTA link". */
export function listMissing(labels: string[]): string {
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}
