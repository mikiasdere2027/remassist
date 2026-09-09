#!/usr/bin/env node
/**
 * Set the admin's password directly on the server.
 *
 *   cd /srv/remassist/releases/$(ls -1 /srv/remassist/releases | sort -r | head -1)
 *   DATABASE_URL=$(sudo sed -n 's|^DATABASE_URL=||p' /srv/remassist/shared/.env | head -1) node set-admin-password.mjs
 *
 * Sorted by NAME, not by `ls -t`. Release directories are timestamp-named, so a
 * reverse name sort is the newest one. Modification time is not: the deploy
 * prunes node_modules from every release except the newest, and that `rm -rf`
 * updates the old directory's mtime — so `ls -t | head -1` returns the one
 * release guaranteed to have no node_modules, and this script dies on a missing
 * `pg`. It has done exactly that.
 *
 * Why this exists alongside tools/create-admin.mts: that script imports
 * lib/auth/password.ts, so it needs Node's type stripping (22.6+). The VPS runs
 * Node 20 — provision.sh specifies setup_22.x, but the box has drifted from it.
 * So the CLI the plan called "the recovery path" cannot run where recovery is
 * actually needed. This file imports nothing but node: builtins and pg, which
 * means Node 20 runs it.
 *
 * It also removes the step that went wrong: no hash is copied between machines,
 * so there is no placeholder for a paste to miss. The password is typed here,
 * with echo off, and never leaves this process except as a hash.
 *
 * The duplicated scrypt parameters below are safe to duplicate, and that is a
 * property of the format rather than luck: every hash stores its own N, r and p
 * (see verifyPassword in lib/auth/password.ts), so a hash written here verifies
 * there even if one side's cost parameters are raised later. What must NOT drift
 * is the string layout — scrypt$N$r$p$salt$hash, both halves base64.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';
import pg from 'pg';

const scrypt = promisify(scryptCb);

/* Mirrors lib/auth/password.ts. */
const N = 16_384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;
const MIN_LENGTH = 12;

/* Mirrors lib/auth/allowlist.ts. Narrowed to one domain on 2026-09-09; keep
   the two in step or this script will set a password on a row the running app
   refuses to authorise. */
const ALLOWED = ['@remassistance.com'];

function fail(msg) {
  console.error(`\n  ${msg}\n`);
  process.exit(1);
}

function ask(rl, prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

/** Ask without echoing: readline routes keystrokes through _writeToOutput. */
function askHidden(rl, prompt) {
  return new Promise((resolve) => {
    const restore = rl._writeToOutput;
    rl._writeToOutput = (s) => {
      if (s.includes(prompt)) process.stdout.write(prompt);
    };
    rl.question(prompt, (answer) => {
      rl._writeToOutput = restore;
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function hash(plain) {
  const salt = randomBytes(16);
  const key = await scrypt(plain, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

/** The same checks verifyPassword makes, run here so a bad write is caught. */
async function verify(plain, stored) {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');
  const actual = await scrypt(plain, salt, expected.length, {
    N: Number(parts[1]), r: Number(parts[2]), p: Number(parts[3]), maxmem: MAXMEM,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const url = process.env.DATABASE_URL;
if (!url) fail('DATABASE_URL is not set. See the usage comment at the top of this file.');
if (!process.stdin.isTTY) fail('This needs a real terminal — it prompts with echo off.');

const pool = new pg.Pool({ connectionString: url });
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

try {
  const { rows: admins } = await pool.query(
    "select id, email, password_hash from users where role = 'admin'",
  );
  if (admins.length === 0) fail("No admin row exists. Create one first, or use tools/create-admin.mts on a Node 22 machine.");
  if (admins.length > 1) fail(`${admins.length} admin rows exist, which the single-admin index should have prevented. Investigate before changing anything.`);

  const admin = admins[0];
  const looksHashed = typeof admin.password_hash === 'string'
    && admin.password_hash.split('$').length === 6
    && admin.password_hash.startsWith('scrypt$');

  console.log(`\n  Admin: ${admin.email}`);
  console.log(`  Current password_hash: ${looksHashed ? 'a valid scrypt hash' : 'NOT a usable hash — nobody can sign in'}\n`);

  if (!ALLOWED.some((d) => admin.email.toLowerCase().endsWith(d))) {
    fail(`${admin.email} is not on an allowed company domain. Refusing to touch it.`);
  }

  const confirm = (await ask(rl, `  Set a new password for ${admin.email}? [y/N] `)).trim().toLowerCase();
  if (confirm !== 'y') fail('Nothing was changed.');

  const password = await askHidden(rl, '  New password (not shown): ');
  if (password.length < MIN_LENGTH) {
    fail(`Use at least ${MIN_LENGTH} characters. A short phrase is fine, and easier to remember than a mangled word.`);
  }
  if (password.length > 200) fail('That is longer than 200 characters.');
  if (password.trim().length === 0) fail('That is only whitespace.');

  const again = await askHidden(rl, '  Confirm password: ');
  if (password !== again) fail('Those did not match. Nothing was written.');

  const stored = await hash(password);

  /* Verified BEFORE the write, so a hash this process cannot itself validate
     never reaches the database — the exact failure that put the string
     "PASTE_HASH_HERE" in this column. */
  if (!(await verify(password, stored))) {
    fail('The hash this script produced did not verify. Nothing was written.');
  }

  const { rowCount } = await pool.query(
    'update users set password_hash = $1 where id = $2',
    [stored, admin.id],
  );
  if (rowCount !== 1) fail(`Expected to update 1 row, updated ${rowCount}. Nothing is guaranteed; investigate.`);

  /* Read it back and verify again, so the answer is about what is in the
     database rather than about what we meant to put there. */
  const { rows: after } = await pool.query('select password_hash from users where id = $1', [admin.id]);
  if (!(await verify(password, after[0].password_hash))) {
    fail('The stored hash does not verify after the write. Do NOT rely on this password.');
  }

  console.log(`\n  Done. ${admin.email} can sign in with that password.`);
  console.log('  The unverified-email banner will show until a verification code is redeemed,');
  console.log('  which needs AUTH_RESEND_KEY. It never blocks sign-in.\n');
} catch (err) {
  /* Never print the error object wholesale — a driver error carries the
     parameters of the failing statement, and one of those is the hash. */
  fail(`Failed: ${err instanceof Error ? err.message : 'unknown error'}`);
} finally {
  rl.close();
  await pool.end();
}
