import type { Metadata } from 'next';
import { pageOg } from '@/lib/site';
import HomeHero from '@/components/home/HomeHero';
import RemAcronym from '@/components/home/RemAcronym';
import ServiceGrid from '@/components/home/ServiceGrid';
import TiersSection from '@/components/home/TiersSection';
import TechTicker from '@/components/home/TechTicker';
import StepsSection from '@/components/home/StepsSection';
import TrustedPartners from '@/components/home/TrustedPartners';
import FitFinder from '@/components/home/FitFinder';
import FaqSection from '@/components/home/FaqSection';
import TeamRail from '@/components/home/TeamRail';
import RemLoader from '@/components/loader/RemLoader';

export const metadata: Metadata = {
  title: 'Remote Teams | Rem Assist',
  description:
    'Remote teams that match your culture — results-driven, efficient, on target, thoroughly excellent. Expert teams built around your goals.',
  alternates: { canonical: '/' },
  openGraph: pageOg('/'),
};

/**
 * Home — section order follows index.html exactly. It is load-bearing: the
 * REMOTE cards set up the promise the service grid then proves, and the fit
 * finder has to land after the reader has seen tiers and pricing context.
 */
export default function Home() {
  return (
    <>
      {/* The brand loader, server-rendered into this page's static HTML so it
          is on screen from the first byte rather than arriving with hydration.
          It clears itself once per browser session. */}
      <RemLoader />
      <main>
        {/* HomeHero renders the trust strip as its own second flex child */}
        <HomeHero />
        <RemAcronym />
        <ServiceGrid />
        <TiersSection />
        <TechTicker />
        <StepsSection />
        <TrustedPartners />
        <FitFinder />
        <FaqSection />
        <TeamRail />
      </main>
    </>
  );
}
