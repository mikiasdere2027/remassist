/**
 * Confirm an account's email address from the box — MIGRATION-PLAN §10.
 *
 *   npm run admin:verify -- someone@remassistance.com
 *
 * The break-glass for the activation deadline in lib/auth/verify.ts.
 *
 * That deadline locks an account a day after it is created unless the address
 * is proved by typing an emailed code, and the whole scheme therefore rests on
 * mail working. When it does not — an unverified sender domain, a revoked API
 * key, a provider outage on the wrong afternoon — the honest description of the
 * situation is that everybody is locked out of the admin with no way back
 * through the admin itself. This is the way back.
 *
 * It is not a bypass anybody can reach: it needs a shell on the machine and the
 * database credentials, which is strictly more access than the account it
 * unlocks would give. The alternative is not "no bypass", it is somebody typing
 * an UPDATE by hand into psql at the moment they are most rushed, against the
 * users table, with no confirmation step and no check that the address exists.
 *
 * Talks to pg directly rather than through db/index.ts, for the same reason
 * create-admin.mts does: that module does a directory import of ./schema, which
 * Next's bundler resolves and plain ESM does not.
 */
import { readFileSync } from 'node:fs';
import { createInterface, type Interface } from 'node:readline';
import pg from 'pg';
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

function fail(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

const url = connectionString();
if (!url) fail('DATABASE_URL is not set and no .env.local was found. Nothing was read or written.');

const argument = process.argv[2]?.trim().toLowerCase();

const pool = new pg.Pool({ connectionString: url });
const client = await pool.connect();
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

try {
  const email = argument || (await ask(rl, '\n  Address to confirm: ')).trim().toLowerCase();
  if (!email) fail('No address given. Nothing was written.');

  /* The same fence the admin itself applies. Confirming an address off a
     company domain would be writing a row the running application refuses to
     authorise anyway — better to say so than to leave a puzzle. */
  if (!isAllowedEmail(email)) {
    fail('That address is not on an allowed company domain. See lib/auth/allowlist.ts.');
  }

  const { rows } = await client.query(
    `select email, role, email_verified, disabled_at, created_at
       from users where lower(email) = $1 limit 1`,
    [email],
  );
  if (rows.length === 0) fail(`No account exists for ${email}. Nothing was written.`);

  const [row] = rows;
  if (row.email_verified) {
    console.log(
      `\n  ${row.email} was already confirmed on ${new Date(row.email_verified).toISOString()}.\n` +
      '  Nothing was written.\n',
    );
    process.exit(0);
  }

  /* Said out loud before it is done, because this is the one place that asserts
     control of an inbox without anybody proving it — and the address on screen
     is the whole of what is being asserted. */
  console.log(
    `\n  ${row.email} — ${row.role}, created ${new Date(row.created_at).toISOString()}` +
    `${row.disabled_at ? ', DISABLED' : ''}\n\n` +
    '  Confirming this marks the address as proved without anyone receiving a code,\n' +
    '  so only do it when mail is broken and you know this inbox belongs to them.\n',
  );

  const answer = (await ask(rl, `  Type the address again to confirm: `)).trim().toLowerCase();
  if (answer !== email) fail('That did not match. Nothing was written.');

  const { rowCount } = await client.query(
    'update users set email_verified = now() where lower(email) = $1 and email_verified is null',
    [email],
  );

  /* Zero means somebody confirmed it properly between the read and the write,
     which is the good outcome and not an error. */
  console.log(
    rowCount === 0
      ? `\n  ${email} was confirmed by someone else while this ran. Nothing to do.\n`
      : `\n  Done. ${email} is confirmed and is no longer locked.\n` +
        '  Fix the mail configuration too — the next account created will hit the\n' +
        '  same deadline, and this tool is not a substitute for working email.\n',
  );
} catch (err) {
  fail(`Failed: ${err instanceof Error ? err.message : 'unknown error'}`);
} finally {
  rl.close();
  client.release();
  await pool.end();
}
