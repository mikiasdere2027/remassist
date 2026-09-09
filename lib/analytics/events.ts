/**
 * The event vocabulary, in one place.
 *
 * Analytics decays when event names are string literals sprinkled through
 * components: two spellings of the same event become two funnels, a rename
 * silently orphans a report, and nobody can answer "what do we actually
 * track" without grepping. So the names live here, typed, and `track()` is
 * the only way to emit one.
 *
 * GA4's own recommended names are used wherever one fits (`generate_lead`),
 * because those get first-class treatment in the GA UI and in Ads conversion
 * import. Custom names are used only where GA has nothing.
 *
 * NO PII. Never put an email, name, phone number or free-text message in a
 * parameter. Those belong in the database row, which is ours; a GA property
 * is not a safe place for them and in most jurisdictions putting them there
 * is unlawful. The type below is deliberately narrow to make it awkward.
 */

import { hasConsent } from './consent';
import { gtagPush } from './gtag';

export interface EventParams {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Event name → the parameters it carries.
 *
 * Adding an event here and emitting it is the whole workflow; there is no
 * second place to register it.
 */
export interface EventMap {
  /** A lead reached the database. The conversion to mark in GA4. */
  generate_lead: { lead_source: string; has_quiz: boolean };
  /** Fit-finder opened — the first question was answered, not merely rendered. */
  quiz_start: { quiz_id: string };
  /** Fit-finder answered through to a result. */
  quiz_complete: { quiz_id: string; service: string; seats: number };
  /** Outbound click to Calendly. NOT a booking — see the note below. */
  book_click: { placement: string };
  /** The Ask RemAssist widget was opened. */
  chat_open: { placement: string };
  /** An interview clip was played. */
  video_play: { video_id: string };
  /**
   * A popup ad became visible to the visitor.
   *
   * `popup_id` is the popup's tracking key — the campaign's identity in admin —
   * never its headline or message. The visitor's copy is content, not a
   * measurement, and it is exactly the free text this file's NO-PII rule exists
   * to keep out of a GA property.
   */
  popup_view: { popup_id: string; campaign: string; placement: string };
  /** The popup's CTA was clicked. The view always happens first. */
  popup_click: { popup_id: string; campaign: string; placement: string };
}

/**
 * `book_click` is a click, not a booking. The booking completes on Calendly,
 * off this origin, where no browser tag of ours can see it. Treating this
 * event as the conversion optimises spend toward people who click and then
 * abandon the scheduler. The real conversion has to come from Calendly's
 * webhook into the GA4 Measurement Protocol, server side. Until that exists,
 * read this event as intent, not outcome.
 */

/**
 * `quiz_id` exists because there is one QuizLogic rendered in two places —
 * '/qualify', where the quiz is the page, and the home page's fit finder,
 * eight sections down. Without the parameter both runs land in one
 * undifferentiated funnel, and "does the fit finder earn its place on the
 * home page" becomes unanswerable.
 */

/* `window.dataLayer` is declared once, in ./gtag.ts, alongside the only
   function that writes to it in Google's calling convention. */

/**
 * Whether events should actually leave the browser.
 *
 * Preview deploys share the production GA property unless something stops
 * them, and a fortnight of branch traffic in the conversion report is very
 * hard to unpick after the fact.
 *
 * This used to test `NEXT_PUBLIC_VERCEL_ENV === 'production'`, which is set
 * by Vercel and by nothing else. Production is the VPS (see deploy/), where
 * that variable does not exist — so the check silently suppressed every event
 * on the only host that mattered, with no error anywhere to say so. The gate
 * is now an explicit variable both hosts set: scoped to Production only in
 * the Vercel dashboard, and written into shared/.env on the box.
 *
 * The second line is belt and braces. `NEXT_PUBLIC_ANALYTICS_ENV` is easy to
 * paste into all three Vercel environments at once, and preview traffic in
 * the production property is exactly the failure this function exists to
 * prevent; Vercel's own variable is authoritative about which deploy this is.
 */
export function measurementEnv(): boolean {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENV !== 'production') return false;
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview') return false;
  return true;
}

/**
 * Which tag is on the page, if any.
 *
 * 'gtm'  a container: events are pushed as `{event, ...params}` objects and
 *        the container decides which tags they fire.
 * 'ga4'  gtag.js on its own: there is no container to route anything, so
 *        events have to be emitted as GA4 events directly.
 * null   nothing is configured, so nothing is emitted.
 *
 * GTM wins when both ids are set, and components/analytics/GoogleAnalytics.tsx
 * makes the same call by rendering null — the two files have to agree, or the
 * events would go somewhere the tag is not.
 */
export function measurementTag(): 'gtm' | 'ga4' | null {
  if (process.env.NEXT_PUBLIC_GTM_ID) return 'gtm';
  if (process.env.NEXT_PUBLIC_GA_ID) return 'ga4';
  return null;
}

export function analyticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (!measurementTag()) return false;
  if (!measurementEnv()) return false;
  /* Consent is checked here, at the emit, and not only in Google's own
     Consent Mode. Consent Mode governs what Google's tags do with an event;
     it does not stop the event reaching the container in the first place, and
     an event we were not permitted to collect should not be sent at all. */
  return hasConsent('analytics');
}

/**
 * Emit one event.
 *
 * The payload shape follows the tag, and the two are not interchangeable.
 *
 * With a container, pushing a `{event, ...params}` object rather than calling
 * `gtag` keeps GTM as the single point of configuration: which tags fire on
 * which events, and under which consent state, is decided in the container,
 * not recompiled into the app.
 *
 * gtag.js on its own ignores those objects completely — it reads Arguments
 * objects — so with GA4 direct the same event has to be emitted as
 * `gtag('event', name, params)`. Push the container shape at a bare GA4 tag
 * and nothing arrives, while `dataLayer` fills with entries nothing reads and
 * no error is raised anywhere.
 *
 * Either way the array is created if the tag has not loaded yet: gtm.js and
 * gtag.js both drain what they find on arrival, so early events are not lost.
 */
export function track<K extends keyof EventMap>(event: K, params: EventMap[K]): void {
  if (!analyticsEnabled()) return;

  if (measurementTag() === 'gtm') {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event, ...params });
    return;
  }
  gtagPush('event', event, params);
}
