# Browser end-to-end checks

Plain Node scripts that drive Chromium against a running stack:
the backend (`remassist-backend`: `docker compose up -d`) and this app
(`npm run build && npm start`, port 3000).

```bash
node tests/e2e/public.mjs   # every public page at 390px and 1280px
node tests/e2e/auth.mjs     # sign-in, invites, resets, roles, sign-out
node tests/e2e/admin.mjs    # every admin page + FAQ/rates/leads/quiz flows
node tests/e2e/crm.mjs      # the CRM screens: add, work, qualify, tasks, import
node tests/e2e/deals.mjs    # deals, conversion, companies, contacts, pipeline settings
node tests/e2e/proposals.mjs # proposals: draft, edit, send, the client's link, accept/decline, revise
node tests/e2e/customers.mjs # customers: won deal → onboarding → active, contract and its files, churn, company lifecycle
node tests/e2e/automation.mjs # lead assignment settings, a website lead arriving assigned with its first-contact task, the digest card (restores the settings)
node tests/e2e/reports.mjs # reports: ranges, funnel, calendar, every table, CSV matches the table; dashboard CRM numbers
node tests/e2e/devices.mjs # signed-in devices: list, sign one out, sign all others out (uses a throwaway account)
node tests/e2e/site-settings.mjs # Site details: edit phone/email/booking link; the public site, /book and the booking window follow; restores the originals
```

They create test data in the database they run against (leads, users,
FAQ items they then remove) — use a dev database, never production.

| Env var | Default |
|---|---|
| `E2E_BASE` | `http://localhost:3000` |
| `E2E_USER` / `E2E_PASS` | a dev admin account (user defaults to `eyob`; the password is required) |
| `E2E_MANAGER_USER` / `E2E_MANAGER_PASS` | optional manager account; `deals.mjs` checks managers can't open CRM settings |
| `E2E_CHROMIUM` | `/usr/bin/chromium` |
| `E2E_PLAYWRIGHT_CORE` | path to a `playwright-core` install, if not in node_modules |
| `E2E_BACKEND_DIR` | `../remassist-backend` (reads the API log for emailed links) |
| `E2E_SHOTS` | `/tmp/remassist-e2e-shots` (screenshots) |

Sign-in is rate limited to 10 attempts a minute per address; running all
of them back to back can hit it. `docker compose restart api` resets it.
