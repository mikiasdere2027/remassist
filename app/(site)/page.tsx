import type { Metadata } from 'next';
import { pageOg } from '@/lib/site';
import { HERO_INTERVIEW, interviewPoster } from '@/lib/interviews';
import { getTeamMembers } from '@/lib/team/content';
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
export default async function Home() {
  /* Published members from the backend; if it can't be reached the loader
     falls back to the content seed, so this value is never empty on a build. */
  const teamMembers = await getTeamMembers();

  return (
    <>
      {/* The hero's poster frame is this page's LCP element, and nothing in the
          HTML points at it until React has rendered HomeHero's <video> and the
          browser has parsed the poster attribute. React hoists this link into
          <head>, so the preload scanner finds it in the document's first bytes
          instead — which is the whole reason the clip could be pushed behind
          preload="none" without the disc showing up late.

          Declared on the route and not in app/layout.tsx on purpose: no other
          page renders this image, and a preload the page never uses is a real
          cost (the browser warns, and it competes for the same connection).
          See components/home/HomeHero.tsx. */}
      <link
        rel="preload"
        as="image"
        href={interviewPoster(HERO_INTERVIEW)}
        fetchPriority="high"
      />
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
        <TeamRail members={teamMembers} />
      </main>
    </>
  );
}
