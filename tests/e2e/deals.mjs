// CRM slices 1–3 in the browser: pipeline settings, a new deal worked through
// its stages (edit, move, lose with a reason, reopen), converting a lead, the
// company page (contacts, details, notes), the lists, and phone width.
import { BASE, SHOTS, checks, hydrated, launch, signIn } from './lib.mjs';

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
async function body() {
  await p.waitForLoadState('networkidle');
  await p.locator('h1').first().waitFor({ timeout: 15000 });
  await p.locator('text=Loading…').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
  return p.locator('body').innerText();
}
const settle = () => p.waitForTimeout(1200);

// 1. Pipeline settings (admins)
const stageName = `Pilot ${stamp}`;
const reason = `E2E reason ${stamp}`;
await p.goto(`${BASE}/admin/settings/crm`, { waitUntil: 'networkidle' });
await hydrated(p, 'input[aria-label="New stage name"]');
await p.fill('input[aria-label="New stage name"]', stageName);
await p.fill('input[aria-label="Win probability for the new stage"]', '60');
await p.click('button:has-text("Add stage")');
const newStage = p.locator(`input[aria-label="Stage name"][value="${stageName}"]`);
await newStage.waitFor({ timeout: 10000 }).catch(() => {});
/* Known Next 15.5 router issue (docs/FRONTEND-GAPS.md): the page refresh after a save is sometimes
   aborted by the browser, so the list stays stale until a reload. The save itself succeeded. */
if ((await newStage.count()) === 0) {
  console.log('· the stage list was stale after the save; reloading (known router refresh issue)');
  await p.reload({ waitUntil: 'networkidle' });
}
const stageNames = await p.locator('input[aria-label="Stage name"]').evaluateAll((els) => els.map((e) => e.value));
c.ok((await newStage.count()) === 1, `settings: a new stage is added${(await newStage.count()) === 1 ? '' : ` (saw: ${stageNames.join(', ')}; alerts: ${(await p.locator('[role=alert]').allInnerTexts()).join(' ')})`}`);
await hydrated(p, 'input[aria-label="New loss reason"]');
await p.fill('input[aria-label="New loss reason"]', reason);
await p.click('button:has-text("Add reason")');
const newReason = p.locator(`input[aria-label="Loss reason"][value="${reason}"]`);
await newReason.waitFor({ timeout: 10000 }).catch(() => {});
if ((await newReason.count()) === 0) {
  console.log('· the loss reason list was stale after the save; reloading (known router refresh issue)');
  await p.reload({ waitUntil: 'networkidle' });
}
c.ok((await newReason.count()) === 1, 'settings: a new loss reason is added');
await p.screenshot({ path: `${SHOTS}/deals-1280-settings.png`, fullPage: true });

// 2. A new deal from scratch
const company = `Acme ${stamp}`;
const title = `${company} — two SDRs`;
await p.goto(`${BASE}/admin/deals/new`);
await p.fill('#d-title', title);
await p.fill('#d-company', company);
await p.fill('#d-contact-email', `sara.${stamp}@acme-${stamp}.io`);
await p.fill('#d-contact-name', 'Sara Bekele');
await p.fill('#d-hours', '320');
await p.fill('#d-rate', '9.50');
await Promise.all([p.waitForURL(/\/admin\/deals\/[0-9a-f-]{36}$/, { timeout: 15000 }), p.click('button:has-text("Create deal")')]);
const dealUrl = p.url();
c.ok((await p.locator('h1').first().textContent()).includes(title), 'new deal opens its page');
c.ok((await body()).includes('$3,040'), 'monthly value is hours × rate ($3,040/mo)');

// 3. Work the deal: edit terms, move stage, note, task
await p.fill('#d-prob', '40');
await p.click('button:has-text("Save changes")');
await settle();
await p.selectOption('#deal-stage', { label: 'Negotiation' });
await settle();
await p.fill('#note-body', 'They want a pilot first.');
await p.click('button:has-text("Add note")');
await settle();
await p.click('a:has-text("Add task")');
await p.fill('#task-title', `Send proposal ${stamp}`);
await p.click('button:has-text("Add task")');
await settle();
await p.reload({ waitUntil: 'networkidle' });
let text = await body();
c.ok(text.includes('Deal updated: probability'), 'deal edit is on the timeline');
c.ok(/moved the deal[\s\S]*Negotiation/.test(text), 'stage move is on the timeline');
c.ok(text.includes('They want a pilot first.'), 'note is on the timeline');
c.ok(text.includes(`Send proposal ${stamp}`), 'task is on the deal');

// 4. Lose it (a reason is required), then reopen
await p.selectOption('#deal-stage', { label: 'Lost' });
await p.locator('#loss-reason').waitFor({ timeout: 5000 });
await p.selectOption('#loss-reason', { label: 'Price' });
await p.fill('#loss-note', 'Went with a local agency.');
await p.click('button:has-text("Mark as lost")');
await settle();
await p.reload({ waitUntil: 'networkidle' });
text = await body();
c.ok(text.includes('Price — Went with a local agency.'), 'lost with a reason and a note');
await p.selectOption('#deal-stage', { label: 'Negotiation' });
await settle();
await p.reload({ waitUntil: 'networkidle' });
c.ok(!(await body()).includes('Why it was lost'), 'moving back reopens the deal');
await p.screenshot({ path: `${SHOTS}/deals-1280-deal.png`, fullPage: true });

// 5. The board and the list
await p.goto(`${BASE}/admin/deals`);
c.ok((await body()).includes(title), 'the deal is on the board');
await p.goto(`${BASE}/admin/deals?view=list&q=${encodeURIComponent(stamp)}`);
c.ok((await body()).includes(title), 'the list view finds it by search');
await p.screenshot({ path: `${SHOTS}/deals-1280-board.png`, fullPage: true });

// 6. Convert a lead
const lead = await p.evaluate(async (s) => {
  const r = await fetch('/api/v1/public/leads', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `omar.${s}@beta-${s}.io`, firstName: 'Omar', lastName: 'Ali', company: `Beta ${s}`, source: 'contact_form', consent: true }),
  });
  return r.json();
}, stamp);
await p.goto(`${BASE}/admin/leads/${lead.id}?tab=conversion`);
c.ok((await p.inputValue('#d-company')) === `Beta ${stamp}`, 'convert form is filled from the lead');
await Promise.all([p.waitForURL(/\/admin\/deals\/[0-9a-f-]{36}$/, { timeout: 15000 }), p.click('button:has-text("Convert to deal")')]);
c.ok((await body()).includes('Deal created from a lead'), 'conversion opens the new deal');
await p.goto(`${BASE}/admin/leads/${lead.id}?tab=conversion`);
c.ok((await body()).includes('This lead has been converted'), 'the lead links to its deal');

// 7. The company page
await p.goto(dealUrl);
await Promise.all([p.waitForURL(/\/admin\/companies\/[0-9a-f-]{36}$/), p.click(`a:has-text("${company}")`)]);
text = await body();
c.ok(text.includes('Sara Bekele') && text.includes(title), 'company page shows its contact and deal');
await p.click('summary:has-text("Details and contacts")');
await p.fill('#co-ind', 'Logistics');
await p.click('button:has-text("Save company")');
await settle();
await p.fill('#ct-first', 'Omar');
await p.fill('#ct-email', `omar.${stamp}@acme-${stamp}.io`);
await p.click('button:has-text("Add contact")');
await settle();
await p.reload({ waitUntil: 'networkidle' });
text = await body();
c.ok(text.includes('Company details updated: industry'), 'company edit is on its timeline');
c.ok(text.includes('Contact added: Omar'), 'new contact is added');
await p.click('button[aria-label="Remove Omar"]');
await p.click('button:has-text("Remove Omar?")');
await settle();
await p.reload({ waitUntil: 'networkidle' });
c.ok((await body()).includes('Contact removed: Omar'), 'contact is removed');
await p.screenshot({ path: `${SHOTS}/deals-1280-company.png`, fullPage: true });

// 8. Lists
await p.goto(`${BASE}/admin/companies?q=${encodeURIComponent(stamp)}`);
c.ok((await body()).includes(company), 'companies list finds the company');
const coRow = p.locator(`li:has(a:has-text("${company}"))`).first();
/* His layout keeps Contacts and Owner for wider screens. */
c.ok((await coRow.locator('text="Open deals"').first().isVisible().catch(() => false))
  && (await coRow.locator('text="Won"').first().isVisible().catch(() => false)),
  'at 1280px a company row shows its open deals and won value');
await p.goto(`${BASE}/admin/contacts?q=${encodeURIComponent(company)}`);
c.ok((await body()).includes('Sara Bekele'), 'contacts list finds people by company name');

// 9. Clean up the settings this run added
await p.goto(`${BASE}/admin/settings/crm`, { waitUntil: 'networkidle' });
await p.locator(`form:has(input[aria-label="Stage name"][value="${stageName}"]) button:has-text("Archive")`).click();
await settle();
await p.locator(`form:has(input[aria-label="Loss reason"][value="${reason}"]) button:has-text("Archive")`).click();
await settle();
await p.reload({ waitUntil: 'networkidle' });
c.ok((await p.locator(`input[value="${stageName}"], input[value="${reason}"]`).count()) === 0, 'settings: stage and reason archived');

// 10. Managers work deals but not settings
const mgrCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const mgr = await mgrCtx.newPage();
await signIn(mgr, { username: process.env.E2E_MANAGER_USER || 'manager', password: process.env.E2E_MANAGER_PASS || '' }).catch(() => null);
if (mgr.url().includes('/admin') && !mgr.url().includes('signin')) {
  await mgr.goto(`${BASE}/admin/settings/crm`);
  c.ok(!mgr.url().includes('/settings/crm'), 'managers are kept out of CRM settings');
} else {
  console.log('· skipped the manager check (set E2E_MANAGER_PASS to run it)');
}

// 11. Phone width
const m = await (await browser.newContext({ viewport: { width: 390, height: 900 }, storageState: await ctx.storageState() })).newPage();
const companyUrl = (await p.evaluate(() => location.href)).replace(BASE, '');
for (const path of [dealUrl.replace(BASE, ''), '/admin/deals', '/admin/deals?view=list', '/admin/deals/new', `/admin/leads/${lead.id}?tab=conversion`, '/admin/companies', '/admin/contacts', '/admin/settings/crm', companyUrl]) {
  await m.goto(BASE + path, { waitUntil: 'networkidle' });
  const over = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const h1 = ((await m.locator('h1').first().textContent().catch(() => '')) ?? '').trim();
  const bad = await m.locator('text=/having a moment|couldn.t load/i').count();
  const label = path.replace(/[0-9a-f-]{36}/, '[id]');
  c.ok(h1 && !bad && over <= 1, `390px ${label} → "${h1.slice(0, 28)}" (overflow ${over}px)`);
  await m.screenshot({ path: `${SHOTS}/deals-390${label.replace(/[/?=&[\]]/g, '_')}.png` });
}

c.ok(errors.length === 0, `no browser errors${errors.length ? ': ' + [...new Set(errors)].join(' | ') : ''}`);
await browser.close();
c.done();
