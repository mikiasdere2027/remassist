/**
 * The business details the public site shows (phone, email, booking link,
 * social links), edited in the admin under "Site details" and served by the
 * backend at GET /v1/public/site-settings. This file is the shape and the
 * fallback: the values the site always showed, used when the backend can't be
 * reached (and kept equal to the backend's defaults by contract.test.ts).
 */
export interface SiteSettings {
  /** As written on the page, e.g. "(832) 230-2194". */
  phone: string;
  email: string;
  /** Where "Book a call" goes (the modal embeds it). */
  bookingUrl: string;
  linkedin: string;
  instagram: string;
  youtube: string;
  trustpilot: string;
  google: string;
}

/** What the API returns: the settings plus the links derived from them. */
export interface SiteSettingsWithLinks extends SiteSettings {
  tel: string;
  mailto: string;
}

export const SITE_DEFAULTS: SiteSettingsWithLinks = {
  phone: '(832) 230-2194',
  email: 'support@remassistance.com',
  bookingUrl: 'https://calendly.com/j-zemene-remassistance/new-meeting',
  linkedin: 'https://www.linkedin.com/company/rem-assistance/',
  instagram: 'https://www.instagram.com/remassist',
  youtube: 'https://www.youtube.com/@RemAssistant',
  trustpilot: 'https://www.trustpilot.com/review/remassistance.com',
  google: 'https://www.google.com/maps?cid=10709335694294039363',
  tel: 'tel:+18322302194',
  mailto: 'mailto:support@remassistance.com',
};
