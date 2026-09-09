import Script from 'next/script';
import { measurementEnv } from '@/lib/analytics/events';
import { ga4InitScript, isMeasurementId } from '@/lib/analytics/tag-script';

/**
 * The GA4 tag, loaded directly (gtag.js) rather than through a container.
 *
 * Renders nothing unless `NEXT_PUBLIC_GA_ID` is set, so supplying that
 * variable is the whole of "turning GA on" — and nothing at all loads in the
 * environments where it is unset.
 *
 * GTM WINS. If `NEXT_PUBLIC_GTM_ID` is also set this renders null, because
 * the two are alternatives and not layers: a GA4 configuration tag inside the
 * container plus this tag on the page means every page_view and every event
 * is counted twice, and a doubled conversion count is worse than none — it
 * looks plausible. So configure GA4 *in the container* when there is one, and
 * leave `NEXT_PUBLIC_GA_ID` unset there.
 *
 * `measurementEnv()` is the same environment gate lib/analytics/events.ts
 * applies to events. Without it the tag would load on previews and staging
 * and post page views into the production property while every custom event
 * from the same page was being suppressed — measurement that is half on is
 * harder to reason about than measurement that is off.
 *
 * `afterInteractive`, not `beforeInteractive`: the hero is a priority image
 * and the LCP element on most pages, and a blocking third-party script in the
 * head competes with it for the network.
 *
 * CONSENT: the Consent Mode v2 defaults come first, from the one shared
 * constant in lib/analytics/tag-script.ts, and in the same script tag as the
 * config call — they only bind to tags that load after them, so a separate
 * <Script> would be a race, and losing it means GA writing cookies before the
 * visitor has been asked. Everything starts denied; setConsent() relaxes it.
 * Until then GA4 still sends cookieless pings, which is what Consent Mode is
 * for: no storage on the device, no identifiers, aggregate modelling only.
 *
 * PAGE VIEWS AFTER THE FIRST. `config` sends one page_view, and App Router
 * navigations never reload the page. The subsequent ones are counted by GA4's
 * enhanced measurement — "page changes based on browser history events",
 * which is on by default in a new property and catches the History API calls
 * Next makes. If that is ever switched off in the GA UI this site will report
 * one page view per session, and the fix belongs here: a route-change effect
 * emitting page_view manually. Do not add one *while* enhanced measurement is
 * on, or every navigation lands twice.
 */
export default function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  /* The id reaches an inline <script>, so its shape is checked rather than
     trusted — see isMeasurementId. */
  if (!id || !isMeasurementId(id)) return null;
  if (process.env.NEXT_PUBLIC_GTM_ID) return null;
  if (!measurementEnv()) return null;

  return (
    <>
      <Script id="ga4-init" strategy="afterInteractive">
        {ga4InitScript(id)}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
    </>
  );
}
