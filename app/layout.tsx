import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Sora } from 'next/font/google';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AskRemAssist from '@/components/widgets/AskRemAssist';
import BookingModal from '@/components/widgets/BookingModal';
import JsonLd from '@/components/layout/JsonLd';
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={sora.variable}>
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
      </body>
    </html>
  );
}