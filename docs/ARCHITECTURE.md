# Rem Assist frontend — Architecture

The Next.js app: the public marketing site and the admin UI. The system-wide
plan, module order and roadmap live in the backend repo:
`remassist-backend/docs/ARCHITECTURE.md`. This file covers the frontend side.

_Last updated: 2026-11-12_

---

## 1. Where we are vs. where we're going

**Today** this app is full-stack: it renders pages *and* talks to Postgres
directly (Drizzle), runs admin auth (Auth.js), handles uploads to disk, and
receives leads through its own `app/api` routes and server actions.

**Target:** this app becomes a **client of the NestJS API**
(`remassist-backend`, Drizzle + PostgreSQL in Docker, Cloudinary for uploads). It keeps:

- rendering the public site (server components, static where possible)
- the admin UI (forms, tables, editors)
- SEO, analytics, redirects, the loader, widgets

It gives up: `db/`, `auth.ts` + `lib/auth/*`, `app/api/*`, every server
action that writes to the database, and `lib/uploads`.

`MIGRATION-PLAN.md` is the history of the artboard → Next.js port. Its status
table predates the admin build and the backend decision — treat it as history,
not as the current plan.

## 2. Layout

```
app/
  layout.tsx            <html>, font (app/fonts), globals.css, metadata — nothing else
  (site)/               the public site: its layout.tsx adds header, footer, chat,
                        booking, analytics, consent, popups, JSON-LD.
                        /, /pricing, /how-it-works, /qualify, /faq, /reviews,
                        /blog, /blog/[slug], /case-studies, /services/*, legal
  admin/                signin, verify, invite, (protected)/… — outside (site),
                        so it ships none of the marketing chrome
  api/                  leads, quiz, popups, auth   ← moves to the backend
  not-found.tsx, global-error.tsx, sitemap, robots, icons, OG image
components/             home, how-it-works, services, layout, quiz, widgets,
                        popups, loader, analytics
lib/                    content loaders, quiz logic, nav, site config, analytics
db/                     Drizzle schema + migrations   ← moves to the backend
```

## 3. What has to be rewired

Everything that touches the database or the server-side auth today:

| Area | Files | Becomes |
|---|---|---|
| DB client + schema | `db/`, `drizzle.config.ts` | backend `src/database` |
| Admin auth | `auth.ts`, `lib/auth/*`, `app/api/auth`, `app/admin/signin`, `verify`, `invite` | backend `auth` + `users` modules; frontend keeps the screens |
| Lead / quiz intake | `app/api/leads`, `app/api/quiz`, `lib/leads`, `lib/notify.ts` | `POST /v1/public/leads`, `/v1/public/quiz` |
| Public content loaders | `lib/blog/content.ts`, `lib/faq/content.ts`, `lib/reviews/content.ts`, `lib/team/content.ts`, `lib/rates/getPublishedTiers.ts`, `app/api/popups` | `GET /v1/public/*` |
| Admin mutations | every `actions.ts` under `app/admin/(protected)/` and `app/admin/invite` | `/v1/admin/*` |
| Uploads | `lib/uploads`, on-disk `UPLOAD_DIR` | signed Cloudinary uploads via the backend |

### How the frontend calls the API (to build in the first slice)

- One small client in `lib/api/` (typed fetch wrapper; base URL from env).
- **Public pages:** fetch from server components with Next cache tags
  (`next: { tags: ['faq'] }`); the backend calls a revalidation route when
  content changes, so pages stay static and still update.
- **Admin pages:** forward the admin's session cookie to the API; never cache.
- Keep the current graceful fallbacks (e.g. the lead form's `mailto:` when the
  API is down).

## 4. Hardcoded content that should come from the CMS

From the 2026-11-12 review. Order roughly by value:

1. **Rates everywhere** — `lib/quiz/quiz.ts:140`, `components/home/TiersSection.tsx`,
   copy in `/services/virtual-back-office-team`, `/case-studies`, `/qualify`.
   The DB rate tables exist but only `/pricing` and `SeatTiers` read them.
2. **Site settings** — phone, email, Calendly link, socials (`lib/chat/kb.ts`
   `CONTACT`, `lib/nav.ts`, the Calendly URL copied into ~10 components).
3. **Service directory** — `components/services/directory.tsx`,
   `components/home/ServiceGrid.tsx`, `lib/services.ts`, `lib/nav.ts`.
4. **Ask widget knowledge base** — `lib/chat/kb.ts` (71 entries).
5. **Quiz copy** (questions/options/help) — scoring stays in code.
6. **Interview clips** — `lib/interviews.ts` + files in `public/uploads`.
7. **Trust bar / partners / tech ticker** — review count should come from reviews.
8. **Homepage + how-it-works copy** — fixed-slot editors, layout stays in code.
9. **Case studies** — new content type.
10. **Legal pages** — low priority.

**On hold:** the 12 `/services/*` pages — waiting on the CEO.

## 5. Phases (frontend view)

1. **B2 — admin parity:** rewire each admin page to the API as its backend
   module lands; fix bugs found along the way; delete the old server code.
2. **B3 — CMS additions:** the list in §4.
3. **F1 — frontend hardening:** performance, code quality, accessibility —
   tracked in [`FRONTEND-GAPS.md`](FRONTEND-GAPS.md). Not started until the
   backend work is done.
