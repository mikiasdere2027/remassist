'use client';

import { useEffect } from 'react';
import { captureTouch, persistPendingTouch } from '@/lib/analytics/attribution';
import { onConsentChange } from '@/lib/analytics/consent';

/**
 * Records the campaign that brought this visitor in, once per page load.
 *
 * Mounted in the root layout so it runs on whichever page they happen to land
 * on — a campaign rarely points at the homepage.
 *
 * Deliberately NOT wired to `useSearchParams`. That hook would re-run this on
 * client-side navigation, but it also opts every page that renders it out of
 * static generation unless it is wrapped in Suspense, and this sits in the
 * root layout — the cost would be the whole site. The trade is sound: a
 * campaign arrival is a click from somewhere else, which is a full document
 * load, so mount is exactly when it happens. Internal navigation carries no
 * new campaign to record.
 *
 * Storage waits for consent; only the computation happens here.
 *
 * Renders nothing.
 */
export default function AttributionCapture() {
  useEffect(() => {
    captureTouch();
    /* The touch is computed on arrival but only stored once marketing consent
       exists. Someone who lands on a campaign URL and accepts three pages
       later still gets attributed — see persistPendingTouch. */
    return onConsentChange(persistPendingTouch);
  }, []);

  return null;
}
