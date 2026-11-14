// Shared setup for the browser end-to-end checks (see README.md).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);

/** playwright-core: from E2E_PLAYWRIGHT_CORE, or an installed package. */
function loadPlaywright() {
  const candidates = [process.env.E2E_PLAYWRIGHT_CORE, 'playwright-core', 'playwright'].filter(Boolean);
  for (const c of candidates) {
    try {
      return require(c);
    } catch {
      /* try the next */
    }
  }
  throw new Error('playwright-core not found. Set E2E_PLAYWRIGHT_CORE=/path/to/playwright-core or npm i -D playwright-core.');
}

export const { chromium } = loadPlaywright();
export const BASE = (process.env.E2E_BASE || 'http://localhost:3000').replace(/\/$/, '');
export const ADMIN = {
  username: process.env.E2E_USER || 'eyob',
  password: process.env.E2E_PASS || '',
};
export const BACKEND_DIR = process.env.E2E_BACKEND_DIR || new URL('../../../remassist-backend', import.meta.url).pathname;
export const SHOTS = process.env.E2E_SHOTS || '/tmp/remassist-e2e-shots';
mkdirSync(SHOTS, { recursive: true });

export function launch() {
  return chromium.launch({ executablePath: process.env.E2E_CHROMIUM || '/usr/bin/chromium' });
}

/** A tiny check recorder: ok(cond, msg), then done() sets the exit code. */
export function checks() {
  let failures = 0;
  return {
    ok(cond, msg) {
      console.log(`${cond ? '✓' : '✗'} ${msg}`);
      if (!cond) failures++;
    },
    done() {
      console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
      process.exitCode = failures ? 1 : 0;
    },
  };
}

export async function signIn(page, who = ADMIN) {
  if (!who.password) throw new Error('Set E2E_PASS (and E2E_USER) to a dev admin account.');
  await page.goto(`${BASE}/admin/signin`);
  await page.fill('#admin-username', who.username);
  await page.fill('#admin-password', who.password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/admin/signin'), { timeout: 20000 }),
    page.click('button[type=submit]'),
  ]);
}
