# Browser end-to-end checks

Plain Node scripts that drive Chromium against a running stack:
the backend (`remassist-backend`: `docker compose up -d`) and this app
(`npm run build && npm start`, port 3000).

```bash
node tests/e2e/public.mjs   # every public page at 390px and 1280px
node tests/e2e/auth.mjs     # sign-in, invites, resets, roles, sign-out
node tests/e2e/admin.mjs    # every admin page + FAQ/rates/leads/quiz flows
node tests/e2e/crm.mjs      # the CRM screens: add, work, qualify, tasks, import
```

They create test data in the database they run against (leads, users,
FAQ items they then remove) — use a dev database, never production.

| Env var | Default |
|---|---|
| `E2E_BASE` | `http://localhost:3000` |
| `E2E_USER` / `E2E_PASS` | a dev admin account (user defaults to `eyob`; the password is required) |
| `E2E_CHROMIUM` | `/usr/bin/chromium` |
| `E2E_PLAYWRIGHT_CORE` | path to a `playwright-core` install, if not in node_modules |
| `E2E_BACKEND_DIR` | `../remassist-backend` (reads the API log for emailed links) |
| `E2E_SHOTS` | `/tmp/remassist-e2e-shots` (screenshots) |

Sign-in is rate limited to 10 attempts a minute per address; running all
four back to back can hit it. `docker compose restart api` resets it.
