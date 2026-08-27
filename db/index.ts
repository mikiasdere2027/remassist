import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * Database client — MIGRATION-PLAN §6.1.
 *
 * Postgres is local to the VPS, so there is one connection string and no
 * pooled/unpooled split.
 *
 * The pool is created lazily. Importing this module must not throw or open a
 * socket at build time: `next build` prerenders every static page in a process
 * that has no DATABASE_URL, and an eager Pool would fail the build for pages
 * that never touch the database.
 */
let pool: Pool | undefined;
let client: ReturnType<typeof drizzle<typeof schema>> | undefined;

export class DatabaseUnavailableError extends Error {
  constructor() {
    super('DATABASE_URL is not set');
    this.name = 'DatabaseUnavailableError';
  }
}

/** True when a connection string is configured. Callers degrade, not crash. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (!process.env.DATABASE_URL) throw new DatabaseUnavailableError();
  if (!client) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,                    // single Node instance; Postgres default is 100
      idleTimeoutMillis: 30_000,
    });
    client = drizzle(pool, { schema });
  }
  return client;
}
