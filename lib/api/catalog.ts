/**
 * The price list — response shapes for the backend's catalog module
 * (remassist-backend src/modules/catalog). Rows are addressed by their key.
 *
 *   GET   /v1/admin/catalog/coverage-options          → CoverageOption[]
 *   POST  /v1/admin/catalog/coverage-options          → CoverageOption   (admin)
 *   PATCH /v1/admin/catalog/coverage-options/:key     → CoverageOption   (admin, confirm: true)
 *   POST  /v1/admin/catalog/coverage-options/:key/deactivate|reactivate (admin)
 *   GET   /v1/admin/catalog/tiers                     → AgentTier[]
 *   POST  /v1/admin/catalog/tiers                     → AgentTier        (admin)
 *   PATCH /v1/admin/catalog/tiers/:key                → AgentTier        (admin, confirm: true)
 *   POST  /v1/admin/catalog/tiers/:key/deactivate|reactivate (admin)
 *   GET   /v1/admin/catalog/service-categories        → ServiceCategory[]
 *   GET   /v1/admin/catalog/changes?limit=&entity=&rowKey= → RateChange[]
 *   GET   /v1/public/pricing                          → PublicPricing
 */

export interface CoverageOption {
  key: string;
  label: string;
  longLabel: string;
  seats: number;
  monthlyHours: number;
  sortOrder: number;
  active: boolean;
}

export interface AgentTier {
  key: string;
  label: string;
  /** Numeric column as a string, e.g. "8.00". */
  hourlyRateUsd: string;
  note: string | null;
  sortOrder: number;
  active: boolean;
}

export interface ServiceCategory {
  key: string;
  name: string;
  slug: string;
  navBlurb: string | null;
  sortOrder: number;
}

export type RateEntity = 'coverage_option' | 'agent_tier';

export interface RateChange {
  id: string;
  changedAt: string;
  actorId: string | null;
  actorName: string;
  entity: RateEntity;
  rowKey: string;
  action: 'added' | 'updated' | 'deactivated' | 'reactivated';
  /** Whole-row snapshots; `before` is null on an add. */
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

/** One tier as /pricing and SeatTiers render it. */
export interface PublishedTier {
  key: string;
  label: string;
  /** Formatted price string, e.g. "$8", "$8.50". */
  priceDisplay: string;
  /** Raw hourly rate, e.g. 8. */
  hourlyRate: number;
  note: string | null;
}

export interface PublicPricing {
  tiers: PublishedTier[];
  coverageOptions: {
    key: string;
    label: string;
    longLabel: string;
    seats: number;
    monthlyHours: number;
  }[];
}

/** URL segment for each table. */
export const CATALOG_PATH = {
  coverage: '/admin/catalog/coverage-options',
  tier: '/admin/catalog/tiers',
} as const;
export type CatalogTable = keyof typeof CATALOG_PATH;
