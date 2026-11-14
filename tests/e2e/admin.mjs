// Every admin page (desktop + phone) and the main flows: FAQ and rates edits
// reaching the public site without a rebuild, a lead reaching the admin, the
// quiz priced on the server, the public popups endpoint.
import { BASE, SHOTS, checks, launch, signIn } from './lib.mjs';

const c = checks();
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const errors = [];
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
await signIn(p);

const PAGES = [
  '/admin', '/admin/activity', '/admin/leads', '/admin/leads/new', '/admin/leads/import', '/admin/tasks',
  '/admin/quizzes', '/admin/catalog', '/admin/catalog/new',
  '/admin/content/faq', '/admin/content/faq/new', '/admin/content/reviews', '/admin/content/reviews/new',
  '/admin/content/posts', '/admin/content/posts/new', '/admin/content/team', '/admin/content/team/new',
  '/admin/content/popups', '/admin/content/popups/new', '/admin/settings', '/admin/settings/users',
];
const BROKEN = /couldn.t load|having a moment|No database configured/i;
for (const path of PAGES) {
  errors.length = 0;
  const res = await p.goto(BASE + path, { waitUntil: 'networkidle' });
  const h1 = ((await p.locator('h1').first().textContent().catch(() => '')) ?? '').trim();
  const bad = await p.locator(`text=${BROKEN}`).count();
  c.ok(res?.status() === 200 && h1 && !bad && errors.length === 0,
    `${path} → ${res?.status()} "${h1.slice(0, 30)}"${errors.length ? ' errors: ' + errors.join(' | ') : ''}`);
  await p.screenshot({ path: `${SHOTS}/admin${path.replace(/\//g, '_')}.png` });
}

const call = (method, path, body) => p.evaluate(async ({ method, path, body }) => {
  const r = await fetch('/api/v1' + path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}, { method, path, body });
const publicHtml = async (path) => (await fetch(BASE + path, { cache: 'no-store' })).text();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const eventually = async (fn) => { for (let i = 0; i < 12; i++) { if (await fn()) return true; await sleep(700); } return false; };

// FAQ: publish → appears on /faq (on-demand revalidation), then clean up
const groups = (await call('GET', '/admin/faq/groups')).body;
const q = `E2E check question ${Date.now().toString(36)}?`;
const created = await call('POST', '/admin/faq/items', { groupId: groups[0].id, question: q, answer: '<p>An end-to-end check.</p>' });
c.ok(created.status === 201, `FAQ question created (${created.status})`);
const before = (await publicHtml('/faq')).includes(q);
await call('PATCH', `/admin/faq/items/${created.body.id}`, { published: true });
c.ok(!before && await eventually(async () => (await publicHtml('/faq')).includes(q)), 'published FAQ appears on /faq without a rebuild');
await call('PATCH', `/admin/faq/items/${created.body.id}`, { published: false });
c.ok((await call('DELETE', `/admin/faq/items/${created.body.id}`)).status === 204, 'test question removed');

// Rates: change Pro → /pricing and home update; then restore
const pro = (await call('GET', '/admin/catalog/tiers')).body.find((t) => t.key === 'pro');
c.ok((await call('PATCH', '/admin/catalog/tiers/pro', { hourlyRateUsd: '8.75', confirm: true })).status === 200, 'Pro rate changed');
c.ok(await eventually(async () => (await publicHtml('/pricing')).includes('$8.75')), '/pricing shows the new rate');
c.ok((await publicHtml('/')).includes('$8.75'), 'home page shows the new rate');
await call('PATCH', '/admin/catalog/tiers/pro', { hourlyRateUsd: pro.hourlyRateUsd, confirm: true });

// A public lead reaches the admin and the activity log
const lead = await p.evaluate(async () => {
  const r = await fetch('/api/v1/public/leads', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `e2e-${Date.now()}@example.com`, firstName: 'Eve', lastName: 'Visitor', source: 'contact_form', consent: true, message: 'e2e' }) });
  return { status: r.status, body: await r.json() };
});
c.ok(lead.status === 201, 'public lead accepted');
await p.goto(`${BASE}/admin/leads`);
c.ok((await p.content()).includes('Eve Visitor'), 'lead shows in the Leads list');
await p.goto(`${BASE}/admin/leads/${lead.body.id}`);
c.ok((await p.content()).includes('New enquiry'), 'lead page shows its scored "New enquiry" timeline entry');
await p.goto(`${BASE}/admin/activity`);
c.ok((await p.content()).includes('New lead from e2e-'), 'activity log shows the new lead');

// Quiz priced on the server; a client-sent price is ignored
const quiz = await p.evaluate(async () => {
  const r = await fetch('/api/v1/public/quiz', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ answers: { gap: 'back', hours: 'ft', process: 'sop', judgment: 'low', timing: 'now' }, result: { rate: 1, cost: '$1' } }) });
  return { status: r.status, body: await r.json() };
});
c.ok(quiz.status === 201 && quiz.body.result?.rate >= 8, `quiz priced on the server (rate ${quiz.body.result?.rate})`);
const pop = await (await fetch(`${BASE}/api/v1/public/popups`)).json();
c.ok(Array.isArray(pop.popups), 'public popups endpoint reachable through the site');

// Phone width: every admin page fits and renders
const m = await (await browser.newContext({ viewport: { width: 390, height: 900 }, storageState: await ctx.storageState() })).newPage();
for (const path of PAGES) {
  await m.goto(BASE + path, { waitUntil: 'networkidle' });
  const over = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const h1 = ((await m.locator('h1').first().textContent().catch(() => '')) ?? '').trim();
  const bad = await m.locator(`text=${BROKEN}`).count();
  c.ok(h1 && !bad && over <= 1, `390px ${path} → "${h1.slice(0, 30)}" (overflow ${over}px)`);
}

await browser.close();
c.done();
