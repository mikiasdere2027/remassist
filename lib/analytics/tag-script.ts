/**
 * The inline snippets the tag loaders put into the page, and the id formats
 * they will accept.
 *
 * These are strings of JavaScript compiled into HTML, where a typo is not a
 * build error but a tag that quietly never loads — so they belong somewhere a
 * test can execute them, which a .tsx file behind next/script is not.
 *
 * The consent defaults have a second reason to be here: they are the legal
 * posture of the whole site, and two copies of that string in two loaders
 * would eventually drift into one granting what the other denies.
 */

/**
 * Consent Mode v2 defaults — everything denied except what a site cannot
 * function without.
 *
 * Queued before the tag library arrives, because defaults only bind to tags
 * that load *after* them; a loader that pushes these late has already fired
 * unconsented tags. They cover a GTM container as a whole, including tags
 * added later by someone who never opens this file, which is the point of
 * putting them here rather than trusting each tag's own configuration.
 *
 * `wait_for_update` gives the banner a moment to restore an earlier decision
 * before tags conclude they were denied, so a returning visitor who already
 * accepted is not measured as a refusal.
 *
 * The denied baseline is relaxed by setConsent() in ./consent.ts, whose
 * googleConsentPayload() maps this site's two categories onto these same
 * signal names. Change one and read the other.
 *
 * It also defines the page-level `gtag` the snippets below call, so a loader
 * concatenating this can go straight to its own commands.
 */
export const CONSENT_DEFAULT_SCRIPT = `window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{
  ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',
  analytics_storage:'denied',functionality_storage:'granted',
  security_storage:'granted',wait_for_update:500});`;

/**
 * Ids are checked, not trusted, because both are interpolated into an inline
 * <script>. The value comes from the environment rather than from a visitor,
 * so this is not defence against an attacker — it is defence against the
 * likely mistake, which is pasting the whole snippet Google hands you into
 * the variable and turning the page's own markup into whatever it contained.
 *
 * `GT-` as well as `G-`: Google now issues GT- ids for new web tags, and
 * gtag.js configures either.
 */
const MEASUREMENT_ID = /^G(T)?-[A-Z0-9]{4,20}$/i;
const CONTAINER_ID = /^GTM-[A-Z0-9]{4,12}$/i;

export function isMeasurementId(id: string): boolean {
  return MEASUREMENT_ID.test(id);
}

export function isContainerId(id: string): boolean {
  return CONTAINER_ID.test(id);
}

/**
 * The GTM container loader — Google's own snippet, with the consent defaults
 * ahead of it.
 */
export function gtmInitScript(containerId: string): string {
  return `${CONSENT_DEFAULT_SCRIPT}
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${containerId}');`;
}

/**
 * The GA4 tag's configuration, for gtag.js loaded directly.
 *
 * `config` also sends the first page_view. Nothing here loads gtag.js itself
 * — the loader renders that as a second <Script src>, and the order does not
 * matter: gtag.js drains this queue in push order whenever it arrives, so the
 * consent defaults are read before the config either way.
 */
export function ga4InitScript(measurementId: string): string {
  return `${CONSENT_DEFAULT_SCRIPT}
gtag('js',new Date());
gtag('config','${measurementId}');`;
}
