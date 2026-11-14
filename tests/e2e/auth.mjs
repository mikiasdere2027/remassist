// Sign-in, invitations, roles, change/reset/forgot password, disable, sign-out.
import { execSync } from 'node:child_process';
import { ADMIN, BACKEND_DIR, BASE, SHOTS, checks, launch, signIn } from './lib.mjs';

const c = checks();
const stamp = Date.now().toString(36);
const NEW = { email: `mgr-${stamp}@example.com`, username: `mgr${stamp}`, name: 'Maya Manager', password: 'manager passphrase one' };
const browser = await launch();
const ctx = (width = 1280) => browser.newContext({ viewport: { width, height: 900 } });

// 1. Gate and sign-in
{
  const p = await (await ctx(390)).newPage();
  await p.goto(`${BASE}/admin/leads?status=new`);
  c.ok(p.url().startsWith(`${BASE}/admin/signin?next=`), 'signed-out visitor is sent to sign-in with ?next');
  await p.fill('#admin-username', ADMIN.username);
  await p.fill('#admin-password', 'definitely the wrong password');
  await p.click('button[type=submit]');
  const alert = p.locator('[role=alert]', { hasText: 'match' });
  await alert.waitFor({ timeout: 10000 }).catch(() => {});
  c.ok((await alert.count()) === 1, 'wrong password gets one neutral message');
  await p.fill('#admin-password', ADMIN.password);
  await Promise.all([p.waitForURL(/\/admin\/leads/, { timeout: 20000 }), p.click('button[type=submit]')]);
  c.ok(p.url() === `${BASE}/admin/leads?status=new`, 'signing in returns to the requested page');
  const cookie = (await p.context().cookies()).find((k) => k.name === 'ra_session');
  c.ok(cookie?.httpOnly === true, 'session cookie is httpOnly');
}

// 2. Invite → accept
const admin = await (await ctx()).newPage();
await signIn(admin);
await admin.goto(`${BASE}/admin/settings/users`);
await admin.fill('#invite-email', NEW.email);
await admin.fill('#invite-name', NEW.name);
await admin.click('form button[type=submit]');
const inviteInput = admin.locator('[aria-label="The invitation"]');
await inviteInput.waitFor({ timeout: 15000 });
const inviteUrl = await inviteInput.inputValue();
c.ok(/\/admin\/invite\/[\w-]{43}$/.test(inviteUrl), 'admin gets a one-time invite link');
const waiting = admin.locator('tr', { hasText: NEW.email }).getByText('Waiting', { exact: true });
await waiting.waitFor({ timeout: 15000 }).catch(() => {});
if ((await waiting.count()) === 0) {
  // Seen intermittently: the list doesn't refresh after the invite (FRONTEND-GAPS.md).
  console.log('⚠ invitation list did not refresh by itself; reloading');
  await admin.reload();
}
c.ok((await waiting.count()) === 1, 'new invitation is listed as Waiting');

const mgr = await (await ctx(390)).newPage();
await mgr.goto(inviteUrl);
c.ok((await mgr.inputValue('#inv-name')) === NEW.name, 'invite page pre-fills the name');
await mgr.fill('#inv-username', NEW.username);
await mgr.fill('#pw-new', NEW.password);
await mgr.fill('#pw-again', NEW.password);
await Promise.all([mgr.waitForURL(`${BASE}/admin`, { timeout: 20000 }), mgr.click('button[type=submit]')]);
c.ok(true, 'invitee created an account and is signed in');
await mgr.goto(inviteUrl);
c.ok((await mgr.textContent('h1')).includes('not valid'), 'invite link works only once');

// 3. Roles
await mgr.goto(`${BASE}/admin/settings/users`);
await mgr.waitForURL(`${BASE}/admin`, { timeout: 10000 }).catch(() => {});
c.ok(mgr.url() === `${BASE}/admin`, 'managers are kept out of Users');

// 4. Change own password
await mgr.goto(`${BASE}/admin/settings`);
await mgr.fill('#pw-current', NEW.password);
NEW.password = 'manager passphrase two';
await mgr.fill('#pw-new', NEW.password);
await mgr.fill('#pw-again', NEW.password);
await mgr.click('form button[type=submit]');
await mgr.locator('[role=status]').waitFor({ timeout: 10000 }).catch(() => {});
c.ok((await mgr.locator('[role=status]').textContent().catch(() => '')).includes('Password changed'), 'manager changed their own password');

// 5. Admin reset link
await admin.reload();
await admin.locator('tr', { hasText: `@${NEW.username}` }).locator('button[aria-label^="Options for"]').click();
await admin.click('text=Create password reset link');
const resetInput = admin.locator('[aria-label="The password reset link"]');
await resetInput.waitFor({ timeout: 15000 });
const r = await (await ctx(390)).newPage();
await r.goto(await resetInput.inputValue());
NEW.password = 'manager passphrase three';
await r.fill('#pw-new', NEW.password);
await r.fill('#pw-again', NEW.password);
await Promise.all([r.waitForURL(`${BASE}/admin`, { timeout: 20000 }), r.click('button[type=submit]')]);
c.ok(true, 'reset link sets a new password and signs in');
await mgr.goto(`${BASE}/admin/settings`);
c.ok(mgr.url().startsWith(`${BASE}/admin/signin`), 'the reset signed out the old session');

// 6. Disable
await admin.reload();
await admin.locator('tr', { hasText: `@${NEW.username}` }).locator('button[aria-label^="Options for"]').click();
await admin.click('button:has-text("Disable")');
await admin.locator('[role=status]').waitFor({ timeout: 10000 }).catch(() => {});
await r.goto(`${BASE}/admin/settings`);
c.ok(r.url().startsWith(`${BASE}/admin/signin`), 'a disabled account is signed out');

// 7. Forgot password (the email is logged by the backend when Resend isn't set up)
const f = await (await ctx(390)).newPage();
await f.goto(`${BASE}/admin/forgot-password`);
await f.fill('#forgot-identifier', ADMIN.username);
await f.click('button[type=submit]');
await f.locator('[role=status]').waitFor({ timeout: 10000 }).catch(() => {});
await new Promise((res) => setTimeout(res, 1500));
let link = null;
try {
  const logs = execSync(`docker compose -f ${BACKEND_DIR}/docker-compose.yml logs api --since 30s`, { encoding: 'utf8' });
  link = [...logs.matchAll(/https?:\/\/[^\s]+\/admin\/reset-password\/[\w-]{43}/g)].pop()?.[0] ?? null;
} catch {
  /* not running under docker compose */
}
c.ok(Boolean(link), 'forgot-password produced a reset email (read from the API log)');
if (link) {
  await f.goto(link);
  await f.fill('#pw-new', ADMIN.password);
  await f.fill('#pw-again', ADMIN.password);
  await Promise.all([f.waitForURL(`${BASE}/admin`, { timeout: 20000 }), f.click('button[type=submit]')]);
  c.ok(true, 'forgot-password link works (admin password set back to the same value)');
}

// 8. Sign out
const so = await (await ctx()).newPage();
await signIn(so);
await so.click('button:has-text("Sign out")');
await so.waitForURL(/\/admin\/signin/);
await so.goto(`${BASE}/admin`);
c.ok(so.url().startsWith(`${BASE}/admin/signin`), 'signing out ends the session');
await admin.screenshot({ path: `${SHOTS}/auth-users.png`, fullPage: true });

await browser.close();
c.done();
