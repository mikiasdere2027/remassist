// Signed-in devices: the settings list names this device, a second browser appears in it, signing
// it out ends that session (and only that one), "sign out all others" works, and phone width.
// Uses a throwaway account (invited, then disabled at the end), so "sign out all others" never
// signs out the real dev account's browsers.
import { BASE, SHOTS, checks, hydrated, launch, signIn } from './lib.mjs';

const c = checks();
const stamp = Date.now().toString(36);
const WHO = { email: `devices-${stamp}@example.com`, username: `dev${stamp}`, name: 'Device Tester', password: 'a long device test passphrase' };
const browser = await launch();
const errors = [];
const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0';
const PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const TABLET = 'Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

// The real dev admin invites the throwaway account (and disables it again at the end).
const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const admin = await adminCtx.newPage();
await signIn(admin);
const api = (method, path, body) => admin.evaluate(async ([m, u, b]) => {
  const r = await fetch(`/api/v1${u}`, { method: m, headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}, [method, path, body]);
const invite = await api('POST', '/admin/invitations', { email: WHO.email, name: WHO.name, role: 'manager' });
const token = String(invite.body.inviteUrl).split('/').pop();

let first = true;
const mk = async (userAgent, width = 1280) => {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, userAgent });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  if (first) {
    first = false;
    await page.goto(`${BASE}/admin/signin`, { waitUntil: 'networkidle' });
    const r = await page.evaluate(async ([t, w]) => (await fetch(`/api/v1/public/invitations/${t}/accept`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: w.username, name: w.name, password: w.password }),
    })).status, [token, WHO]);
    if (r !== 201) throw new Error(`could not create the throwaway account (${r})`);
  } else {
    await signIn(page, { username: WHO.username, password: WHO.password });
  }
  return page;
};

async function open(p, path = '/admin/settings') {
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  await p.locator('h1').first().waitFor({ timeout: 15000 });
  await hydrated(p, 'section table').catch(() => {});
}
const rows = (p) => p.locator('table tbody tr');

const laptop = await mk(FIREFOX);
await open(laptop);
const before = await rows(laptop).count();
c.ok(before === 1, `a new account starts with just this device (${before})`);
c.ok((await laptop.locator('tr:has-text("This device")').innerText()).includes('Firefox on Linux'), 'this device is named, and marked "This device"');
c.ok((await laptop.locator('tr:has-text("This device") button').count()) === 0, 'there is no sign-out button on this device itself');

// A phone and a tablet sign in as the same person.
const phone = await mk(PHONE, 390);
const tablet = await mk(TABLET);
await open(laptop);
c.ok((await rows(laptop).count()) === before + 2, 'the phone and the tablet appear in the list');
c.ok((await laptop.locator('tr:has-text("Safari on iOS")').count()) === 1 && (await laptop.locator('tr:has-text("Chrome on Android")').count()) === 1, 'they are named from their browsers');
await laptop.screenshot({ path: `${SHOTS}/devices-1280.png`, fullPage: true });

// Sign the phone out: the list updates at once, the phone loses its session, the others keep theirs.
await laptop.click('tr:has-text("Safari on iOS") button');
await laptop.locator('tr:has-text("Safari on iOS")').waitFor({ state: 'detached', timeout: 10000 });
c.ok((await laptop.locator('[role=status]').innerText()).includes('Safari on iOS was signed out'), 'the list updates straight away, with a confirmation');
await phone.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle' });
c.ok(phone.url().includes('/admin/signin'), 'the phone is sent to sign-in');
await tablet.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle' });
c.ok(tablet.url().includes('/admin/settings'), 'the tablet is still signed in');

// Sign out everything else.
await open(laptop);
const btn = laptop.locator('button:has-text("Sign out all")');
c.ok((await btn.count()) === 1, 'there is a "sign out all other devices" button');
await btn.click();
await laptop.locator('[role=status]').waitFor({ timeout: 10000 });
c.ok((await rows(laptop).count()) === 1, 'only this device is left');
await tablet.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle' });
c.ok(tablet.url().includes('/admin/signin'), 'the tablet is signed out too');
await open(laptop);
c.ok(laptop.url().includes('/admin/settings'), 'this device stays signed in');

// Phone width of the page itself.
const m = await mk(PHONE, 390);
await m.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle' });
const over = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
c.ok(over <= 1, `390px /admin/settings (overflow ${over}px)`);
await m.screenshot({ path: `${SHOTS}/devices-390.png`, fullPage: true });

// Tidy up: disable the throwaway account.
const users = await api('GET', '/admin/users');
const me = (users.body.items ?? users.body).find((u) => u.username === WHO.username);
c.ok(me && (await api('PATCH', `/admin/users/${me.id}`, { disabled: true })).status === 200, 'the throwaway account is disabled again');

c.ok(errors.length === 0, `no browser errors${errors.length ? ': ' + [...new Set(errors)].join(' | ') : ''}`);
await browser.close();
c.done();
