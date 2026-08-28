'use client';

import { useEffect, useState } from 'react';
import styles from './ConsentBanner.module.css';
import { DENY_ALL, GRANT_ALL, consentMode, readConsent, setConsent } from '@/lib/analytics/consent';

/**
 * Asks once, then never again until the decision expires or the consent
 * version is bumped.
 *
 * Rendered only after mount. The decision lives in a cookie, and the server
 * has no idea what it says while rendering a static page — showing the banner
 * during SSR and hiding it on hydration would flash it at every returning
 * visitor who already answered. `decided === null` is the "not yet known"
 * state and renders nothing, which is also correct on the server.
 *
 * Both buttons are given equal visual weight on purpose; see the stylesheet.
 *
 * COPY: the wording below is a plain-language placeholder. It should be
 * reviewed against whatever the privacy policy actually promises, and the
 * link target confirmed, before this serves real traffic.
 */
export default function ConsentBanner() {
  const [decided, setDecided] = useState<boolean | null>(null);

  useEffect(() => {
    if (consentMode() === 'off') { setDecided(true); return; }
    setDecided(readConsent() !== null);
  }, []);

  if (decided !== false) return null;

  function decide(granted: boolean) {
    setConsent(granted ? GRANT_ALL : DENY_ALL);
    setDecided(true);
  }

  return (
    /* role=dialog would demand focus and trap it, which is hostile for
       something that is not blocking the page. A labelled region announces
       itself to a screen reader without stealing the visitor's place. */
    <section className={styles.banner} aria-label="Cookie choices">
      <p className={styles.text}>
        <strong className={styles.title}>We&apos;d like to measure how this site is used</strong>
        Analytics and advertising cookies help us see which pages bring teams to us, and
        they let the video on our home page play by itself. They are not set unless you
        agree, and the site works the same either way — the video waits for a click.{' '}
        <a href="/privacy-policy">Read our privacy policy</a>.
      </p>
      <div className={styles.actions}>
        <button type="button" className={`${styles.btn} ${styles.reject}`} onClick={() => decide(false)}>
          Reject
        </button>
        <button type="button" className={`${styles.btn} ${styles.accept}`} onClick={() => decide(true)}>
          Accept
        </button>
      </div>
    </section>
  );
}
