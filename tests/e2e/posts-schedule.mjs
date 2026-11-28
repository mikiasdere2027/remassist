// Scheduled publishing in the editor (quick): a finished post can be scheduled (a past time is
// refused), the list shows it as Scheduled, the schedule can be cancelled, and "Publish now" clears it.
// (The job that publishes at the scheduled time is covered by the backend tests.) Cleans up after itself.
import { BASE, checks, hydrated, launch, signIn } from './lib.mjs';

const c = checks();
const stamp = Date.now().toString(36);
const browser = await launch();
const p = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
await signIn(p);

const api = (method, path, body) => p.evaluate(async ([m, u, b]) => {
  const r = await fetch(`/api/v1${u}`, { method: m, headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}, [method, path, body]);
const post = (slug, over = {}) => api('POST', '/admin/posts', {
  title: `Schedule test ${slug}`, slug, excerpt: 'A line for the card.', body: '<p>Written to test scheduling.</p>',
  date: '2026-11-28', readTime: '1 min read', category: 'Hiring Strategy',
  image: 'https://res.cloudinary.com/demo/image/upload/v1/posts/a.jpg', authorName: 'Johnathan Zemene', authorAvatar: '/images/teams/Johnathan.jpg', ...over,
}).then((r) => r.body);
const localInput = (offsetMs) => p.evaluate((o) => { const d = new Date(Date.now() + o); const pad = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }, offsetMs);
async function openEditor(id) {
  await p.goto(`${BASE}/admin/content/posts/${id}`, { waitUntil: 'networkidle' });
  await p.locator('h1').first().waitFor();
  await hydrated(p, 'form');
}
const created = [];

try {
  const ready = await post(`sched-ready-${stamp}`);
  created.push(ready.id);
  await openEditor(ready.id);
  await p.click('button:has-text("Schedule…")');
  const confirm = p.locator('button:text-is("Schedule")');
  c.ok(await confirm.isDisabled(), 'Schedule waits for a time');
  await p.fill('input[aria-label="Publish at"]', await localInput(-3_600_000));
  c.ok(await confirm.isDisabled(), 'a time in the past is not accepted');
  await p.fill('input[aria-label="Publish at"]', await localInput(2 * 86_400_000));
  await confirm.click();
  await p.locator('button:has-text("Cancel schedule")').waitFor({ timeout: 15000 }).catch(() => {});
  let now = (await api('GET', `/admin/posts/${ready.id}`)).body;
  c.ok(now.publishAt && now.published === false, 'the post is scheduled and still a draft');
  if (!(await p.locator('button:has-text("Cancel schedule")').count())) { await openEditor(ready.id); }
  c.ok((await p.locator('button:has-text("Cancel schedule")').count()) === 1 && (await p.locator('button:has-text("Publish now")').count()) === 1, 'the editor shows the schedule, with Cancel schedule and Publish now');

  await p.goto(`${BASE}/admin/content/posts?status=scheduled`, { waitUntil: 'networkidle' });
  c.ok((await p.locator(`tr:has-text("sched-ready-${stamp}")`).count()) >= 1 && (await p.locator('tr:has-text("Scheduled")').count()) >= 1, 'the Scheduled tab lists it, labelled Scheduled');

  await openEditor(ready.id);
  await p.click('button:has-text("Cancel schedule")');
  await p.locator('button:has-text("Schedule…")').waitFor({ timeout: 15000 }).catch(() => {});
  now = (await api('GET', `/admin/posts/${ready.id}`)).body;
  c.ok(now.publishAt === null, 'cancelling makes it a plain draft again');

  await api('PATCH', `/admin/posts/${ready.id}`, { publishAt: new Date(Date.now() + 3_600_000).toISOString() });
  await openEditor(ready.id);
  await p.click('button:has-text("Publish now")');
  await p.waitForTimeout(2500);
  now = (await api('GET', `/admin/posts/${ready.id}`)).body;
  c.ok(now.published === true && now.publishAt === null, 'Publish now publishes at once and clears the schedule');

  const m = await (await browser.newContext({ viewport: { width: 390, height: 900 }, storageState: await p.context().storageState() })).newPage();
  await m.goto(`${BASE}/admin/content/posts/${ready.id}`, { waitUntil: 'networkidle' });
  const over = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  c.ok(over <= 1, `390px post editor (overflow ${over}px)`);
} finally {
  for (const id of created) {
    await api('PATCH', `/admin/posts/${id}`, { published: false });
    await api('DELETE', `/admin/posts/${id}`);
  }
}
c.ok(errors.length === 0, `no browser errors${errors.length ? ': ' + [...new Set(errors)].join(' | ') : ''}`);
await browser.close();
c.done();
