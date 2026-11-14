'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb, isDatabaseConfigured } from '@/db';
import { assertUser } from '@/lib/auth/require';
import { canEditLeads } from '@/lib/auth/roles';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { TeamLeadInput, createTeamLead, existingByEmail } from '@/lib/crm/intake';
import { getTeam } from '@/lib/crm/leads';
import { normalizeEmail } from '@/lib/crm/dedupe';

const MAX_IMPORT_ROWS = 2000;

export interface ImportSummary {
  created: number;
  duplicates: number;
  invalid: Array<{ row: number; error: string }>;
  invalidCount: number;
}

const Payload = z.object({
  ownerId: z.string().max(100).optional(),
  rows: z.array(z.record(z.string(), z.string().max(5000))).min(1).max(MAX_IMPORT_ROWS),
});

/**
 * Import mapped CSV rows as leads (source "import"). The browser parses and
 * maps the file; this re-validates every row, skips emails that already exist
 * (in the CRM or earlier in the same file), and writes in batches so one bad
 * row cannot undo a whole file.
 */
export async function importLeads(payload: unknown): Promise<ImportSummary | { error: string }> {
  const user = await assertUser();
  if (!canEditLeads(user.role)) return { error: 'You do not have permission to import leads.' };
  if (!isDatabaseConfigured()) return { error: 'The database is not configured.' };

  const parsed = Payload.safeParse(payload);
  if (!parsed.success) return { error: `The file must have between 1 and ${MAX_IMPORT_ROWS} rows.` };
  const ownerId = parsed.data.ownerId || undefined;
  if (ownerId && !(await getTeam()).some((m) => m.id === ownerId)) {
    return { error: 'That owner no longer has access. Pick someone else.' };
  }

  const ws = currentWorkspaceId();
  const db = getDb();
  const summary: ImportSummary = { created: 0, duplicates: 0, invalid: [], invalidCount: 0 };
  const invalid = (row: number, error: string) => {
    summary.invalidCount++;
    if (summary.invalid.length < 25) summary.invalid.push({ row, error });
  };

  const valid: Array<{ row: number; data: z.infer<typeof TeamLeadInput> }> = [];
  parsed.data.rows.forEach((r, i) => {
    const row = i + 2; // spreadsheet row number: 1 is the header
    const v = TeamLeadInput.safeParse({ ...r, email: r.email ?? '', source: 'import', ownerId });
    if (!v.success) invalid(row, v.error.issues[0].message);
    else if (!v.data.firstName && !v.data.lastName && !v.data.company) invalid(row, 'No name or company.');
    else valid.push({ row, data: v.data });
  });

  const existing = await existingByEmail(db, ws, valid.map((v) => v.data.email));
  const seen = new Set<string>(existing.keys());
  const toCreate = valid.filter((v) => {
    const e = normalizeEmail(v.data.email) ?? v.data.email;
    if (seen.has(e)) {
      summary.duplicates++;
      return false;
    }
    seen.add(e);
    return true;
  });

  for (let i = 0; i < toCreate.length; i += 100) {
    const batch = toCreate.slice(i, i + 100);
    try {
      await db.transaction(async (tx) => {
        for (const v of batch) await createTeamLead(tx, ws, v.data, user.id, 'Imported from a CSV file');
      });
      summary.created += batch.length;
    } catch (e) {
      console.error('[import] batch failed', e);
      for (const v of batch) invalid(v.row, 'Could not be saved.');
    }
  }

  revalidatePath('/admin/leads');
  return summary;
}
