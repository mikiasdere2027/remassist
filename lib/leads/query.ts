import { and, eq, gte, ilike, isNotNull, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { leads } from '@/db/schema';
import { ALL_LEAD_SOURCES } from '@/lib/leads/schema';
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
  /** Quick view: mine | unassigned | followup | hot | open. */
  view?: string;
  /** A user id, or "none" for unassigned. */
  owner?: string;
};

export const LEAD_VIEWS = [
  { key: '', label: 'All leads' },
  { key: 'mine', label: 'My leads' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'followup', label: 'Follow-up due' },
  { key: 'hot', label: 'Hot' },
] as const;

/** Statuses a lead is still being worked in. */
const OPEN_STATUSES = ['new', 'contacted', 'qualified', 'nurturing'] as const;

export interface LeadFilterContext {
  /** The signed-in user, for "My leads". */
  userId?: string;
  /** Scope to one workspace (always passed by CRM screens). */
  workspaceId?: string;
  now?: Date;
}

export function buildLeadFilters(sp: LeadSearch, ctx: LeadFilterContext = {}): SQL[] {
  const where: SQL[] = [];

  if (ctx.workspaceId) where.push(eq(leads.workspaceId, ctx.workspaceId));

  switch (sp.view) {
    case 'mine':
      if (ctx.userId) where.push(eq(leads.ownerId, ctx.userId));
      break;
    case 'unassigned':
      where.push(isNull(leads.ownerId));
      break;
    case 'followup': {
      /* Due by the end of today, so the list is the day's call sheet. */
      const end = new Date(ctx.now ?? new Date());
      end.setUTCHours(23, 59, 59, 999);
      const due = and(isNotNull(leads.nextFollowUpAt), lte(leads.nextFollowUpAt, end));
      if (due) where.push(due);
      break;
    }
    case 'hot':
      where.push(gte(leads.score, 60));
      where.push(sql`${leads.status} in (${sql.join(OPEN_STATUSES.map((st) => sql`${st}`), sql`, `)})`);
      break;
  }

  if (sp.owner === 'none') where.push(isNull(leads.ownerId));
  else if (sp.owner && /^[\w-]{1,100}$/.test(sp.owner)) where.push(eq(leads.ownerId, sp.owner));

  /* Enum columns: anything not in the enum is dropped rather than passed to
     Postgres, which would otherwise error on an invalid enum input. */
  if (sp.source && (ALL_LEAD_SOURCES as readonly string[]).includes(sp.source)) {
    where.push(eq(leads.source, sp.source as (typeof ALL_LEAD_SOURCES)[number]));
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
