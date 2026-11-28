// Site details: the admin page edits the phone, email and booking link; the public footer, pricing
// page, legal pages, /book redirect and the booking window follow without a deploy; bad values are
// refused with what was typed kept. Restores the original details at the end.
import { BASE, SHOTS, checks, hydrated, launch, signIn } from './lib.mjs';

const c = checks();
const stamp = Date.now().toString(36);
const NEW = { phone: '(832) 555-0142', email: `hello-${stamp}@remassistance.com`, bookingUrl: `https://calendly.com/rem-test/${stamp}` };
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
await signIn(p);

const api = (method, path, body) => p.evaluate(async ([m, u, b]) => {
  const r = await fetch(`/api/v1${u}`, { method: m, headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}, [method, path, body]);
const FIELDS = ['phone', 'email', 'bookingUrl', 'linkedin', 'instagram', 'youtube', 'trustpilot', 'google'];
const original = Object.fromEntries(FIELDS.map((k) => [k, (null)]));
Object.assign(original, (await api('GET', '/admin/site-settings')).body);
const restore = { ...Object.fromEntries(FIELDS.map((k) => [k, original[k]])) };
const eventually = async (fn, tries = 20) => { for (let i = 0; i < tries; i++) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 700)); } return false; };
const pub = async (path) => (await fetch(BASE + path, { cache: 'no-store' })).text();

try {
  await p.goto(`${BASE}/admin/settings/site`, { waitUntil: 'networkidle' });
  await hydrated(p, '#site-phone');
  c.ok((await p.inputValue('#site-phone')) === original.phone && (await p.inputValue('#site-bookingUrl')) === original.bookingUrl, 'the page shows the current details');
  c.ok(await p.locator('button[type=submit]').isDisabled(), 'Save waits for a change');

  // A bad value is refused, says which field, and keeps what was typed.
  await p.fill('#site-bookingUrl', 'http://insecure.example');
  await p.fill('#site-phone', NEW.phone);
  await p.click('button[type=submit]');
  await p.locator('[role=alert]').waitFor({ timeout: 10000 });
  c.ok((await p.locator('#site-bookingUrl-hint').innerText()).toLowerCase().includes('full https'), 'a booking link that is not https is refused, naming the field');
  c.ok((await p.inputValue('#site-phone')) === NEW.phone && (await p.inputValue('#site-bookingUrl')) === 'http://insecure.example', 'what was typed is still in the form');

  // A good save.
  await p.fill('#site-bookingUrl', NEW.bookingUrl);
  await p.fill('#site-email', NEW.email);
  await p.click('button[type=submit]');
  await p.locator('[role=status]').waitFor({ timeout: 10000 });
  c.ok((await p.locator('[role=status]').innerText()).startsWith('Saved'), 'saving says so');
  await p.screenshot({ path: `${SHOTS}/site-settings-1280.png`, fullPage: true });

  // The public site follows, without a deploy.
  c.ok(await eventually(async () => (await pub('/')).includes(NEW.email)), 'the footer shows the new email');
  const home = await pub('/');
  c.ok(home.includes(NEW.phone) && home.includes('tel:+18325550142'), 'the footer shows the new phone, with a matching dial link');
  c.ok(!home.includes(original.email) || original.email === NEW.email, 'the old email is gone from the footer');
  c.ok((await pub('/pricing')).includes(`mailto:${NEW.email}`), 'pricing\'s "Get started" links use the new email');
  const privacy = await pub('/privacy-policy');
  c.ok(privacy.includes(NEW.email) && privacy.includes(NEW.phone), 'the privacy policy shows the new contact details');
  c.ok((await pub('/terms-of-service')).includes(NEW.email), 'the terms of service show the new email');
  c.ok((await pub('/')).includes(`\\"email\\":\\"${NEW.email}\\"`) || (await pub('/')).includes(`"email":"${NEW.email}"`), 'the search-engine data (JSON-LD) carries the new email');

  // /book redirects to the new booking link; the modal embeds it.
  const book = await ctx.request.get(`${BASE}/book`, { maxRedirects: 0 });
  c.ok(book.status() === 302 && book.headers().location === NEW.bookingUrl, '/book redirects to the new booking link');
  const visitor = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await visitor.goto(BASE, { waitUntil: 'networkidle' });
  await hydrated(visitor, 'header');
  await visitor.locator('a[href="/book"]:visible').first().click();
  const frame = visitor.locator('iframe[src*="calendly"], iframe[src*="rem-test"], dialog iframe, [role=dialog] iframe').first();
  await frame.waitFor({ timeout: 15000 });
  const src = await frame.getAttribute('src');
  c.ok(src?.startsWith(NEW.bookingUrl), `the booking window embeds the new link (${src?.slice(0, 60)})`);
  c.ok(visitor.url().replace(/\/$/, '') === BASE, 'clicking Book a call opens the window instead of leaving the page');

  // Phone width.
  const m = await (await browser.newContext({ viewport: { width: 390, height: 900 }, storageState: await ctx.storageState() })).newPage();
  await m.goto(`${BASE}/admin/settings/site`, { waitUntil: 'networkidle' });
  const over = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  c.ok(over <= 1, `390px /admin/settings/site (overflow ${over}px)`);
  await m.screenshot({ path: `${SHOTS}/site-settings-390.png`, fullPage: true });
} finally {
  const back = await api('PUT', '/admin/site-settings', restore);
  c.ok(back.status === 200, 'the original details are restored');
}

// Who may change it.
const mgrUser = process.env.E2E_MANAGER_USER || 'manager';
if (process.env.E2E_MANAGER_PASS) {
  const mgr = await (await browser.newContext()).newPage();
  await signIn(mgr, { username: mgrUser, password: process.env.E2E_MANAGER_PASS });
  await mgr.goto(`${BASE}/admin/settings/site`);
  c.ok(!mgr.url().includes('/settings/site'), 'managers are kept out of the Site details page');
} else {
  console.log('· skipped the manager check (set E2E_MANAGER_PASS to run it)');
}

c.ok(errors.length === 0, `no browser errors${errors.length ? ': ' + [...new Set(errors)].join(' | ') : ''}`);
await browser.close();
c.done();
