import { readFileSync } from 'node:fs';
import type { Config } from 'drizzle-kit';

/**
 * Next loads .env.local for the app; drizzle-kit is a separate binary and does
 * not, so `npm run db:migrate` used to fail with "url: undefined" on a machine
 * that ran the dev server perfectly well. Read it here rather than making every
 * developer prefix the command with an inline DATABASE_URL — a step that is
 * easy to get wrong and easy to get wrong *silently*, against the wrong
 * database.
 *
 * A real environment variable always wins, so CI and the VPS are unaffected.
 */
function envLocal(key: string): string | undefined {
  for (const file of ['.env.local', '.env']) {
    let text: string;
    try {
      text = readFileSync(new URL(file, import.meta.url), 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (m && m[1] === key) return m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return undefined;
}

const url = process.env.DATABASE_URL ?? envLocal('DATABASE_URL');

export default {
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: url! },
} satisfies Config;
