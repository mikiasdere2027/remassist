// CRM slices 5–6 in the browser: a won deal becomes a customer; its roles, terms,
// contract and renewal, onboarding (the last step makes it Active), churn with
// a reason (the company becomes a former customer), contract files (upload,
// signed-in download, refused fakes, removal), notes, the Customers
// list's views and counts, and phone width.
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

/** Open a page and wait until it has finished loading. */
async function open(path) {
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  await p.locator('h1').first().waitFor({ timeout: 15000 });
  await p.locator('text=Loading…').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
}
const text = () => p.locator('body').innerText();
const ok = (sel) => p.locator(sel).first().waitFor({ timeout: 10000 }).catch(() => {});

// 1. A deal is won → a customer
const company = `Acme ${stamp}`;
const { dealId } = await p.evaluate(async (name) => {
  const settings = await (await fetch('/api/v1/admin/crm/settings')).json();
  const won = settings.stages.find((s) => s.kind === 'won');
  const deal = await (await fetch('/api/v1/admin/deals', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: `${name} — two SDRs`, companyName: name, contactEmail: `sara@${name.toLowerCase().replace(/\s+/g, '-')}.io`,
      contactName: 'Sara Bekele', service: 'Sales and revenue', seats: 2, hoursPerMonth: 320, rate: '9.50', stageId: settings.stages[0].id }),
  })).json();
  await fetch(`/api/v1/admin/deals/${deal.id}/move`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stageId: won.id }) });
  return { dealId: deal.id };
}, company);
await open('/admin/customers');
c.ok((await text()).includes(company), 'the won deal is on the Customers list');
await Promise.all([p.waitForURL(/\/admin\/customers\/[0-9a-f-]{36}$/), p.click(`a:has-text("${company}")`)]);
await open(p.url().replace(BASE, ''));
const customerUrl = p.url();
let page = await text();
c.ok(page.includes('Sales and revenue') && page.includes('2 seats') && page.includes('$3,040'), 'customer carries the deal’s service, seats and value');
c.ok(page.includes('Customer engagement started from the won deal'), 'timeline starts from the won deal');

// 2. Roles and terms
await p.fill('#roles', 'SDR | 2 | 320 | Hana Tesfaye, Dawit Bekele\nTeam lead | 1');
await p.click('button:has-text("Save roles")');
await ok('text=Saved');
await p.fill('#t-value', '4320');
await p.click('button:has-text("Save terms")');
await ok('text=Saved');
await open(customerUrl.replace(BASE, ''));
page = await text();
c.ok(page.includes('Hana Tesfaye, Dawit Bekele') && page.includes('3 seats'), 'roles and staff placed are saved');
c.ok(page.includes('$4,320') && page.includes('Updated monthly value'), 'terms update the monthly value, logged');

// 3. Contract and renewal
const day = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
await open(`${customerUrl.replace(BASE, '')}?tab=contract`);
await p.fill('#c-start', day(-335));
await p.fill('#c-end', day(30));
await p.fill('#c-renew', day(30));
await p.fill('#c-notice', '45');
await p.click('button:has-text("Save contract")');
await ok('text=Saved');
await open(`${customerUrl.replace(BASE, '')}?tab=contract`);
page = await text();
c.ok(page.includes('30 days') && page.includes(`notice by ${day(-15)} (passed)`), 'renewal shows days left and the passed notice deadline');

// 3b. Contract files: upload, open (signed in only), refuse a fake, remove
const errorsBefore = errors.length;
const pdf = Buffer.from('%PDF-1.4\n% e2e contract\n');
await p.setInputFiles('#up-file', { name: `Acme MSA ${stamp}.pdf`, mimeType: 'application/pdf', buffer: pdf });
await p.selectOption('select[name="kind"]', 'contract');
await p.click('button:has-text("Upload")');
await ok('text=Uploaded');
await open(`${customerUrl.replace(BASE, '')}?tab=contract`);
const link = p.locator(`a:has-text("Acme MSA ${stamp}.pdf")`);
c.ok((await link.count()) === 1 && (await text()).includes('Contract · 24 B'), 'uploaded contract is listed with its kind and size');
const href = await link.getAttribute('href');
const got = await p.evaluate(async (u) => { const r = await fetch(u); return { status: r.status, type: r.headers.get('content-type'), body: await r.text() }; }, href);
c.ok(got.status === 200 && got.type === 'application/pdf' && got.body.startsWith('%PDF'), 'the file opens for a signed-in user');
const anonStatus = await (await browser.newContext()).request.get(BASE + href, { maxRedirects: 0 }).then((r) => r.status());
c.ok(anonStatus === 401, `the file is refused when signed out (${anonStatus})`);
await p.setInputFiles('#up-file', { name: 'contract.pdf', mimeType: 'application/pdf', buffer: Buffer.from([0x4d, 0x5a, 0x90, 0, 1, 2]) });
await p.click('button:has-text("Upload")');
await ok('[role=alert]');
c.ok((await p.locator('[role=alert]').allInnerTexts()).join(' ').includes('Upload a PDF, Word, Excel, PNG or JPEG file.'), 'a renamed program is refused by its content');
await p.click(`button[aria-label="Remove Acme MSA ${stamp}.pdf"]`);
await p.click('button:has-text("Confirm remove")');
await p.waitForTimeout(1500);
await open(customerUrl.replace(BASE, ''));
page = await text();
c.ok(!(await p.locator(`a:has-text("Acme MSA ${stamp}.pdf")`).count()) && page.includes(`Uploaded Acme MSA ${stamp}.pdf`) && page.includes(`Removed Acme MSA ${stamp}.pdf`), 'removed file is gone; upload and removal are on the timeline');
const after = await p.evaluate(async (u) => (await fetch(u)).status, href);
c.ok(after === 404, 'a removed file no longer opens');
/* The refused fake (400) and the removed file (404) were asked for on purpose. */
errors.splice(errorsBefore, errors.length, ...errors.slice(errorsBefore).filter((e) => !/status of (400|404)/.test(e)));

// 4. Onboarding: the last step makes the customer Active
await open(`${customerUrl.replace(BASE, '')}?tab=delivery`);
const boxes = p.locator('ul input[type="checkbox"]');
const n = await boxes.count();
for (let i = 0; i < n; i++) {
  await boxes.nth(i).check();
  await p.waitForTimeout(400);
}
await p.waitForTimeout(1500);
await open(`${customerUrl.replace(BASE, '')}?tab=delivery`);
c.ok(n === 10 && (await p.inputValue('#eng-status')) === 'active', `all ${n} onboarding steps done → Active`);
c.ok((await text()).includes('Onboarding complete'), '"Onboarding complete" is on the timeline');
await p.screenshot({ path: `${SHOTS}/customers-1280-delivery.png`, fullPage: true });

// 5. Note, then churn (a reason is required)
await p.fill('#note-body', 'Monthly review set for the 1st.');
await p.click('button:has-text("Add note")');
await ok('text=Note added');
await p.selectOption('#eng-status', 'churned');
await p.locator('#churn-reason').waitFor({ timeout: 5000 });
await p.fill('#churn-reason', 'Brought the work in-house.');
await p.click('button:has-text("Mark as churned")');
await p.waitForTimeout(1500);
await open(customerUrl.replace(BASE, ''));
page = await text();
c.ok(page.includes('Why they left') && page.includes('Brought the work in-house.'), 'churned with its reason');
c.ok(page.includes('Monthly review set for the 1st.'), 'note is on the timeline');
await Promise.all([p.waitForURL(/\/admin\/companies\/[0-9a-f-]{36}$/), p.click(`h2 a:has-text("${company}")`)]);
await open(p.url().replace(BASE, ''));
page = await text();
c.ok(page.includes('Former customer') && page.includes('Customer engagements'), 'company is now a former customer, with its engagement listed');
const companyUrl = p.url();

// 6. Back to active; account manager
await open(customerUrl.replace(BASE, ''));
await p.selectOption('#eng-status', 'active');
await p.waitForTimeout(1500);
await p.selectOption('#eng-owner', '');
await p.waitForTimeout(1500);
await open(customerUrl.replace(BASE, ''));
c.ok((await p.inputValue('#eng-status')) === 'active' && (await p.inputValue('#eng-owner')) === '', 'reactivated and unassigned');
await open(companyUrl.replace(BASE, ''));
c.ok((await text()).includes('Customer') && !(await text()).includes('Former customer'), 'company is a customer again');

// 7. The list: views and counts
await open('/admin/customers?view=renewal');
c.ok((await text()).includes(company), '"Renewal due" view lists it');
await open('/admin/customers?view=churned');
c.ok(!(await text()).includes(company), 'no longer under Churned');
await open('/admin/customers');
page = await text();
c.ok(/Monthly recurring revenue/.test(page), 'list shows monthly recurring revenue');
const row = p.locator(`li:has(a:has-text("${company}"))`).first();
const visible = async (label) => row.locator(`text="${label}"`).first().isVisible().catch(() => false);
/* His layout keeps Team and Account manager for wider screens. */
c.ok((await visible('Monthly')) && (await visible('Renewal')),
  'at 1280px a customer row shows its monthly value and renewal');
await p.screenshot({ path: `${SHOTS}/customers-1280-list.png`, fullPage: true });

// 8. Phone width
const m = await (await browser.newContext({ viewport: { width: 390, height: 900 }, storageState: await ctx.storageState() })).newPage();
for (const path of ['/admin/customers', customerUrl.replace(BASE, ''), `${customerUrl.replace(BASE, '')}?tab=contract`, `${customerUrl.replace(BASE, '')}?tab=delivery`, companyUrl.replace(BASE, ''), `/admin/deals/${dealId}`]) {
  await m.goto(BASE + path, { waitUntil: 'networkidle' });
  const over = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const h1 = ((await m.locator('h1').first().textContent().catch(() => '')) ?? '').trim();
  const label = path.replace(/[0-9a-f-]{36}/, '[id]');
  c.ok(h1 && over <= 1, `390px ${label} → "${h1.slice(0, 28)}" (overflow ${over}px)`);
  await m.screenshot({ path: `${SHOTS}/customers-390${label.replace(/[/?=&[\]]/g, '_')}.png` });
}

c.ok(errors.length === 0, `no browser errors${errors.length ? ': ' + [...new Set(errors)].join(' | ') : ''}`);
await browser.close();
c.done();
