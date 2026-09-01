# Test Admin — UI design prototype

A **static, presentation-only** mockup of the Rem Assist admin dashboard.
Open `index.html` in any browser (double-click it — no build step, no server).

## How to use it

- The **sidebar** lists every section from `MIGRATION-PLAN.md §10`.
- Click any nav item to flip to that screen — the page title, subtitle and
  top-right action button update to match. This is the **only** JavaScript in
  the file; nothing is wired to a backend.

## What's designed (per screen)

| Screen    | Shows |
|-----------|-------|
| Dashboard | 4 stat cards, recent-leads table, "at a glance" rail (counts, shortcuts, system), 14-day lead-volume chart, top sources |
| Leads     | Stage filter pills, source/stage filters, search, CSV export, table with quiz-answers affordance, pagination |
| Posts     | Status filters, draft/published pills, edit / publish / delete row actions |
| FAQ       | Reorder grips, category tags, status pills |
| Team      | Member cards with status dot, service tags |
| Tools     | Reorderable catalog table, category, sort order, active toggles |
| Rates     | Amber "this is the price list" caution, coverage options table, agent-tier hourly pricing |
| Reviews   | Read-only notice, synced review list, "Sync from source" action only |

## Design fidelity

- Brand tokens are **copied from `styles/globals.css`** (navy `#000543`,
  blue `#518de0`, Sora type via Google Fonts, the risk/status palette, radii,
  shadows) and re-declared as CSS variables at the top of the file.
- The sidebar logo is the real `public/images/rem-logo.svg` (staged under
  `assets/`, rendered white on navy).
- Mock data is drawn from the real site: team members, FAQ questions, rates
  from `db/seed.ts`, blog topics, and the tools catalog.

## Scope

- Only files in this folder; nothing in `app/`, `components/`, `styles/` or
  `package.json` is touched.
- No backend, auth, CRUD or state — this file is a UI reference for
  implementing the real `/admin` routes (Phase 04 of `MIGRATION-PLAN.md`).