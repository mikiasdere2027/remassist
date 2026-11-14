import { leadsApi } from '@/lib/api/leads';
import { ApiError } from '@/lib/api/errors';

/**
 * CSV import through the backend (POST /v1/admin/leads/import). The browser
 * has already parsed the file and mapped its columns (lib/crm/csv.ts); this
 * sends the rows and turns the backend's report into the summary the page
 * shows. Row numbers are spreadsheet rows: row 1 is the header.
 */
export interface ImportSummary {
  created: number;
  duplicates: number;
  invalid: Array<{ row: number; error: string }>;
  invalidCount: number;
}

const SHOW_INVALID = 25;
const MAX_IMPORT_ROWS = 2000;

export async function importLeads(payload: {
  rows: Record<string, string>[];
  ownerId?: string;
}): Promise<ImportSummary | { error: string }> {
  if (payload.rows.length === 0 || payload.rows.length > MAX_IMPORT_ROWS) {
    return { error: `The file must have between 1 and ${MAX_IMPORT_ROWS} rows.` };
  }
  try {
    const r = await leadsApi.importRows(payload.rows, payload.ownerId || undefined);
    const invalid = r.invalid
      .map((x) => ({ row: x.row + 1, error: x.message }))
      .sort((a, b) => a.row - b.row);
    return {
      created: r.created,
      duplicates: r.duplicates.length,
      invalid: invalid.slice(0, SHOW_INVALID),
      invalidCount: invalid.length,
    };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'The import failed. Try again.' };
  }
}
