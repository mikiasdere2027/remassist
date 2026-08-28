/**
 * First-touch attribution.
 *
 * The problem this fixes: `utmFromPage()` in lib/leads/schema.ts reads UTM
 * parameters off the URL of the page the form was submitted from. That only
 * works when the visitor converts on their landing page. Someone who arrives
 * on `/?utm_campaign=spring`, reads two service pages and then converts from
 * `/pricing` submits with no UTM parameters at all, and the lead is recorded
 * as if it came from nowhere. Every campaign that takes more than one
 * pageview to convert — which is all of them — loses its attribution.
 *
 * So a touch is captured when the visitor *arrives* and kept in a first-party
 * cookie until they convert:
 *
 * - `first`  is written once and never overwritten. It answers "what brought
 *            this person to us the first time", which is the question worth
 *            asking about a B2B lead that takes weeks to close.
 * - `last`   is overwritten by every new campaign-bearing visit. It answers
 *            "what brought them back the time they converted", which is what
 *            ad platforms reconcile against.
 *
 * A visit with no campaign parameters and no external referrer records
 * nothing. That is deliberate: a direct visit must never clobber a real
 * touch, which is the classic way first-touch data is silently destroyed.
 *
 * CONSENT: this writes a first-party cookie used for marketing attribution.
 * Whether it may be set before consent is a legal question, not a technical
 * one, and it is not settled here — `captureTouch` is a single call site so
 * gating it behind a consent signal later is a one-line change.
 */

/** Campaign parameters, the standard five. */
export const CAMPAIGN_KEYS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
] as const;

/** Ad-platform click identifiers. These are what the platforms reconcile on. */
export const CLICK_IDS = ['gclid', 'fbclid', 'msclkid', 'li_fat_id', 'ttclid'] as const;

export const ATTRIBUTION_KEYS = [...CAMPAIGN_KEYS, ...CLICK_IDS] as const;

/** One recorded arrival. Flat string map so it fits the `utm` jsonb column. */
export type Touch = Record<string, string>;

export interface Attribution {
  first?: Touch;
  last?: Touch;
}

/** Matches the 200-char cap lib/leads/schema.ts already applies to UTM values. */
const MAX_VALUE = 200;
/** 90 days. Longer than most B2B consideration windows, shorter than forever. */
const MAX_AGE_SEC = 90 * 24 * 60 * 60;

export const FIRST_TOUCH_COOKIE = 'ra_attr_first';
export const LAST_TOUCH_COOKIE = 'ra_attr_last';

/**
 * Build a touch from a URL and the referrer that led to it.
 *
 * Returns null when there is nothing worth recording — no campaign
 * parameters and no external referrer — so that direct navigation cannot
 * overwrite an earlier touch.
 */
export function readTouch(url: string, referrer: string | undefined): Touch | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const touch: Touch = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = parsed.searchParams.get(key);
    if (value) touch[key] = value.slice(0, MAX_VALUE);
  }

  const external = isExternalReferrer(referrer, parsed.host);
  if (!Object.keys(touch).length && !external) return null;

  if (external && referrer) touch.referrer = referrer.slice(0, MAX_VALUE);
  touch.landing_page = (parsed.origin + parsed.pathname).slice(0, MAX_VALUE);
  touch.at = new Date().toISOString();
  return touch;
}

/**
 * A referrer counts as a touch only when it is another origin. Self-referrals
 * are internal navigation — treating those as touches would rewrite the last
 * touch on every click and make the field meaningless.
 */
function isExternalReferrer(referrer: string | undefined, selfHost: string): boolean {
  if (!referrer) return false;
  try {
    return new URL(referrer).host !== selfHost;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------- browser -- */

function readCookie(name: string): Touch | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.split('; ').find((c) => c.startsWith(name + '='));
  if (!match) return undefined;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(match.slice(name.length + 1)));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    return parsed as Touch;
  } catch {
    /* A cookie we cannot parse is a cookie from an older shape, or a mangled
       one. Treat it as absent rather than throwing on every page load. */
    return undefined;
  }
}

function writeCookie(name: string, touch: Touch): void {
  if (typeof document === 'undefined') return;
  const value = encodeURIComponent(JSON.stringify(touch));
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${value}; Max-Age=${MAX_AGE_SEC}; Path=/; SameSite=Lax${secure}`;
}

/**
 * Record this arrival. Safe to call on every page view: a visit with nothing
 * campaign-like about it writes nothing, and the first touch is only ever
 * written once.
 */
export function captureTouch(): void {
  if (typeof window === 'undefined') return;
  const touch = readTouch(window.location.href, document.referrer || undefined);
  if (!touch) return;
  if (!readCookie(FIRST_TOUCH_COOKIE)) writeCookie(FIRST_TOUCH_COOKIE, touch);
  writeCookie(LAST_TOUCH_COOKIE, touch);
}

/** What to send with a conversion. Undefined when nothing was ever recorded. */
export function attributionForSubmit(): Attribution | undefined {
  const first = readCookie(FIRST_TOUCH_COOKIE);
  const last = readCookie(LAST_TOUCH_COOKIE);
  if (!first && !last) return undefined;
  return { ...(first && { first }), ...(last && { last }) };
}

/* ----------------------------------------------------------------- server -- */

/**
 * Flatten what the client reported into the single `utm` jsonb column.
 *
 * The effective campaign — last touch, falling back to whatever was on the
 * submitting page — keeps the bare `utm_*` keys, so anything already reading
 * `lead.utm.utm_source` keeps working unchanged. First touch is added
 * alongside under a `first_` prefix.
 */
export function mergeAttribution(
  pageUtm: Record<string, string> | undefined,
  attribution: Attribution | undefined,
): Record<string, string> | undefined {
  const out: Record<string, string> = {};

  /* Page params first so a real last touch overrides them: the cookie was set
     on arrival at a campaign URL, which is better evidence than a query string
     that may simply have been carried along. */
  for (const [k, v] of Object.entries(pageUtm ?? {})) out[k] = v;
  for (const [k, v] of Object.entries(attribution?.last ?? {})) out[k] = v;
  for (const [k, v] of Object.entries(attribution?.first ?? {})) out[`first_${k}`] = v;

  return Object.keys(out).length ? out : undefined;
}
