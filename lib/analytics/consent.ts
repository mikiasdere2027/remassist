/**
 * Consent state.
 *
 * The question this answers is not "may we track" but "may we *store*".
 * ePrivacy — the cookie law, separate from GDPR — requires consent before
 * writing anything to a visitor's device that is not strictly necessary for a
 * service they asked for. Attribution is not strictly necessary by that test,
 * however useful it is to us, so the attribution cookie waits.
 *
 * Two categories, because they carry different risk and a visitor may
 * reasonably allow one and refuse the other:
 *
 * - `analytics`  aggregate measurement — pageviews, funnels, Core Web Vitals
 * - `marketing`  attribution and advertising — the campaign cookie, ad tags,
 *                and embedded third-party media such as the home hero's clip
 *
 * The record of the decision is itself a cookie, and that one needs no
 * consent: a consent record is strictly necessary by definition, since
 * without it we would have to ask again on every page.
 *
 * MODE is a legal decision, not a technical one, and it is deliberately
 * explicit rather than inferred from geography — see `consentMode()`.
 */

export type ConsentCategory = 'analytics' | 'marketing';
export type ConsentState = Record<ConsentCategory, boolean>;

export const CONSENT_COOKIE = 'ra_consent';

/**
 * Bump to re-ask everyone. Required when categories change meaning or a new
 * vendor is added — consent given for what we did last year does not cover
 * something new, and reusing the old record would be consent-washing.
 *
 * 2: the home hero's clip moved from a self-hosted file to a YouTube embed,
 *    which is a new vendor under `marketing`. Anyone who answered version 1
 *    answered a question that did not include it, so they are asked again.
 */
const CONSENT_VERSION = 2;

const MAX_AGE_SEC = 180 * 24 * 60 * 60; // six months, then ask again

export const GRANT_ALL: ConsentState = { analytics: true, marketing: true };
export const DENY_ALL: ConsentState = { analytics: false, marketing: false };

/**
 * 'opt-in'  nothing is stored until the visitor agrees. Required for the EEA
 *           and the UK. This is the default, because defaulting the other way
 *           makes a legal exposure the consequence of forgetting to think
 *           about it.
 * 'off'     no banner, everything granted. Only defensible if this site does
 *           not serve EEA or UK visitors — that is a decision for the
 *           business to make and record, not for this file to assume.
 */
export function consentMode(): 'opt-in' | 'off' {
  return process.env.NEXT_PUBLIC_CONSENT_MODE === 'off' ? 'off' : 'opt-in';
}

/** The recorded decision, or null when the visitor has not been asked yet. */
export function readConsent(): ConsentState | null {
  if (consentMode() === 'off') return GRANT_ALL;
  if (typeof document === 'undefined') return null;

  const match = document.cookie.split('; ').find((c) => c.startsWith(CONSENT_COOKIE + '='));
  if (!match) return null;
  try {
    const raw: unknown = JSON.parse(decodeURIComponent(match.slice(CONSENT_COOKIE.length + 1)));
    if (!raw || typeof raw !== 'object') return null;
    const rec = raw as Record<string, unknown>;
    /* A record from an older version is not a decision about what we do now. */
    if (rec.v !== CONSENT_VERSION) return null;
    return { analytics: rec.analytics === true, marketing: rec.marketing === true };
  } catch {
    return null;
  }
}

/** False whenever the visitor has not decided — absence of no is not yes. */
export function hasConsent(category: ConsentCategory): boolean {
  return readConsent()?.[category] === true;
}

type Listener = (state: ConsentState) => void;
const listeners = new Set<Listener>();

/** Subscribe to decisions. Returns an unsubscribe function. */
export function onConsentChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Record a decision, tell Google about it, and wake anything waiting on it.
 *
 * The Consent Mode update is pushed from here rather than from the banner
 * because this is the single point every decision passes through — a second
 * place to change consent would otherwise be a second place to forget to
 * inform the tags, and the failure would be silent.
 */
export function setConsent(state: ConsentState): void {
  if (typeof document === 'undefined') return;

  const value = encodeURIComponent(
    JSON.stringify({ v: CONSENT_VERSION, ...state, at: new Date().toISOString() }),
  );
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${MAX_AGE_SEC}; Path=/; SameSite=Lax${secure}`;

  pushConsentUpdate(state);
  for (const fn of listeners) fn(state);
}

/** Google Consent Mode v2 signal names, mapped from our two categories. */
export function googleConsentPayload(state: ConsentState): Record<string, 'granted' | 'denied'> {
  const marketing = state.marketing ? 'granted' : 'denied';
  return {
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
    analytics_storage: state.analytics ? 'granted' : 'denied',
  };
}

function pushConsentUpdate(state: ConsentState): void {
  if (typeof window === 'undefined') return;
  const dl = (window.dataLayer = window.dataLayer ?? []);
  /* Consent Mode reads a genuine Arguments object — the shape `gtag()` pushes
     when it forwards its own `arguments`. An object literal with 0/1/2 keys
     looks identical in a console and is silently ignored, so build a real one
     by applying a function. */
  /* Declared with no parameters and typed at the cast: `arguments` is the
     whole point here, and naming parameters we never read would only invite
     someone to start reading them. */
  const gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    dl.push(arguments as unknown as Record<string, unknown>);
  } as (...args: unknown[]) => void;
  gtag('consent', 'update', googleConsentPayload(state));
}
