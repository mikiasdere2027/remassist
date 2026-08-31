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
    /* Pool size depends on how many processes there are.
       On the VPS there is exactly one Node instance (§2.2 rules out cluster
       mode), so 10 connections against Postgres's default 100 is comfortable.
       On serverless every warm function instance holds its own pool, so 10
       each exhausts a small database quickly — Neon's free tier allows far
       fewer than 100. Keep it to one and let the platform's own pooler
       (Neon's -pooler endpoint, PgBouncer) do the multiplexing. */
    const serverless = Boolean(process.env.VERCEL);
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: serverless ? 1 : 10,
      idleTimeoutMillis: serverless ? 10_000 : 30_000,
      // Neon and most hosted Postgres require TLS; local dev usually does not.
      ...(/\bsslmode=require\b/.test(process.env.DATABASE_URL)
        ? { ssl: { rejectUnauthorized: true } }
        : {}),
    });
    client = drizzle(pool, { schema });
  }
  return client;
}
