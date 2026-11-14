# remassist (frontend) — rules

Next.js app: the public Rem Assist site and the admin UI. The API lives in
`../remassist-backend` (NestJS + Drizzle + PostgreSQL in Docker). Read:

- `docs/ARCHITECTURE.md` — what this app does today, what moves to the API, CMS candidates
- `../remassist-backend/docs/ARCHITECTURE.md` — the system-wide plan and module order
- `docs/FRONTEND-GAPS.md` — known performance/code gaps, fixed in a later phase
- `tests/e2e/README.md` — the browser checks (public, auth, admin, CRM)
- `docs/RESTRUCTURE.md` — shared admin components, the `lib/api` pattern and screens to delete; apply them while rewiring each admin area

## Commands

`npm run dev` · `npm run build` · `npm run lint` (zero warnings allowed) ·
`npm run typecheck` · `npm test`

## Rules

1. **No new direct database access.** Don't add `getDb()` calls, Drizzle
   queries, `app/api` routes or DB-writing server actions. New data needs go
   through the backend API: `apiServer()` (lib/api/server.ts) in server code,
   `api.*` (lib/api/client.ts) in client components — see docs/ARCHITECTURE.md
   §3 "How the frontend calls the API". Existing DB code is migrated slice by
   slice and deleted once its page is rewired.
   Exception: Maya's `app/api/voice/*` routes (Gemini session token and the
   booking calendar) stay in this app; her leads and bookings still go
   through the backend.
2. **All data goes through the backend** (the migration finished 2026-11-13).
   New admin features: backend module + endpoint first, then the page.
3. **Don't hardcode business data.** Rates, contact details, the booking link,
   service lists — read them from the API (or one shared module until the API
   has them). Never add another copy.
4. **The 12 `/services/*` pages stay as they are** until the CEO decides on a
   CMS for them. Content fixes are fine; don't restructure them.
5. **Performance and cleanup work is a later phase (F1).** Don't do large
   opportunistic refactors during the backend port — add the finding to
   `docs/FRONTEND-GAPS.md` instead.
6. **Test in a real browser at 390px wide** and check that images and links
   resolve. A visual diff is not the test (see MIGRATION-PLAN.md §0).
7. Before committing: `npm run lint`, `npm run typecheck` and `npm test` pass.
8. Commit messages: one imperative sentence describing the change, no type
   prefixes (match `git log`).
9. Never commit `.env*` files or secrets.
