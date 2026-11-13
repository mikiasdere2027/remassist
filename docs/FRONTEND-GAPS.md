# Frontend gaps — performance, code quality, robustness

Findings from the 2026-11-12 review. ✅ = fixed (batch log at the end). **Fixing these is phase F1, which starts
after the backend port (B2/B3).** Don't take them on during the port; add new
findings here instead. Items marked _(unverified)_ need confirming before work.

**Baseline at review time:** lint ✅, typecheck ✅, tests ✅ (34 files, 815
tests). `next build` failed in the review sandbox because `next/font/google`
couldn't fetch Sora (no network). Route sizes and the static/dynamic output
were **not** measured. Do that first in F1.

---

## A. Must handle *during* the backend port

These are side effects of moving data to the API. They belong in each B2
slice, not F1.

| # | Gap | Evidence | Fix |
|---|---|---|---|
| ✅ A1 | Public pages stop updating after the split | Admin actions call `revalidatePath` in-process (~28 calls in 9 `actions.ts`). Once NestJS does the writes, nothing invalidates `/`, `/pricing`, blog, FAQ or reviews. `/pricing` has no `revalidate` fallback | `fetch` with `next: { tags }` plus a signed `app/api/revalidate` route that the backend calls after each write |
| ✅ A2 | Rich-text sanitising could get lost | `lib/content/sanitize.ts` runs at read time before `dangerouslySetInnerHTML` (`ArticleView.tsx:156,161`, `FaqTabs.tsx:169`, `FaqAccordion.tsx:45`) | Sanitise on write in NestJS **and** keep sanitising in Next until that's verified |
| A3 ✅ | Silent fallbacks can publish wrong prices (pricing now logs loudly; the team loader never swallowed errors — they now reach error.tsx) | `lib/rates/getPublishedTiers.ts` catches failures and returns seed prices; `getTeamMembers` falls back to the seed too | Log/alert when a fallback is used; fail the production build instead of shipping seed data |
| ✅ A4 | Rate limiting is per process | `lib/rate-limit.ts:26` uses an in-memory `Map` | Move it to NestJS (public routes) |
| ✅ A5 | Uploads go to local disk | `lib/uploads/images.ts:85`, 6 MB server-action body limit in `next.config.ts` | Signed Cloudinary uploads; add `res.cloudinary.com` to `images.remotePatterns` |
| ✅ A6 | Admin protection lives only in the layout | No `middleware.ts`; checks are in `(protected)/layout.tsx` plus per-action guards | Add middleware that checks the API session cookie; the backend enforces it anyway |
| ✅ A7 | Other server-side routes to port | `admin/(protected)/leads/export/route.ts` (CSV), `content/posts/preview-body/route.ts`, `admin/signin/code/verify/route.ts`, `app/uploads/[kind]/[file]/route.ts` | Port each one alongside its module |

Full list of files that touch the database: see `docs/ARCHITECTURE.md` §3.

## B. Performance (F1)

| Priority | Gap | Evidence | Fix |
|---|---|---|---|
| ✅ **High** | Interview videos served raw | `public/uploads/Interviews` (Git LFS): ~70.7 / 29.5 / 22.7 / 15.5 / 9.6 MB _(sizes from the LFS pointers, unverified)_. `InterviewRail.tsx:74-79` mounts `<video autoPlay>` on the raw file | Move to Cloudinary video with adaptive streaming and small renditions; poster first |
| ✅ **High** | Hero video | 9.1 MB, 108 s, 640×360 for a 420 px circle (MIGRATION-PLAN §0) | Re-encode plus a poster frame (Cloudinary covers this) |
| ✅ Medium | Admin shares the public root layout | Six Sora weights load in `app/layout.tsx:24`; public chrome is hidden at runtime by `usePathname` in `SiteChrome.tsx:33` | Split into `app/(site)` and `app/admin` route groups with their own layouts; load fewer font weights |
| ✅ Medium | Build depends on Google Fonts at build time | `next/font/google` network failure breaks the build | Self-host the font with `next/font/local` |
| ✅ Medium | Oversized source images | Team headshots 0.4–0.85 MB each; `Agents/Pro.jpg` and `Expert.jpg` ~0.7 MB | Re-export at 2× display size or serve from Cloudinary |
| ✅ Medium | Unused image | `public/images/Agents/Virtual-assitant.jpg` (1.2 MB) isn't referenced anywhere | Delete it |
| Medium | Too much CSS | 662 KB across app, components and styles; `app/admin/admin.module.css` is ~5,000 lines | Split per page/section; remove dead rules |
| Low | Client components | Sampled 28 public `'use client'` files; all need state or effects | No action. Re-check with the bundle analyzer once the build runs |

## C. Code quality (F1)

| Priority | Gap | Evidence | Fix |
|---|---|---|---|
| ✅ **High** | Dead component | `app/blog/[slug]/ArticleBody.tsx` (436 lines) isn't imported anywhere | Delete it |
| Medium | Leftovers from the artboard codemod | 691 inline `style={{}}` on public pages (terms 207, privacy 195); 1,560 `styles['x-y']` lookups in 30 files; blank whitespace blocks (e.g. hr-and-recruiting 88, pricing 49) | Move styles into CSS modules, camelCase the class names (`tools/css-module-classnames.js`), strip the blank blocks. Leave the `/services/*` pages until the CEO decides |
| Medium | Very large files | `admin/(protected)/catalog/page.tsx` is 804 lines | Split into components |
| Medium | Direct DOM access in React | `ArticleChrome.tsx`: 7 `getElementById` calls | Use refs |
| Medium | Hardcoded business data | Rates, Calendly link, contact details and service lists are duplicated (see ARCHITECTURE.md §4) | Handled in B3 (CMS additions) |
| ✅ Low | Stray files committed | `$log` (dev-server log); `Test Admin/` (prototype `index.html`, README, logo) | `git rm` them; add `$log` to `.gitignore` |
| ✅ Low | Stale plan doc | `MIGRATION-PLAN.md` §0 says the admin is "not started" | Mark it as history; point to `docs/ARCHITECTURE.md` |

## D. Robustness, accessibility, SEO, security (F1)

| Priority | Gap | Evidence | Fix |
|---|---|---|---|
| ✅ **High** | No error or loading boundaries | Only `not-found.tsx` exists; no `error.tsx`, `global-error.tsx` or `loading.tsx` | Add `global-error`, plus `error` and `loading` for the admin segment and the data-backed public routes. Needed once data comes over the network |
| ✅ Medium | JSON-LD can break out of its `<script>` | `components/layout/JsonLd.tsx:49` uses raw `JSON.stringify`, and the data includes post titles from the database | Escape `<` as `<` before injecting |
| ✅ Medium | Focus styles removed | `app/blog/page.module.css:22,105` set `outline: none`; no replacement found _(unverified)_ | Add `:focus-visible` styles |
| ✅ Low | `h1` placement (verified 2026-11-13: exactly one per page) | `page.tsx` for home, how-it-works and services has no `h1`; it may be in child components _(unverified)_ | Check there is exactly one `h1` per page |
| Low | No Content-Security-Policy | Next sets nosniff, Referrer-Policy and X-Frame-Options; no CSP. Whether Nginx adds one is unchecked | Add a CSP that allows GTM/GA, Calendly and Cloudinary |
| Low | Sitemap after the split | `app/sitemap.ts` will need blog slugs from the API _(unverified)_ | Fetch from the API at build time or on revalidate |

Fine as they are: robots, sitemap, per-page metadata, admin `noindex`,
JSON-LD coverage, `poweredByHeader: false`, no secrets committed.

---

## Fix log

- **2026-11-13, batch 1 (cleanup):** deleted `ArticleBody.tsx`, the legacy-body
  exemption (`lib/blog/legacy-bodies.ts` — the article's body is stored now),
  `$log`, `Test Admin/`, the unused agent JPG; JSON-LD is escaped via
  `lib/json-script.ts` (tested); MIGRATION-PLAN.md marked as history; verified
  one `h1` per page in a real browser at 390px and 1280px.
- **2026-11-13, batch 2 (robustness):** `app/error.tsx` (keeps header/footer,
  offers retry + book a call), `app/global-error.tsx` (self-contained),
  admin `error.tsx` + `loading.tsx`; pricing fallback now logs; the blog search
  and newsletter inputs show a focus ring (the other 9 `outline: none` rules
  already had replacements). Error page verified in a browser at 390px.
- **2026-11-13, batch 3 (performance):** public routes moved into the
  `app/(site)` route group with their own layout (header, footer, chat,
  booking, analytics, consent, popups, JSON-LD, preconnects); the admin is
  outside it, so `SiteChrome` is gone. The 404 renders its own header/footer.
  Sora is self-hosted from `app/fonts` (one variable woff2, OFL) — no Google
  Fonts request at build or run time. Team headshots resized to 800px and the
  Pro/Expert photos recompressed: 5.8 MB → 0.6 MB. Verified in a browser.
  Still open: interview videos (need Cloudinary), CSS size, CSP.
- **2026-11-13, batch 4 (reuse):** the booking URL now lives only in
  `lib/nav.ts` (`BOOK_URL`) — 32 hardcoded copies in 26 files replaced, and a
  test fails if a new copy appears. Service-directory data and how-it-works
  phases moved from `components/` to `lib/content/`. (`useRail` stays in
  `components/services/` — only the two services rails use it.)
- **2026-11-13, batch 5 (video):** the five interview clips re-encoded
  (H.264 CRF 27, ≤720p, AAC 96k, faststart): 144 MB → 30 MB, same durations
  and audio, no visible difference. `natty-negash.mp4` had its index at the end
  (nothing played until all 29 MB downloaded) — now streams. The home hero uses
  its own 360×360 cut with audio (`/uploads/hero/`, 2.2 MB vs 9.2 MB). Moving
  video to Cloudinary (adaptive streaming) is still worth doing later.
- **2026-11-13, backend connection:** A1 (tag revalidation via
  `/api/revalidate`), A2 (backend sanitises on write; seed fallback cleaned too),
  A4 (rate limits in the backend, per visitor through the proxy), A5
  (Cloudinary uploads), A6 (`middleware.ts`), A7 (all routes ported or deleted)
  done. Admin pages at 390px fixed (nav, dashboard grid, filter pills, team
  toolbar, file inputs).
