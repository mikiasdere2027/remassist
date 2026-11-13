import 'server-only';
import { apiPublic, TAGS } from '@/lib/api/public';
import type { PublicPricing, PublishedTier } from '@/lib/api/catalog';

/**
 * Published agent tiers — the rates shown on every public page.
 *
 * Read from the backend (GET /v1/public/pricing), cached under the `pricing`
 * tag: an admin's edit on /admin/catalog revalidates it, so the change is live
 * on /pricing, the home page and every service page on the next load. Falls
 * back to the seed values if the backend can't be reached (logged loudly by
 * apiPublic) or has no active tiers.
 *
 * Server-only — never import from a 'use client' file.
 */
export type { PublishedTier } from '@/lib/api/catalog';

/** Seed values used when the backend is unreachable. */
const FALLBACK: PublishedTier[] = [
  { key: 'pro',    label: 'Pro',    priceDisplay: '$8',  hourlyRate: 8,  note: 'Entry seats for every service' },
  { key: 'expert', label: 'Expert', priceDisplay: '$11', hourlyRate: 11, note: 'Senior seats, all services' },
];

export async function getPublishedTiers(): Promise<PublishedTier[]> {
  const { tiers } = await apiPublic<PublicPricing>('/public/pricing', {
    tags: [TAGS.pricing],
    fallback: () => ({ tiers: FALLBACK, coverageOptions: [] }),
  });
  if (!tiers?.length) {
    console.warn('[pricing] no active agent tiers from the API — showing seed prices');
    return FALLBACK;
  }
  return tiers;
}
