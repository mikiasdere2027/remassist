import Script from 'next/script';

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
 * unconsented. Everything starts denied and is relaxed by setConsent() in
 * lib/analytics/consent.ts once the visitor decides.
 *
 * `wait_for_update` gives the banner a moment to restore an earlier decision
 * before tags conclude they were denied, so a returning visitor who already
 * accepted is not measured as a refusal.
 *
 * These defaults cover the container as a whole, including tags added later
 * by someone who never opens this file. That is the point of putting them
 * here rather than trusting each tag's own configuration.
 */
export default function GoogleTagManager() {
  const id = process.env.NEXT_PUBLIC_GTM_ID;
  if (!id) return null;

  return (
    <>
      <Script id="gtm-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{
  ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',
  analytics_storage:'denied',functionality_storage:'granted',
  security_storage:'granted',wait_for_update:500});
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');`}
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
