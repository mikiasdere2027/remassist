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
 * CONSENT: this loads the container, not any particular tag. Whether a tag
 * may fire before consent is configured inside GTM with Consent Mode, which
 * is where that decision belongs — it needs to hold for tags added later by
 * someone who is not editing this file. Consent Mode defaults still need
 * setting up in the container before this serves EEA or UK traffic.
 */
export default function GoogleTagManager() {
  const id = process.env.NEXT_PUBLIC_GTM_ID;
  if (!id) return null;

  return (
    <>
      <Script id="gtm-init" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
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
