// CRM slice 7 in the browser: lead assignment settings (always one person,
// a service rule, a bad rule refused), a website lead arriving assigned with
// its first-contact task, the digest card, and phone width. Puts the
// original settings back at the end.
import { BASE, SHOTS, checks, launch, signIn } from './lib.mjs';

const c = checks();
const stamp = Date.now().toString(36);
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
await signIn(p);

async function open(path) {
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  await p.locator('h1').first().waitFor({ timeout: 15000 });
  await p.locator('text=Loading…').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
}
const text = () => p.locator('body').innerText();
const api = (path, init) => p.evaluate(async ([u, i]) => {
  const r = await fetch(`/api/v1${u}`, i ? { ...i, headers: { 'content-type': 'application/json' } } : undefined);
  return { status: r.status, body: await r.json().catch(() => null) };
}, [path, init]);

const original = (await api('/admin/crm/settings')).body.automation;
const team = (await api('/admin/leads/assignees')).body;
const me = team.find((u) => u.username === (process.env.E2E_USER || 'eyob'));

try {
  // 1. The two new cards
  await open('/admin/settings/crm');
  let page = await text();
  c.ok(page.includes('Lead assignment') && page.includes('Daily digest and integrations'), 'settings shows lead assignment and the digest');
  c.ok(/Slack (connected|not connected) · Calendly (connected|not connected)/.test(page), 'the digest card says what is connected');

  // 2. A rule naming nobody on the team is refused
  await p.selectOption('#a-mode', 'single');
  await p.selectOption('#a-owner', me.id);
  await p.fill('#a-rules', 'Bookkeeping | nobody@nowhere.test');
  await p.click('button:has-text("Save")');
  await p.locator('[role=alert]').first().waitFor({ timeout: 10000 });
  c.ok((await p.locator('[role=alert]').first().innerText()).includes('Rule 1: write "service | email of a team member".'), 'a rule for someone not on the team is refused');

  // 3. Always me, a rule by email, a 3-hour reply target
  await p.fill('#a-rules', `Bookkeeping | ${me.email}`);
  await p.fill('input[name="firstContactHours"]', '3');
  await p.click('button:has-text("Save")');
  await p.locator('text=Saved').first().waitFor({ timeout: 10000 });
  await open('/admin/settings/crm');
  c.ok((await p.inputValue('#a-mode')) === 'single' && (await p.inputValue('#a-rules')) === `Bookkeeping | ${me.email}`
    && (await p.inputValue('input[name="firstContactHours"]')) === '3', 'settings are saved and shown again');

  // 4. A website lead arrives assigned, with its first-contact task
  const lead = await p.evaluate(async (s) => (await (await fetch('/api/v1/public/leads', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `auto.${s}@example.com`, firstName: `Auto ${s}`, source: 'contact_form', consent: true }),
  })).json()), stamp);
  await open(`/admin/leads/${lead.id}`);
  page = await text();
  c.ok(page.includes(`First contact: Auto ${stamp}`), 'the new lead has its first-contact task');
  c.ok(page.includes('Task added: First contact within 3 business hours'), 'the task is on the timeline with the 3-hour target');
  c.ok((await api(`/admin/leads/${lead.id}`)).body.ownerId === me.id && page.includes(me.name), `the lead is assigned to ${me.name}`);
  await p.screenshot({ path: `${SHOTS}/automation-1280-lead.png`, fullPage: true });

  // 5. Phone width
  const m = await (await browser.newContext({ viewport: { width: 390, height: 900 }, storageState: await ctx.storageState() })).newPage();
  await m.goto(`${BASE}/admin/settings/crm`, { waitUntil: 'networkidle' });
  const over = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  c.ok(over <= 1, `390px /admin/settings/crm (overflow ${over}px)`);
  await m.screenshot({ path: `${SHOTS}/automation-390-settings.png`, fullPage: true });
} finally {
  const back = await api('/admin/crm/automation', { method: 'PUT', body: JSON.stringify(original) });
  c.ok(back.status === 200, 'original automation settings restored');
}

c.ok(errors.length === 0, `no browser errors${errors.length ? ': ' + [...new Set(errors)].join(' | ') : ''}`);
await browser.close();
c.done();
