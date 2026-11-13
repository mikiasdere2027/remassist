import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import '@/styles/globals.css';

/**
 * Sora, self-hosted from app/fonts (OFL — see Sora-OFL.txt). One variable
 * file covers every weight the site uses (300–800), and the build no longer
 * downloads fonts from Google (it failed offline). The variable aligns with the --font-sora name
 * referenced by the @theme font families in styles/globals.css.
 */
const sora = localFont({
  src: './fonts/Sora-latin-variable.woff2',
  weight: '100 800',
  style: 'normal',
  variable: '--font-sora',
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
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
      <body>
        {/* The public site's chrome (header, footer, chat, booking, analytics,
            consent, popups) lives in app/(site)/layout.tsx. The admin is
            outside that group, so it neither renders nor downloads any of it. */}
        {children}
      </body>
    </html>
  );
}