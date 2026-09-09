import { sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { users } from '@/db/schema/auth';
import type { UserRow } from './session';

/**
 * Reading the account behind an address — MIGRATION-PLAN §10.
 *
 * One query, two callers that must not disagree: require.ts decides whether a
 * request may proceed, and auth.ts's signIn callback decides whether an address
 * may be sent a code at all. Both feed the row to the same `authorise`, so both
 * have to select the same columns — a column missing from one copy of the
 * select arrives as undefined and is then judged by a rule that expects a
 * value, which is how a gate quietly stops enforcing something.
 *
 * Deliberately does NOT import '@/auth'. auth.ts imports this; a module that
 * reached back for the session would make that a cycle, and the whole point of
 * splitting it out is that the lookup needs no session — it takes an address.
 */

/** Lower-cased comparison, because the column is plain text. */
export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  if (!isDatabaseConfigured()) return undefined;

  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      disabledAt: users.disabledAt,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
    .limit(1);

  return row;
}
