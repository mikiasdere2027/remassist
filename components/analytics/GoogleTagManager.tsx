import Script from 'next/script';
import { gtmInitScript, isContainerId } from '@/lib/analytics/tag-script';

/**
 * The GTM container.
 *
 * Renders nothing at all unless `NEXT_PUBLIC_GTM_ID` is set, so this is safe
 * to have mounted before a container exists — supplying the environment
 * variable is the whole of "turning analytics on".
 *
 * `afterInteractive` and not `beforeInteractive`: the hero is a priority
 * image and the LCP element on most pages, and a blocking third-party script
 * in the head competes with it for the network. GTM has nothing to do before
 * the page is usable.
 *
 * The <noscript> iframe is GTM's fallback for scriptless clients. It is worth
 * keeping for the small share of traffic it covers, and it costs nothing when
 * scripting is on.
 *
 * CONSENT: the Consent Mode v2 defaults are pushed in the same script tag,
 * above the loader, because they only bind to tags that load *after* them —
 * a separate <Script> would be a race, and losing it means tags firing
 * unconsented. They come from CONSENT_DEFAULT_SCRIPT in
 * lib/analytics/tag-script.ts — via gtmInitScript — so that this loader and
 * the direct GA4 one cannot drift apart; everything starts denied and is
 * relaxed by setConsent() in lib/analytics/consent.ts once the visitor
 * decides.
 *
 * These defaults cover the container as a whole, including tags added later
 * by someone who never opens this file. That is the point of putting them
 * here rather than trusting each tag's own configuration.
 */
export default function GoogleTagManager() {
  const id = process.env.NEXT_PUBLIC_GTM_ID;
  /* The id reaches an inline <script> and an iframe src, so its shape is
     checked rather than trusted — see isContainerId. */
  if (!id || !isContainerId(id)) return null;

  return (
    <>
      <Script id="gtm-init" strategy="afterInteractive">
        {gtmInitScript(id)}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${id}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
