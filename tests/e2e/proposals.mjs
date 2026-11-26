// CRM slice 4 in the browser: a proposal drafted from a deal, edited (lines,
// discount), sent, opened by the client at their private link on a phone,
// accepted — the deal is won at the proposal's value — plus a decline and a
// revision, the Proposals list, and phone width.
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

/** The page's text once it has finished loading (not the "Loading…" screen). */
async function text(page = p) {
  await page.waitForLoadState('networkidle');
  await page.locator('h1').first().waitFor({ timeout: 15000 });
  await page.locator('text=Loading…').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
  return page.locator('body').innerText();
}

/** A deal for a fresh company: 320 h/mo at $9.50 = $3,040/mo. */
async function newDeal(name) {
  return p.evaluate(async (company) => {
    const settings = await (await fetch('/api/v1/admin/crm/settings')).json();
    const r = await fetch('/api/v1/admin/deals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: `${company} — SDRs`, companyName: company, contactEmail: `sara@${company.toLowerCase().replace(/\s+/g, '-')}.io`,
        contactName: 'Sara Bekele', service: 'Sales and revenue', hoursPerMonth: 320, rate: '9.50', stageId: settings.stages[0].id,
      }),
    });
    return (await r.json()).id;
  }, name);
}

/** From a deal page: New proposal → the draft's page. */
async function draftFrom(dealId) {
  await p.goto(`${BASE}/admin/deals/${dealId}`);
  await text();
  await Promise.all([p.waitForURL(/\/admin\/proposals\/[0-9a-f-]{36}$/, { timeout: 15000 }), p.click('button:has-text("New proposal")')]);
  await text();
  return p.url();
}

// 1. Draft, edit, send
const company = `Acme ${stamp}`;
const dealId = await newDeal(company);
const proposalUrl = await draftFrom(dealId);
c.ok((await text()).includes('$3,040'), 'draft is priced from the deal (320 h × $9.50 = $3,040/mo)');
const box = async (sel) => p.locator(sel).first().boundingBox();
const [main, rail] = [await box('[aria-label="Proposal status"]').then(() => box('form')), await box('[aria-label="Proposal status"]')];
c.ok(main && rail && main.x + main.width <= rail.x + 1, 'editor and status panel sit side by side, not overlapping');
await p.fill('#p-title', `${company}: your SDR team`);
await p.click('button:has-text("Add one-off fee")');
await p.fill('input[aria-label="Line 2 description"]', 'Recruitment and onboarding');
await p.getByLabel('Amount $').last().fill('500');
await p.fill('#p-discount', '10');
await p.click('button:has-text("Save draft")');
await p.locator('text=Saved').first().waitFor({ timeout: 10000 }).catch(() => {});
await p.reload({ waitUntil: 'networkidle' });
let page = await text();
c.ok(page.includes('$2,736') && page.includes('Recruitment and onboarding'), 'saved draft: 10% off the monthly fees ($2,736/mo) plus a one-off');
await p.click('button:has-text("Mark as sent")');
await p.locator('text=Marked as sent').waitFor({ timeout: 10000 }).catch(() => {});
await p.reload({ waitUntil: 'networkidle' });
c.ok((await text()).includes('Sent'), 'proposal is marked as sent');
const link = await p.inputValue('#p-link');
c.ok(link.startsWith(`${BASE}/p/`) && /\/p\/[A-Za-z0-9_-]{20,}$/.test(link), 'client link is on the site in use, with a private token');
await p.screenshot({ path: `${SHOTS}/proposals-1280-proposal.png`, fullPage: true });
await p.goto(`${BASE}/admin/deals/${dealId}`);
c.ok((await text()).includes('Proposal sent'), 'sending moved the deal to "Proposal sent"');

// 2. The client accepts, on a phone, without signing in
const client = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
client.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
await client.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'networkidle' });
page = await text(client);
c.ok(page.includes(`${company}: your SDR team`) && page.includes('$2,736'), 'client sees the proposal at the link');
const over = await client.evaluate(() => document.documentElement.scrollWidth - innerWidth);
c.ok(over <= 1, `client page fits a phone (overflow ${over}px)`);
await client.screenshot({ path: `${SHOTS}/proposals-390-client.png`, fullPage: true });
await client.click('button:has-text("Accept proposal")');
await client.fill('#acc-name', 'Sara Bekele');
await client.check('input[name="agree"]');
await client.click('button[type="submit"]:has-text("Accept")');
await client.locator('text=Thank you').waitFor({ timeout: 10000 }).catch(() => {});
c.ok((await client.locator('body').innerText()).includes('Thank you — accepted.'), 'client accepts');
await client.reload({ waitUntil: 'networkidle' });
c.ok((await text(client)).includes('Accepted by Sara Bekele'), 'the link now shows it was accepted');

// 3. The team sees the deal won at the proposal's value
await p.goto(`${BASE}/admin/deals/${dealId}`);
page = await text();
c.ok(page.includes('Won') && page.includes('$2,736'), 'deal is won at the proposal’s monthly value');
c.ok(page.includes('Sara Bekele accepted proposal'), 'the acceptance is on the deal timeline');
await p.goto(proposalUrl);
c.ok((await text()).includes('Accepted'), 'proposal page shows Accepted');

// 4. A decline, then a revision
const dealB = await newDeal(`Beta ${stamp}`);
const proposalB = await draftFrom(dealB);
await p.click('button:has-text("Mark as sent")');
await p.locator('text=Marked as sent').waitFor({ timeout: 10000 }).catch(() => {});
await p.reload({ waitUntil: 'networkidle' });
const linkB = (await p.inputValue('#p-link')).replace(/^https?:\/\/[^/]+/, BASE);
await client.goto(linkB, { waitUntil: 'networkidle' });
await client.click('button:has-text("Decline")');
await client.fill('#dec-name', 'Omar Ali');
await client.fill('#dec-note', 'Budget moved to Q3.');
await client.click('button:has-text("Decline proposal")');
await client.locator('text=Thank you').waitFor({ timeout: 10000 }).catch(() => {});
await p.goto(proposalB);
page = await text();
c.ok(page.includes('Declined') && page.includes('Budget moved to Q3.'), 'decline and its note show on the proposal');
await Promise.all([p.waitForURL((u) => u.pathname.startsWith('/admin/proposals/') && u.href !== proposalB, { timeout: 15000 }), p.click('button:has-text("Revise (new draft)")')]);
c.ok((await text()).includes('Edit the draft'), 'revise opens a new draft');

// 5. The list
await p.goto(`${BASE}/admin/proposals?status=accepted`);
c.ok((await text()).includes(`${company}: your SDR team`), 'Proposals list filters to accepted');
await p.goto(`${BASE}/admin/proposals?status=draft`);
c.ok((await text()).includes(`Beta ${stamp}`), 'the revision is listed as a draft');

// 6. Phone width, admin side
const m = await (await browser.newContext({ viewport: { width: 390, height: 900 }, storageState: await ctx.storageState() })).newPage();
for (const path of ['/admin/proposals', proposalUrl.replace(BASE, ''), p.url().replace(BASE, '')]) {
  await m.goto(BASE + path, { waitUntil: 'networkidle' });
  const o = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const h1 = ((await m.locator('h1').first().textContent().catch(() => '')) ?? '').trim();
  const label = path.replace(/[0-9a-f-]{36}/, '[id]');
  c.ok(h1 && o <= 1, `390px ${label} → "${h1.slice(0, 30)}" (overflow ${o}px)`);
  await m.screenshot({ path: `${SHOTS}/proposals-390${label.replace(/[/?=&[\]]/g, '_')}.png` });
}

c.ok(errors.length === 0, `no browser errors${errors.length ? ': ' + [...new Set(errors)].join(' | ') : ''}`);
await browser.close();
c.done();
