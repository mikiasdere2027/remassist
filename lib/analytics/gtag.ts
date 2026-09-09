/**
 * The one function that writes to `dataLayer` in Google's own calling
 * convention, and the one place the global is declared.
 *
 * `gtag(...)` does not take a normal payload: the tag libraries read the
 * *Arguments object* it pushes, positionally. An object literal with keys 0,
 * 1 and 2 prints identically in a console and is silently ignored — the kind
 * of bug that surfaces weeks later as "consent updates never arrived", with
 * nothing logged anywhere to say so. Building that object is therefore done
 * here, once, instead of at each call site.
 *
 * Both loaders — components/analytics/GoogleTagManager.tsx and
 * components/analytics/GoogleAnalytics.tsx — define an identical inline
 * `gtag` in the page itself, because the consent defaults have to be queued
 * before the tag library loads. This module is the equivalent for module code
 * running after them, and pushes to the same queue.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Queue one gtag call. Creates `dataLayer` if no tag has loaded yet — both
 * gtm.js and gtag.js drain whatever they find on arrival, so an early call is
 * delayed rather than lost.
 */
export function gtagPush(...args: unknown[]): void {
  if (typeof window === 'undefined') return;
  const dl = (window.dataLayer = window.dataLayer ?? []);
  /* Declared with no parameters and typed at the cast: `arguments` is the
     whole point here, and naming parameters we never read would only invite
     someone to start reading them. */
  const gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    dl.push(arguments as unknown as Record<string, unknown>);
  } as (...args: unknown[]) => void;
  gtag(...args);
}
