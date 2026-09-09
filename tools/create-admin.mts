/**
 * Create the one admin account — MIGRATION-PLAN §10.
 *
 *   npm run admin:create
 *
 * Prompts for the password with echo disabled and accepts it in no other way:
 * not as an argument, not from an environment variable, not from a file. That
 * is deliberate. A password passed as an argument lands in shell history and in
 * the process list where every other user on the box can read it, and one
 * pasted into a chat window lands somewhere worse.
 *
 * The system holds exactly one admin — enforced by users_single_admin_idx in
 * migration 0004. This refuses to run when one already exists rather than
 * leaving the index to raise a less legible error.
 *
 * Talks to pg directly rather than through db/index.ts: that module does a
 * directory import of ./schema, which Next's bundler resolves and plain ESM
 * does not. A standalone script does not need the ORM to write one row.
 */
import { readFileSync } from 'node:fs';
import { createInterface, type Interface } from 'node:readline';
import pg from 'pg';
import { hashPassword, passwordProblem } from '../lib/auth/password.ts';
import { isAllowedEmail } from '../lib/auth/allowlist.ts';

function connectionString(): string | null {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const f of ['.env.local', '.env']) {
    try {
      const m = /^DATABASE_URL=(.*)$/m.exec(readFileSync(f, 'utf8'));
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    } catch { /* try the next one */ }
  }
  return null;
}

function ask(rl: Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

/**
 * Ask without echoing. readline routes every keystroke through
 * `_writeToOutput`, so replacing it lets the prompt through and swallows the
 * typed characters. Private API, but it is the only way to do this with
 * readline and it is the standard workaround.
 */
function askHidden(rl: Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rlAny = rl as unknown as { _writeToOutput?: (s: string) => void };
    const restore = rlAny._writeToOutput;
    rlAny._writeToOutput = (s: string) => {
      if (s.includes(prompt)) process.stdout.write(prompt);
      else if (s.includes('\n') || s.includes('\r')) process.stdout.write('\n');
      /* anything else is a typed character — write nothing */
    };
    rl.question(prompt, (answer) => {
      rlAny._writeToOutput = restore;
      resolve(answer);
    });
  });
}

function fail(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

const url = connectionString();
if (!url) fail('DATABASE_URL is not set and no .env.local was found. Nothing was read or written.');

if (!process.stdin.isTTY) {
  fail(
    'This needs a real terminal — it prompts for the password with echo off.\n' +
    '  Run it directly rather than through a pipe or a CI step.',
  );
}

const pool = new pg.Pool({ connectionString: url });
const client = await pool.connect();
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

try {
  /* Checked before anything is typed, so nobody chooses a password only to be
     told afterwards that it cannot be used. */
  const { rows: admins } = await client.query(
    "select email from users where role = 'admin' limit 1",
  );
  if (admins.length > 0) {
    fail(
      `An admin already exists (${admins[0].email}).\n` +
      '  This system holds exactly one. To hand it over, promote a manager and\n' +
      '  demote the current admin in the same transaction.',
    );
  }

  console.log('\n  Creating the admin account.\n');

  const email = (await ask(rl, '  Work email: ')).trim().toLowerCase();
  if (!isAllowedEmail(email)) {
    fail('That address is not on an allowed company domain. See lib/auth/allowlist.ts.');
  }

  const { rows: taken } = await client.query(
    'select 1 from users where lower(email) = $1 limit 1',
    [email],
  );
  if (taken.length > 0) fail('A user with that address already exists.');

  const password = await askHidden(rl, '  Password (not shown): ');
  const problem = passwordProblem(password);
  if (problem) fail(problem);

  const again = await askHidden(rl, '  Confirm password: ');
  if (password !== again) fail('Those did not match. Nothing was written.');

  const passwordHash = await hashPassword(password);

  await client.query(
    `insert into users (id, email, role, password_hash, email_verified)
     values (gen_random_uuid()::text, $1, 'admin', $2, null)`,
    [email, passwordHash],
  );

  console.log(
    `\n  Done. ${email} is the admin.\n` +
    '  Sign in at /admin/signin, then confirm the address within 24 hours: the\n' +
    '  admin asks for a code by email, and an account that has not confirmed by\n' +
    '  then is locked out until it does (lib/auth/verify.ts).\n' +
    '  If mail is not working yet, npm run admin:verify confirms it from here.\n',
  );
} catch (err) {
  /* Never print the error object wholesale — a driver error carries the
     parameters of the failing statement, and one of those is the hash. */
  fail(`Failed: ${err instanceof Error ? err.message : 'unknown error'}`);
} finally {
  rl.close();
  client.release();
  await pool.end();
}
