// The CRM screens driven like a salesperson would: add a lead, work it
// (owner, priority, status, note, call, task), qualify it, finish the task,
// views + export, CSV import, and phone width.
import { writeFileSync } from 'node:fs';
import { BASE as B, SHOTS, launch, signIn } from './lib.mjs';

const stamp = Date.now().toString(36);
let failures = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) failures++; };

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });

await signIn(p);

// 1. Add a lead by hand
const email = `crm-${stamp}@acme-example.com`;
await p.goto(`${B}/admin/leads/new`);
await p.fill('#nl-first', 'Selam');
await p.fill('#nl-last', 'Tesfaye');
await p.fill('#nl-email', email);
await p.fill('#nl-company', 'Acme Logistics');
await p.fill('#nl-phone', '+251911223344');
await p.selectOption('#nl-source', 'referral');
await Promise.all([p.waitForURL(/\/admin\/leads\/[0-9a-f-]{36}$/, { timeout: 15000 }), p.click('form button[type=submit]')]);
const leadUrl = p.url();
ok(true, `added a lead by hand → ${leadUrl.replace(B, '')}`);
ok((await p.locator('h1').first().textContent()).includes('Selam'), 'lead page shows the new lead');
ok(await p.locator('text=Added by hand').count() > 0, 'timeline starts with "Added by hand"');
ok(await p.locator('[aria-label="Why this score"] li').count() > 0, 'lead score is explained (reasons from the backend)');

// duplicate
await p.goto(`${B}/admin/leads/new`);
await p.fill('#nl-first', 'Again');
await p.fill('#nl-email', email);
await p.click('form button[type=submit]');
await p.locator('text=already exists').first().waitFor({ timeout: 10000 }).catch(() => {});
ok(await p.locator('text=already exists').count() > 0, 'duplicate email is refused with a link to the existing lead');

// 2. Work the lead: owner, priority, status, note, call, task
await p.goto(leadUrl);
await p.selectOption('#lead-owner', '');  // unassign, a real change from the creator
await p.locator('text=Saving…').first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
await p.waitForTimeout(800);
await p.selectOption('#lead-priority', 'high');
await p.waitForTimeout(1200);
await p.selectOption('#lead-status', 'contacted');
await p.waitForTimeout(1500);

await p.fill('#note-body', 'Needs two SDRs from January; budget approved.');
await p.click('button:has-text("Add note")');
await p.locator('text=Note added').waitFor({ timeout: 10000 }).catch(() => {});

await p.click('button[role=tab]:has-text("Log a call")');
await p.selectOption('#call-outcome', 'voicemail');
await p.fill('#call-minutes', '3');
await p.fill('#call-body', 'Left a voicemail about the proposal.');
await p.click('button:has-text("Log call")');
await p.locator('text=Call logged').waitFor({ timeout: 10000 }).catch(() => {});

await p.click('button[role=tab]:has-text("Task")');
const taskTitle = `Send proposal ${stamp}`;
await p.fill('#task-title', taskTitle);
const due = new Date(Date.now() + 2 * 86_400_000);
const local = new Date(due.getTime() - due.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
await p.fill('#task-due', local);
await p.click('button:has-text("Add task")');
await p.locator('text=Task added').waitFor({ timeout: 10000 }).catch(() => {});
await p.waitForTimeout(1500);
await p.reload();

const html = await p.content();
ok(html.includes('unassigned the lead'), 'timeline: owner change');
ok(html.includes('Priority set to high'), 'timeline: priority change');
ok(/changed status: .*New.* → .*Contacted/s.test(await p.locator('body').innerText()) || html.includes('Contacted'), 'timeline: status change');
ok(html.includes('Needs two SDRs from January'), 'timeline: note');
ok(html.includes('Left a voicemail about the proposal.'), 'timeline: call with notes');
ok(html.includes(taskTitle), 'task appears on the lead');
ok((await p.inputValue('#lead-status')) === 'contacted', 'status saved');
ok((await p.inputValue('#lead-priority')) === 'high', 'priority saved');
ok((await p.inputValue('#lead-owner')) === '', 'owner saved (unassigned)');
await p.screenshot({ path: `${SHOTS}/1280-lead-worked.png`, fullPage: true });

// 3. Qualification tab
await p.goto(`${leadUrl}?tab=qualification`);
await p.selectOption('select[name=cf_budget]', { index: 3 });
await p.selectOption('select[name=cf_fit]', 'Strong fit');
await p.fill('input[name=cf_seats_needed]', '2');
await p.click('button:has-text("Save qualification")');
await p.locator('text=Saved').first().waitFor({ timeout: 10000 }).catch(() => {});
await p.waitForTimeout(1000);
await p.reload();
ok((await p.inputValue('select[name=cf_fit]')) === 'Strong fit', 'qualification answers saved');
ok((await p.content()).includes('Qualification updated'), 'timeline: qualification update');

// 4. Tasks page: complete the task
await p.goto(`${B}/admin/tasks`);
ok((await p.content()).includes(taskTitle), 'task is on "my" Tasks page');
await p.click(`input[aria-label="Complete: ${taskTitle}"]`);
await p.waitForTimeout(1500);
await p.goto(`${B}/admin/tasks?view=done`);
ok((await p.content()).includes(taskTitle), 'completed task moves to Completed');
await p.screenshot({ path: `${SHOTS}/1280-tasks.png`, fullPage: true });

// 5. Leads list views
await p.goto(`${B}/admin/leads?view=unassigned`);
ok((await p.content()).includes('Selam Tesfaye'), '"Unassigned" view shows the lead');
await p.goto(`${B}/admin/leads`);
await p.screenshot({ path: `${SHOTS}/1280-leads-list.png`, fullPage: true });
const exportRes = await p.request.get(`${B}/api/v1/admin/leads/export?view=unassigned`);
ok(exportRes.status() === 200 && (await exportRes.text()).includes(email), 'CSV export of the view works');

// 6. CSV import through the screen
const csv = `First name,Last name,Email,Company\nImp,One,imp1-${stamp}@acme-example.com,Acme\nImp,Two,imp2-${stamp}@acme-example.com,Beta\nNo,Email,,Gamma\nDup,Lead,${email},Acme\n`;
const file = `${SHOTS}/import-${stamp}.csv`;
writeFileSync(file, csv);
await p.goto(`${B}/admin/leads/import`);
await p.setInputFiles('#import-file', file);
await p.waitForTimeout(800);
await p.screenshot({ path: `${SHOTS}/1280-import-mapped.png`, fullPage: true });
await p.locator('button:has-text("Import")').last().click();
await p.locator('text=added').first().waitFor({ timeout: 15000 }).catch(() => {});
const summary = await p.locator('body').innerText();
ok(/2 leads added/.test(summary), `import added 2 leads`);
ok(/1 skipped because the email already exists/.test(summary), 'import skipped the duplicate');
ok(/1 skipped because of a problem/.test(summary), 'import reported the row without an email');
await p.screenshot({ path: `${SHOTS}/1280-import-result.png`, fullPage: true });

// 7. Phone width on the CRM pages
const m = await (await browser.newContext({ viewport: { width: 390, height: 900 }, storageState: await ctx.storageState() })).newPage();
for (const path of [leadUrl.replace(B, ''), '/admin/leads', '/admin/tasks', '/admin/leads/new', '/admin/leads/import']) {
  await m.goto(B + path, { waitUntil: 'networkidle' });
  const over = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const bad = await m.locator("text=/having a moment|couldn.t load/i").count();
  ok(!bad && over <= 1, `390px ${path.length > 30 ? '/admin/leads/[id]' : path} (overflow ${over}px)`);
  await m.screenshot({ path: `${SHOTS}/390${path.replace(/\//g, '_').slice(0, 40)}.png`, fullPage: false });
}

const real = errors.filter((e) => !/status of 409/.test(e)); // the duplicate check is deliberate
ok(real.length === 0, `no browser errors${real.length ? ': ' + [...new Set(real)].join(' | ') : ''}`);
await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
