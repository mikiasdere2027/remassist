import { eq, ilike, or, type SQL } from 'drizzle-orm';
import { leads } from '@/db/schema';
import { LEAD_SOURCES } from '@/lib/leads/schema';
import { LEAD_STATUSES } from '@/lib/leads/display';

/**
 * The lead-list filter, shared by the admin table and the CSV export.
 *
 * Shared deliberately: an export that honours different filters from the table
 * it was clicked from is a quiet way to hand someone the wrong spreadsheet.
 */
export type LeadSearch = {
  source?: string;
  status?: string;
  q?: string;
  before?: string;
};

export function buildLeadFilters(sp: LeadSearch): SQL[] {
  const where: SQL[] = [];

  /* Enum columns: anything not in the enum is dropped rather than passed to
     Postgres, which would otherwise error on an invalid enum input. */
  if (sp.source && (LEAD_SOURCES as readonly string[]).includes(sp.source)) {
    where.push(eq(leads.source, sp.source as (typeof LEAD_SOURCES)[number]));
  }
  if (sp.status && (LEAD_STATUSES as readonly string[]).includes(sp.status)) {
    where.push(eq(leads.status, sp.status as (typeof LEAD_STATUSES)[number]));
  }

  const q = sp.q?.trim();
  if (q) {
    /* Drizzle parameterises the pattern, so the % wrapping is data and there is
       no injection here — but % and _ are still LIKE wildcards inside that
       data. Unescaped, a search for "%" matches every row, and the underscore
       in an ordinary address like first_last@x.com silently matches firstXlast
       too. Backslash is Postgres's default LIKE escape character. */
    const like = `%${escapeLike(q)}%`;
    const clause = or(ilike(leads.email, like), ilike(leads.company, like), ilike(leads.name, like));
    if (clause) where.push(clause);
  }

  return where;
}

/** Escape the LIKE metacharacters so a search term is matched literally. */
export function escapeLike(v: string): string {
  return v.replace(/[\\%_]/g, (c) => `\\${c}`);
}
