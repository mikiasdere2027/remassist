// CRM slice 8 in the browser: the Reports page (ranges, funnel, calendar,
// every table), a CSV download matching the table shown, the dashboard's CRM
// numbers and panels, and phone width.
import { BASE, SHOTS, checks, launch, signIn } from './lib.mjs';

const c = checks();
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

// 1. Reports: the nav link, the default range and every section
await open('/admin');
await Promise.all([p.waitForURL(/\/admin\/reports/), p.click('nav a:has-text("Reports")')]);
await open('/admin/reports');
let page = await text();
c.ok((await p.locator('nav[aria-label="Date range"] a[aria-current="page"]').innerText()).includes('Last 90 days'), 'reports open on the last 90 days');
for (const title of ['Lead funnel', 'Leads by day', 'Conversion by source', 'First response time', 'Win rate by owner',
  'Revenue by service', 'Time in each stage', 'Why deals were lost', 'Conversion by campaign']) {
  c.ok(page.includes(title), `reports show "${title}"`);
}
c.ok((await p.locator('ol li').count()) === 5, 'the funnel has its five steps');
c.ok((await p.locator('[role="img"][aria-label^="Leads per day"] span').count()) === 84, 'the calendar shows 12 weeks of days');
await p.screenshot({ path: `${SHOTS}/reports-1280.png`, fullPage: true });

// 2. Another range
await p.click('nav[aria-label="Date range"] a:has-text("All time")');
await p.waitForFunction(() => location.search.includes('range=all'), null, { timeout: 15000 });
await open('/admin/reports?range=all');
c.ok((await p.locator('nav[aria-label="Date range"] a[aria-current="page"]').innerText()).includes('All time'), 'switching to all time');

// 3. The CSV is the table shown
const sources = p.locator('section:has(h2:has-text("Conversion by source"))');
const shownRows = await sources.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent)));
const href = await sources.locator('a:has-text("Download CSV")').getAttribute('href');
const csv = await p.evaluate(async (u) => {
  const r = await fetch(u);
  return { status: r.status, type: r.headers.get('content-type'), disposition: r.headers.get('content-disposition'), body: await r.text() };
}, href);
const csvRows = csv.body.replace(/^﻿/, '').trim().split('\r\n').slice(1);
c.ok(csv.status === 200 && csv.type === 'text/csv; charset=utf-8' && /attachment; filename="rem-assist-sources-all-/.test(csv.disposition ?? ''), 'CSV downloads with its file name');
c.ok(csvRows.length === shownRows.length && shownRows.every((r, i) => csvRows[i].startsWith(`${r[0]},${r[1]},`)), `the CSV has the rows shown (${shownRows.length})`);

// 4. Dashboard: CRM numbers and panels
await open('/admin');
page = await text();
for (const label of ['Awaiting a first response', 'New leads, last 30 days', 'Open pipeline', 'Monthly recurring revenue', 'My overdue tasks']) {
  c.ok(page.includes(label), `dashboard shows "${label}"`);
}
c.ok(page.includes('Top open deals') && page.includes('Coming up') && page.includes('The latest across leads, deals and customers'), 'dashboard shows top deals, coming up and activity');
c.ok(page.includes('Recent leads') && page.includes('At a glance'), 'the rest of the dashboard is still there');
await open('/admin/reports?range=all');
c.ok(!/Pilot [a-z0-9]{6,}/.test(await text()), 'archived test stages are not in the time-in-stage report');
await open('/admin');
await p.screenshot({ path: `${SHOTS}/dashboard-1280.png`, fullPage: true });
await open('/admin');
await p.click('a:has-text("Monthly recurring revenue")');
await p.waitForFunction(() => location.pathname.startsWith('/admin/customers'), null, { timeout: 15000 });
c.ok(p.url().includes('/admin/customers'), 'a headline number opens the list behind it');

// 5. Phone width
const m = await (await browser.newContext({ viewport: { width: 390, height: 900 }, storageState: await ctx.storageState() })).newPage();
for (const path of ['/admin/reports', '/admin/reports?range=30', '/admin']) {
  await m.goto(BASE + path, { waitUntil: 'networkidle' });
  const over = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const h1 = ((await m.locator('h1').first().textContent().catch(() => '')) ?? '').trim();
  c.ok(h1 && over <= 1, `390px ${path} → "${h1}" (overflow ${over}px)`);
  await m.screenshot({ path: `${SHOTS}/reports-390${path.replace(/[/?=&]/g, '_')}.png`, fullPage: true });
}

c.ok(errors.length === 0, `no browser errors${errors.length ? ': ' + [...new Set(errors)].join(' | ') : ''}`);
await browser.close();
c.done();
