/**
 * What shape a popup takes on the page.
 *
 * Two, because they are the two honest kinds of ad and they want opposite
 * things from the visitor:
 *
 *  - 'corner' is a card in the bottom-right. It does not dim the page, does
 *    not lock the scroll and does not trap focus, so somebody halfway through
 *    reading a service page can ignore it and carry on. That is the whole
 *    point of the shape — it asks, it does not demand.
 *  - 'spotlight' is the artwork on its own, centred over a dimmed page, with
 *    nothing but a close button above it. No headline, no message, no button:
 *    the image is the ad and clicking it is the click. It blocks, and it is
 *    supposed to — a campaign someone commissioned a graphic for is worth one
 *    interruption.
 *
 * The list is one place so the enum, the admin's chooser and the renderer's
 * branch cannot disagree, the same arrangement as placement.ts beside it.
 * Which fields each template actually uses is here too, because that decides
 * three separate things — what the editor is shown, what the save action
 * demands, and what the publish gate counts as missing — and those three
 * disagreeing is how an editor ends up unable to publish a popup that looks
 * finished on screen.
 */

export const POPUP_TEMPLATE_VALUES = ['corner', 'spotlight'] as const;

export type PopupTemplate = (typeof POPUP_TEMPLATE_VALUES)[number];

/** How each template reads to an editor. */
export const POPUP_TEMPLATE_LABEL: Record<PopupTemplate, string> = {
  corner: 'Corner card',
  spotlight: 'Image spotlight',
};

/** The one line under the label in the chooser. */
export const POPUP_TEMPLATE_BLURB: Record<PopupTemplate, string> = {
  corner:
    'A small card in the bottom-right corner. The page behind it stays readable and clickable.',
  spotlight:
    'The image on its own, centred over the dimmed page, with only a close button above it.',
};

export function isPopupTemplate(value: string): value is PopupTemplate {
  return (POPUP_TEMPLATE_VALUES as readonly string[]).includes(value);
}

/**
 * True when the template renders the headline, message and CTA button as text.
 *
 * False for 'spotlight', which renders none of the three: the artwork carries
 * the wording, and the link lives on the image itself.
 */
export function templateShowsCopy(template: string): boolean {
  return template !== 'spotlight';
}

/**
 * True when the template is nothing but the image, so there has to be one.
 *
 * A 'corner' popup with no image is a perfectly good text push; a 'spotlight'
 * with no image is an empty box, which is why this is a publish requirement
 * rather than a suggestion.
 */
export function templateNeedsImage(template: string): boolean {
  return template === 'spotlight';
}
