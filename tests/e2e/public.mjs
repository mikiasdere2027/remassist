// Every main public page at phone and desktop width: status, console errors,
// failed same-site requests, broken images, sideways overflow, one <h1>.
import { BASE, SHOTS, checks, launch } from './lib.mjs';

const PAGES = [
  '/', '/pricing', '/how-it-works', '/qualify', '/faq', '/reviews', '/blog',
  '/blog/hiring-offshore-without-losing-quality-control', '/services',
  '/services/sales-and-revenue', '/services/managed-it', '/case-studies', '/privacy-policy', '/admin/signin',
];
const c = checks();
const browser = await launch();
for (const width of [390, 1280]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  for (const path of PAGES) {
    const page = await ctx.newPage();
    const problems = [];
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text().slice(0, 140)}`); });
    page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));
    page.on('response', (r) => {
      if (r.url().startsWith(BASE) && r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url().replace(BASE, '')}`);
    });
    let status = 0;
    try {
      status = (await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 }))?.status() ?? 0;
    } catch (e) {
      problems.push(`goto: ${String(e).slice(0, 120)}`);
    }
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== 'lazy').map((i) => i.currentSrc || i.src).slice(0, 3),
      h1: document.querySelectorAll('h1').length,
    }));
    if (info.overflow > 1) problems.push(`horizontal overflow ${info.overflow}px`);
    for (const b of info.broken) problems.push(`broken image ${b}`);
    if (info.h1 !== 1) problems.push(`${info.h1} <h1> elements`);
    await page.screenshot({ path: `${SHOTS}/public-${width}${path.replace(/\//g, '_') || '_home'}.png` });
    c.ok(status === 200 && problems.length === 0, `${width}px ${path} [${status}]${problems.length ? '\n    ' + [...new Set(problems)].join('\n    ') : ''}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
c.done();
