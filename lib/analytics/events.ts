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

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

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
export function analyticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (!process.env.NEXT_PUBLIC_GTM_ID) return false;
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENV !== 'production') return false;
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview') return false;
  /* Consent is checked here, at the emit, and not only in GTM's own Consent
     Mode. Consent Mode governs what Google's tags do with an event; it does
     not stop the event reaching the container in the first place, and an
     event we were not permitted to collect should not be sent at all. */
  return hasConsent('analytics');
}

/**
 * Emit one event.
 *
 * Pushing to `dataLayer` rather than calling `gtag` directly keeps GTM as the
 * single point of configuration: which tags fire on which events, and under
 * which consent state, is decided in the container, not recompiled into the
 * app. The array is created if GTM has not loaded yet — GTM drains whatever
 * it finds when it initialises, so early events are not lost.
 */
export function track<K extends keyof EventMap>(event: K, params: EventMap[K]): void {
  if (!analyticsEnabled()) return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...params });
}
