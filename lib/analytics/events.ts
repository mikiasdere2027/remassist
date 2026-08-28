/**
 * The event vocabulary, in one place.
 *
 * Analytics decays when event names are string literals sprinkled through
 * components: two spellings of the same event become two funnels, a rename
 * silently orphans a report, and nobody can answer "what do we actually
 * track" without grepping. So the names live here, typed, and `track()` is
 * the only way to emit one.
 *
 * GA4's own recommended names are used wherever one fits (`generate_lead`,
 * `select_item`), because those get first-class treatment in the GA UI and in
 * Ads conversion import. Custom names are used only where GA has nothing.
 *
 * NO PII. Never put an email, name, phone number or free-text message in a
 * parameter. Those belong in the database row, which is ours; a GA property
 * is not a safe place for them and in most jurisdictions putting them there
 * is unlawful. The type below is deliberately narrow to make it awkward.
 */

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
  /** Fit-finder opened. */
  quiz_start: Record<string, never>;
  /** Fit-finder answered through to a result. */
  quiz_complete: { service: string; seats?: number };
  /** Outbound click to Calendly. NOT a booking — see the note below. */
  book_click: { placement: string };
  /** A seat tier was chosen on a pricing or service page. */
  select_item: { item_id: string; item_category: string };
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
 * hard to unpick after the fact. `NEXT_PUBLIC_VERCEL_ENV` is 'production'
 * only for the production deployment; it is 'preview' for every branch and
 * undefined locally.
 */
export function analyticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (!process.env.NEXT_PUBLIC_GTM_ID) return false;
  return process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';
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
