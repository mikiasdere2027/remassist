import { and, eq, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { DEFAULT_WORKSPACE_ID } from '@/db/schema/crm';

/**
 * Workspace scoping. Every CRM query goes through `scoped()` so that, when a
 * second workspace exists, one workspace can never read another's rows.
 *
 * Today there is exactly one workspace (Rem Assist). When users can belong to
 * other workspaces, `currentWorkspaceId` reads it from the session instead —
 * every caller already passes it along, so nothing else changes.
 */
export { DEFAULT_WORKSPACE_ID };

export type WorkspaceId = string;

export function currentWorkspaceId(): WorkspaceId {
  return DEFAULT_WORKSPACE_ID;
}

/** `workspace_id = ws AND ...rest`, for a table's workspace column. */
export function scoped(column: PgColumn, workspaceId: WorkspaceId, ...rest: Array<SQL | undefined>): SQL {
  return and(eq(column, workspaceId), ...rest) as SQL;
}
