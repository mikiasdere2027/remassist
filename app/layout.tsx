import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Sora } from 'next/font/google';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AskRemAssist from '@/components/widgets/AskRemAssist';
import BookingModal from '@/components/widgets/BookingModal';
import JsonLd from '@/components/layout/JsonLd';
import AttributionCapture from '@/components/analytics/AttributionCapture';
import GoogleTagManager from '@/components/analytics/GoogleTagManager';
import ConsentBanner from '@/components/analytics/ConsentBanner';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import '@/styles/globals.css';

/**
 * Sora is self-hosted + preloaded via next/font (no render-blocking Google
 * Fonts <link>). The variable aligns with the --font-sora name referenced by
 * the @theme font families in styles/globals.css.
 */
const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
});

/**
 * Site-wide metadata (§11.1). `metadataBase` is what lets every page declare a
 * relative canonical and still emit an absolute URL; without it Next drops the
 * canonical and OG image silently. Per-page files override title/description
 * and set their own `alternates.canonical`.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Rem Assist — Remote Teams',
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Remote teams that match your culture — results-driven, efficient, on target, thoroughly excellent.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    url: SITE_URL,
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};
/**
 * Next 15 wants viewport and themeColor in their own export; putting them in
 * `metadata` is ignored. Without this the app relies on Next's default
 * viewport tag and emits no theme-color at all, so the browser chrome on
 * Android and iOS PWA never picks up the brand navy.
 *
 * viewportFit: 'cover' so the fixed consent banner and chat launcher can sit
 * inside env(safe-area-inset-*) on a notched phone rather than under the home
 * indicator.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000543',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    /* suppressHydrationWarning: the home page's loader locks scroll from an
       inline script that runs during parse, so <html> carries a style
       attribute the server never rendered. React reports that as a hydration
       mismatch on every home-page load otherwise. It suppresses one level
       only — attributes on this element — and the loader owns that style
       imperatively, so there is nothing here for React to patch.
       See components/loader/RemLoader.tsx. */
    <html lang="en" className={sora.variable} suppressHydrationWarning>
      <head>
        {/*
          Three origins this site always ends up talking to, none of them
          discoverable from the HTML until something has already run:

          - googletagmanager.com is injected by a script that only runs after
            hydration and only after consent;
          - youtube-nocookie.com is the hero clip's player, armed on consent or
            a press;
          - calendly.com is the booking iframe, which loads inside a dialog and
            so is discovered at click time, when the visitor is waiting on it.

          preconnect (not dns-prefetch) because all three are HTTPS and the
          round trip being saved is TLS, not DNS. They are cheap: a preconnect
          the page never uses costs one idle socket the browser closes on its
          own after ~10s. Deliberately NOT preconnecting before consent is
          impossible to arrange from static HTML — but a preconnect opens a
          socket and sends no cookies and no request, so it discloses nothing
          about the visitor beyond the fact that this page was opened.
        */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
        <link rel="preconnect" href="https://assets.calendly.com" />
        <link rel="dns-prefetch" href="https://calendly.com" />
      </head>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Header />
        {/* Skip-link target. tabIndex -1 so focus can land here without
            adding the wrapper to the tab order. */}
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <Footer />
        <AskRemAssist />
        <BookingModal />
        <JsonLd />
        <AttributionCapture />
        <GoogleTagManager />
        <ConsentBanner />
      </body>
    </html>
  );
}