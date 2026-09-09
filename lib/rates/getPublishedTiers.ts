import { asc, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { agentTiers } from '@/db/schema';

/**
 * Published agent tier rows — the two rates shown on every public page.
 *
 * Returns active rows from the DB when a database is configured, so an admin's
 * edit on /admin/catalog is immediately live on /pricing, /services, and every
 * service page. Falls back to the seed values when no DATABASE_URL is set
 * (local dev without a db, preview builds, etc.) so the page still renders.
 *
 * Used by SeatTiers (the card grid) and the services/page pricing widget.
 * Server-only — never import from a 'use client' file.
 */
export interface PublishedTier {
  key: string;
  label: string;
  /** Formatted price string, e.g. "$8" */
  priceDisplay: string;
  /** Raw hourly rate as a number, e.g. 8 */
  hourlyRate: number;
  note: string | null;
}

/** Seed values used when the database is not configured. */
const FALLBACK: PublishedTier[] = [
  { key: 'pro',    label: 'Pro',    priceDisplay: '$8',  hourlyRate: 8,  note: 'Entry seats for every service' },
  { key: 'expert', label: 'Expert', priceDisplay: '$11', hourlyRate: 11, note: 'Senior seats, all services' },
];

export async function getPublishedTiers(): Promise<PublishedTier[]> {
  if (!isDatabaseConfigured()) return FALLBACK;

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(agentTiers)
      .where(eq(agentTiers.active, true))
      .orderBy(asc(agentTiers.sortOrder));

    if (rows.length === 0) return FALLBACK;

    return rows.map((r) => {
      const rate = parseFloat(r.hourlyRateUsd);
      return {
        key: r.key,
        label: r.label,
        priceDisplay: `$${Number.isInteger(rate) ? rate : rate.toFixed(2)}`,
        hourlyRate: rate,
        note: r.note ?? null,
      };
    });
  } catch {
    // If the DB query fails for any reason (e.g. migration not yet run),
    // fall back to the static seed values so the page still renders.
    return FALLBACK;
  }
}
