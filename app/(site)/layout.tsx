import type { ReactNode } from 'react';
import { preconnect, prefetchDNS } from 'react-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AskRemAssist from '@/components/widgets/AskRemAssist';
import BookingModal from '@/components/widgets/BookingModal';
import JsonLd from '@/components/layout/JsonLd';
import AttributionCapture from '@/components/analytics/AttributionCapture';
import GoogleTagManager from '@/components/analytics/GoogleTagManager';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import ConsentBanner from '@/components/analytics/ConsentBanner';
import PopupManager from '@/components/popups/PopupManager';

/**
 * The public site's chrome. Every marketing route lives in this (site) route
 * group; /admin, /api and the root-level metadata files sit outside it, so the
 * admin neither renders nor ships any of this (it used to be hidden at render
 * time by a pathname check in SiteChrome, while its code still downloaded).
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  /*
    Origins the public site always ends up talking to, none discoverable from
    the HTML until something has run: googletagmanager.com (GTM or GA4, injected
    after hydration), youtube-nocookie.com (the hero clip, on consent or press)
    and Calendly (the booking iframe, opened at click time while the visitor
    waits). preconnect saves the TLS round trip; it opens a socket and sends no
    cookies or request. React hoists these into <head>. Public pages only — the
    admin never talks to these hosts.
  */
  preconnect('https://www.googletagmanager.com');
  preconnect('https://www.youtube-nocookie.com');
  preconnect('https://assets.calendly.com');
  prefetchDNS('https://calendly.com');

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header />
      {/* Skip-link target. tabIndex -1 so focus can land here without adding
          the wrapper to the tab order. */}
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      <Footer />
      <AskRemAssist />
      <BookingModal />
      <JsonLd />
      <AttributionCapture />
      {/* Two loaders, at most one of which renders: GoogleAnalytics is null
          whenever a container id is set. See its header. */}
      <GoogleTagManager />
      <GoogleAnalytics />
      <ConsentBanner />
      {/* Renders nothing until there is a live, published popup for the page —
          see components/popups/PopupManager.tsx. */}
      <PopupManager />
    </>
  );
}
