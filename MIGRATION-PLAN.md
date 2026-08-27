# Migration Plan — Static Artboards to Self-Hosted Next.js + Postgres

**Target:** move the 25-page marketing site off the browser-compiled Claude Design runtime onto a
server-rendered Next.js application with a Postgres content and lead store, running on the
Hostinger VPS behind Nginx, and promote it to production at `remassistance.com`.

| | |
|---|---|
| **Runtime host** | Hostinger VPS, self-managed (Nginx + systemd + Node 22 LTS) |
| **Database** | Postgres 16 on the same VPS, bound to localhost |
| **Data access** | Drizzle ORM + `node-postgres` (TCP pool) |
| **Styling** | Tailwind CSS v4, brand tokens as `@theme` variables |
| **Scope** | Lead capture + editable content (blog, FAQ, team, tools, rates) |
| **Artboards** | Retired — Next.js becomes the source of truth |
| **Domain** | Replaces `remassistance.com`, retiring the separate codebase there |
| **Estimate** | 34–52 focused engineering days (~7–11 weeks, one developer) |

> **Status:** in progress, not a planning document any more. Day counts below were planning
> inputs, not commitments. See [§0 Where this actually stands](#0-where-this-actually-stands)
> for current state and the open decisions.

---

## 0. Where this actually stands

Updated 2026-08-27. The plan's phase order was not followed exactly — Phase 05 was done before
Phase 03, and Phase 01 had to be reopened.

| Phase | State | Notes |
|---|---|---|
| **00** Groundwork | done | Next.js scaffold, tokens, header/footer, CI |
| **01** Static port | **done (reopened)** | Shipped "complete" but 20 of 22 routes rendered unstyled and all 118 images 404'd — see below |
| **02** Interactive | done | Home sections, hero, quiz, widgets, blog-article chrome |
| **03** Database | **server side done** | Schema, migration, `POST /api/leads`, `POST /api/quiz`. **Migration not yet run** — needs a `DATABASE_URL` |
| **04** Admin | not started | Depends on 03 |
| **05** SEO + redirects | done | Metadata, canonicals, OG, sitemap, robots, JSON-LD, 11 × 301, `/blog/[slug]` |
| **06** Cutover | not started | Needs VPS access |

### What Phase 01 got wrong

Its exit criterion was "all render server-side; visual diffs clean". A visual diff would have
passed, because the artboards carry the same defects. The real state was:

- **20 of 22 routes rendered completely unstyled.** The codemod emitted `className='pr-wrap'`
  string literals while the CSS went into a *Module* with hashed selectors. Root cause: the
  attribute branch tested for `'className'`, but the parser yields `'class'`.
- **All 118 image references 404'd.** `rewriteAssetPath` mapped `assets/images/x` to `/x`
  instead of `/images/x`.
- **Every nav link 404'd.** The header and footer still pointed at `.dc.html` artboards — 28
  dead links on every page.
- **Mobile was unusable.** Fixed-column grids, a nav that never collapsed, a 260px sidebar
  leaving a 26px prose column. All inherited from the artboards, all invisible in a diff.

The lesson for anything still to be ported: **a diff against the artboard is not the test.**
Check a real browser at 390px, and check that images and links resolve.

### Open decisions — these need a human, not more engineering

1. ~~**Where does the lead form live?**~~ **Decided 2026-08-27: the quiz result screen.** That is
   the highest-intent moment on the site — the visitor has just been shown a price — and
   `/api/leads` already accepts the quiz payload, so the lead arrives with the exact estimate
   attached. Live on `/qualify` and the home fit finder, with the §9.2 `mailto:` fallback.
   The Ask widget still has no capture; its legacy lead flow was dropped in Phase 02 and adding
   it back is a separate, smaller job.
2. **Run the migration.** `npm run db:migrate` then `npm run db:seed`, with real credentials.
   Postgres 18 is installed locally but needs a password. See `.env.example`.
3. **Mobile navigation.** The header currently scrolls sideways inside itself — containment,
   not a design. A hamburger + drawer is the expected pattern but is a design decision.
4. **The hero video.** 9.1 MB, 108 seconds, 640×360, for a 420px circle. Autoplay is now
   skipped for reduced-motion and Save-Data visitors, but it is still ~18× the rest of the page
   for everyone else. Needs a re-encode and ideally a poster frame.
5. **`/careers`.** The only legacy WordPress page with real content and no equivalent. Currently
   left to 404 rather than redirected somewhere irrelevant. Rebuild, point at a job board, or
   accept the 404? `/job-form` follows whatever it does.

### Measured state

- Home page, production: **510 KB / 39 requests** (was 1,729 KB / 78 before the prefetch and
  image work). Other routes 457–482 KB, mostly the shared JS baseline.
- 460 tests, 0 lint errors, build 28/28 static pages.
- Only remaining WCAG AA contrast failures are the `#518de0` pair, which is a known and
  accepted brand trade-off — `--blue-700` already passes at 4.84 if it is ever revisited.

---

## Table of contents

0. [Where this actually stands](#0-where-this-actually-stands)
1. [Why migrate](#1-why-migrate)
2. [Target architecture](#2-target-architecture)
3. [Prerequisites and open decisions](#3-prerequisites-and-open-decisions)
4. [Server setup](#4-server-setup)
5. [Application scaffold](#5-application-scaffold)
6. [Database](#6-database)
7. [Porting the pages](#7-porting-the-pages)
8. [De-duplicating the quiz](#8-de-duplicating-the-quiz)
9. [Lead capture](#9-lead-capture)
10. [Admin](#10-admin)
11. [SEO and redirects](#11-seo-and-redirects)
12. [Deployment pipeline](#12-deployment-pipeline)
13. [Testing and verification](#13-testing-and-verification)
14. [Cutover runbook](#14-cutover-runbook)
15. [Decommission](#15-decommission)
16. [Phase summary and effort](#16-phase-summary-and-effort)
17. [Risk register](#17-risk-register)

---

## 1. Why migrate

Four measured problems. All figures are from the repository as it stands, not estimates.

### 1.1 The site is compiled in the visitor's browser

Every page loads `support.js`, which is a client-side React runtime. At runtime it fetches three
scripts from `unpkg.com`:

```
https://unpkg.com/react@18.3.1/umd/react.production.min.js
https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js
https://unpkg.com/@babel/standalone@7.29.0/babel.min.js
```

It then parses the `<x-dc>` document and renders it client-side via `React.createElement`. Nothing
meaningful exists in the served HTML until all three land and an in-browser transpiler runs.

Consequences:

- **Crawlers and social unfurlers see an empty shell.**
- First paint depends on a third-party CDN the business does not control.
- A full `@babel/standalone` transpiler is shipped to every visitor to do work that belongs in a
  build step.

Server rendering is the single largest win of this migration.

### 1.2 SEO is effectively absent

| Metric | Current |
|---|---|
| Pages with a `<title>` | **2 of 25** (`Managed IT.dc.html`, the logo loader) |
| Pages with `meta description` | **1** |
| Pages with `og:` tags | **0** |
| Pages with `rel=canonical` | **0** |
| `sitemap.xml` / `robots.txt` | **Neither exists** |

This is a direct consequence of §1.1 — the DC `<helmet>` block sets metadata at runtime, which is
too late for most crawlers.

### 1.3 The pricing quiz is implemented twice

The five-question qualifier exists in two places:

| Location | Form |
|---|---|
| `Qualify.dc.html:756` | `var QUIZ = [...]` — vanilla JS |
| `index.html:1552` | `quiz = [...]` inside the `DCLogic` class |

The scoring arithmetic is duplicated too — `SERVICE`, `SEATS`, `HOURS` maps and the `$8 / $9 / $11`
hourly rates — under a comment in `Qualify.dc.html` that reads:

```js
/* identical arithmetic to the home page */
```

Two hand-synced copies of a price list will diverge. This is the clearest thing the database fixes.

### 1.4 Lead capture goes nowhere, and the blog is a facade

- `assets/ask-remassist.js:31` — `var LEAD_ENDPOINT = '';`. Empty, so the contact form falls back to
  composing a `mailto:`. The POST path is already written and sends the correct shape.
- A completed Qualify quiz is discarded when the tab closes. Nothing is persisted.
- `Blog.dc.html` advertises four articles; **all four cards link to the same `Blog Post.dc.html`**.
  Five cover illustrations sit in `assets/images/blog/` for articles that have no pages.

### 1.5 What makes this tractable

| Metric | Count |
|---|---|
| Pages | 25 (~19,900 lines of HTML) |
| Pages with real templating | **1** (`index.html`: 23 `sc-for`/`sc-if`, 77 bindings) |
| Inline `style=` attributes | 2,117 |
| `style-hover=` attributes | 492 |
| Page-level CSS classes | 1,039 |
| Design tokens to carry over | 121 |
| Backend routes today | 0 |

Only `index.html` has meaningful data-binding. The other 24 pages are static markup with inline
styles, which makes the bulk of the port **mechanical and codemoddable** rather than a rewrite.

---

## 2. Target architecture

```
                    Internet
                       │
                    :443 │ TLS (Let's Encrypt, certbot)
                       ▼
            ┌──────────────────────┐
            │        Nginx         │  reverse proxy
            │  - TLS termination   │  brotli/gzip
            │  - static caching    │  /_next/static → immutable, 1y
            └──────────┬───────────┘
                       │ proxy_pass 127.0.0.1:3000
                       ▼
            ┌──────────────────────┐
            │  Next.js 15          │  systemd service (single instance)
            │  output: standalone  │  node server.js
            │  App Router + RSC    │  ISR cache on persistent volume
            └──────────┬───────────┘
                       │ TCP, localhost only
                       ▼
            ┌──────────────────────┐
            │   Postgres 16        │  listen_addresses = 'localhost'
            │   nightly pg_dump    │  ufw blocks 5432 externally
            └──────────────────────┘
```

### 2.1 Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15, App Router, React 19, TypeScript | Server components render marketing pages to HTML — the fix for §1.1 and §1.2. The DC runtime is already React underneath, so the mental model carries over. |
| Build output | `output: 'standalone'` | Produces a self-contained `server.js` with only the needed `node_modules`. Correct target for VPS deployment. |
| Process manager | **systemd** | Already on the box, handles restart-on-failure, journald logging and boot ordering. No extra dependency. |
| Reverse proxy | Nginx | TLS, compression, and long-lived caching of `/_next/static`. Keeps Node off port 443. |
| Styling | Tailwind CSS v4 | The 121 tokens become `@theme` variables; the 492 `style-hover` attributes become `hover:` variants. Replaces the runtime stylesheet synthesis `support.js` performs. |
| Database | Postgres 16, same VPS | Lowest latency (no network hop), no egress cost, no vendor. Backups and upgrades become our responsibility — see §4.6. |
| Data access | Drizzle ORM + `node-postgres` | SQL-first and type-safe. A **normal TCP pool** is correct behind a long-lived process; the serverless HTTP driver buys nothing here and adds per-query overhead. |
| Admin auth | Auth.js v5 (`next-auth@beta`) | Email-link sign-in with a domain allowlist. Sized for ~9 internal editors, no public accounts. See §3.2. |
| Scheduling | Calendly, unchanged | Already works. A webhook can later mirror booked meetings into `leads` for attribution. |

### 2.2 Three self-hosting details that bite

These cause avoidable production incidents, so they are called out rather than discovered.

**Run a single Node instance — not PM2 cluster mode.** Self-hosted ISR writes its cache to local
disk *per process*. With N clustered workers you get N independently-stale copies of every page, and
revalidation in one worker is invisible to the others. One process is ample for a marketing site.
If you genuinely outgrow it, the answer is a shared `cacheHandler` (Redis), not more workers.

**`output: 'standalone'` does not copy everything.** The build emits `.next/standalone`, but
`public/` and `.next/static` must be copied in manually or you ship a site with no images and no
CSS. This is scripted in §12.

**ISR cache lives inside the release directory.** Deploying to a fresh directory therefore starts
with a cold cache. Symlink it to a persistent path (§12.3) so a deploy does not cause a latency
spike on every page.

Additionally: install **`sharp`** or `next/image` optimization silently degrades to unoptimized
output.

---

## 3. Prerequisites and open decisions

### 3.1 Blocking prerequisite

Because this migration **replaces a live, indexed production site**, the 301 redirect map must
preserve **`remassistance.com`'s** URLs — *not* the 25 `.dc.html` filenames in this repository. That
site is a separate codebase and has not been audited. Its URL inventory cannot be invented.

**Required inputs before Phase 01 can size the port:**

- [ ] `remassistance.com/sitemap.xml`, **or** a Google Search Console "Pages" export, **or** Nginx
      access logs covering the top few hundred paths by request volume
- [ ] What stack currently serves `remassistance.com`, and on which host
- [ ] Where DNS is managed, and where TLS currently terminates
- [ ] Current DNS TTL on the apex and `www` records (needed to plan the cutover window in §14)
- [ ] Whether any inbound campaign URLs or QR codes point at paths that must not move

Until these exist, treat Phase 05's redirect work as unsized.

### 3.2 Open decisions

| Decision | Options | Needed by |
|---|---|---|
| Admin authentication | Auth.js v5 email link + domain allowlist **vs** Google Workspace SSO (less to maintain if Workspace is already in use) | Phase 04 |
| Blog body format | Plain Markdown (cheap) **vs** MDX (rich embeds, but the admin needs a component-aware preview) | Phase 04 — it shapes the editor |
| Calendly webhook | Mirror booked meetings into `leads` for attribution, or leave scheduling data in Calendly | Phase 03 |
| Orphan pages | `Case Studies.dc.html` is an intentional "coming soon"; `Home v1.dc.html` and `RemAssist Logo Icon Web-loader.html` are superseded drafts. Port, or drop? | Phase 01 page count |

---

## 4. Server setup

Assumes Ubuntu 24.04 LTS on the Hostinger VPS. Adjust package versions if the image differs.

### 4.1 Base hardening

```bash
# As root, first login
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# /etc/ssh/sshd_config
#   PermitRootLogin no
#   PasswordAuthentication no
systemctl reload ssh

apt update && apt upgrade -y
apt install -y unattended-upgrades fail2ban
dpkg-reconfigure --priority=low unattended-upgrades
```

Firewall — Postgres is deliberately **not** opened:

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 4.2 Node 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # expect v22.x
```

### 4.3 Postgres 16

```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql <<'SQL'
CREATE ROLE remassist WITH LOGIN PASSWORD 'CHANGE_ME_STRONG';
CREATE DATABASE remassist OWNER remassist;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO remassist;
SQL
```

Confirm it is not listening publicly — `/etc/postgresql/16/main/postgresql.conf`:

```conf
listen_addresses = 'localhost'
```

```bash
sudo systemctl restart postgresql
ss -lntp | grep 5432        # must show 127.0.0.1 only
```

Modest tuning for a small VPS (adjust to actual RAM):

```conf
shared_buffers = 512MB          # ~25% of RAM
effective_cache_size = 1536MB   # ~75% of RAM
work_mem = 16MB
maintenance_work_mem = 128MB
```

### 4.4 systemd service

`/etc/systemd/system/remassist.service`:

```ini
[Unit]
Description=Rem Assist Next.js
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/srv/remassist/current
EnvironmentFile=/srv/remassist/shared/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=remassist

# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only
ReadWritePaths=/srv/remassist/shared

[Install]
WantedBy=multi-user.target
```

The env file holds secrets and must not be readable by other users:

```bash
sudo install -d -o deploy -g deploy -m 750 /srv/remassist/shared
sudo -u deploy tee /srv/remassist/shared/.env >/dev/null <<'ENV'
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
DATABASE_URL=postgres://remassist:CHANGE_ME_STRONG@localhost:5432/remassist
AUTH_SECRET=CHANGE_ME_OPENSSL_RAND_BASE64_32
AUTH_URL=https://remassistance.com
ENV
sudo chmod 600 /srv/remassist/shared/.env
```

### 4.5 Nginx

`/etc/nginx/sites-available/remassist`:

```nginx
upstream remassist_app {
  server 127.0.0.1:3000;
  keepalive 32;
}

server {
  listen 80;
  server_name remassistance.com www.remassistance.com;
  return 301 https://remassistance.com$request_uri;
}

server {
  listen 443 ssl http2;
  server_name www.remassistance.com;
  # certbot fills in ssl_certificate directives here
  return 301 https://remassistance.com$request_uri;
}

server {
  listen 443 ssl http2;
  server_name remassistance.com;

  # certbot fills in ssl_certificate / ssl_certificate_key here

  gzip on;
  gzip_types text/plain text/css application/json application/javascript
             image/svg+xml application/xml;
  gzip_min_length 1024;

  client_max_body_size 12M;   # admin image uploads

  # Immutable build assets — safe to cache hard, filenames are hashed
  location /_next/static/ {
    proxy_pass http://remassist_app;
    proxy_cache_valid 200 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  location /_next/image {
    proxy_pass http://remassist_app;
    add_header Cache-Control "public, max-age=86400";
  }

  location / {
    proxy_pass http://remassist_app;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/remassist /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d remassistance.com -d www.remassistance.com
sudo certbot renew --dry-run     # actually verify renewal works
```

> `X-Forwarded-Proto` matters: without it Auth.js builds `http://` callback URLs behind the proxy and
> sign-in silently breaks.

### 4.6 Backups

VPS snapshots are **not** a logical backup — they cannot restore a single dropped table, and they
are useless if corruption predates the snapshot. Take real dumps.

`/srv/remassist/shared/backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M%S)
DEST=/srv/backups
mkdir -p "$DEST"
pg_dump --format=custom --no-owner --dbname=remassist \
  --file="$DEST/remassist-$STAMP.dump"
# Retain 14 local dailies
find "$DEST" -name 'remassist-*.dump' -mtime +14 -delete
# Offsite — configure an rclone remote first
rclone copy "$DEST/remassist-$STAMP.dump" remote:remassist-backups/
```

```bash
chmod 750 /srv/remassist/shared/backup.sh
sudo -u deploy crontab -e
# 0 3 * * *  /srv/remassist/shared/backup.sh >> /srv/backups/backup.log 2>&1
```

**Rehearse one restore before cutover.** An untested backup is a hypothesis.

```bash
createdb remassist_restore_test
pg_restore --dbname=remassist_restore_test --no-owner /srv/backups/remassist-YYYY....dump
psql -d remassist_restore_test -c 'SELECT count(*) FROM leads;'
dropdb remassist_restore_test
```

---

## 5. Application scaffold

### 5.1 Directory layout

```
app/
  (marketing)/
    page.tsx                    # home — was index.html
    how-it-works/page.tsx
    pricing/page.tsx
    qualify/page.tsx
    faq/page.tsx
    reviews/page.tsx
    blog/page.tsx
    blog/[slug]/page.tsx        # fixes the 4-cards-one-page problem
    services/[slug]/page.tsx    # or discrete dirs — see §7.3
    privacy-policy/page.tsx
    terms-of-service/page.tsx
  admin/
    layout.tsx                  # auth gate
    leads/page.tsx
    posts/…  faq/…  team/…  rates/…
  api/
    leads/route.ts
    quiz/route.ts
  layout.tsx                    # header + footer live here
  sitemap.ts
  robots.ts
components/
  layout/{Header,Footer}.tsx    # replaces partials/ + sync-partials.js
  home/{Hero,TeamRail,FaqAccordion,ToolTicker,HeroVideo}.tsx
  quiz/{QuizFlow,QuizResult}.tsx
  widgets/{BookingModal,AskRemAssist}.tsx
lib/
  quiz/{schema.ts,score.ts}     # THE single quiz implementation
db/
  index.ts  schema/  migrations/  seed.ts
styles/
  globals.css                   # @theme with the 121 brand tokens
```

### 5.2 `next.config.ts`

```ts
import type { NextConfig } from 'next';
import { redirects } from './lib/redirects';

const config: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: false,          // Nginx handles compression
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    return redirects;       // see §11.3
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      ],
    }];
  },
};

export default config;
```

> `X-Frame-Options: SAMEORIGIN` is safe here, but the Calendly modal embeds *their* iframe in our
> page — that direction is unaffected. Verify the booking modal after enabling.

### 5.3 Brand tokens and fonts

`support.js` currently synthesizes hover CSS at runtime. Tailwind v4's CSS-first config replaces
that. Port the 121 variables from `assets/colors_and_type.css` verbatim so ported markup that still
references `var(--ink-900)` keeps working during the transition.

`styles/globals.css`:

```css
@import "tailwindcss";

@theme {
  /* Brand — from assets/colors_and_type.css */
  --color-navy-800: #000543;   /* primary brand navy */
  --color-blue-600: #518de0;   /* primary brand blue / CTA */
  --color-blue-700: #326dda;
  --color-blue-300: #34bdf0;
  --color-ink-900:  #000543;
  --color-ink-600:  #667180;
  --color-ink-100:  #f5f7fa;
  /* …remaining tokens… */

  --font-sans: var(--font-sora), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-sora), ui-sans-serif, system-ui, sans-serif;
}
```

Sora is currently loaded via `@import url(fonts.googleapis.com…)`, which is render-blocking. Move it
to `next/font` so it is self-hosted and preloaded:

```ts
// app/layout.tsx
import { Sora } from 'next/font/google';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
});
```

> **Note:** the brand system aliases `--font-mono` to Sora, which is not a monospace. If any UI
> needs real tabular figures (the admin leads table, the pricing calculator), add a genuine mono
> face rather than inheriting that alias.

### 5.4 Retiring `sync-partials.js`

`partials/header.html` and `partials/footer.html` are currently *stamped* into all 25 pages by
`tools/sync-partials.js`, because the DC engine has no include mechanism. A React root layout is
exactly what that script was emulating.

Port both partials to `components/layout/Header.tsx` and `Footer.tsx`, render them in
`app/layout.tsx`, and **delete `tools/sync-partials.js`**. One consequence worth noting: the footer
"Terms of Service" link was recently repointed at the local page — carry that over rather than
reintroducing the external link.

---

## 6. Database

### 6.1 Client and config

```ts
// db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                      // single Node instance; Postgres default is 100
  idleTimeoutMillis: 30_000,
});

export const db = drizzle(pool, { schema });
```

```ts
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
```

Because Postgres is local there is only **one** connection string — no pooled/unpooled split is
needed, which is a genuine simplification over the managed-database design.

### 6.2 Capture schema

```ts
// db/schema/leads.ts
import {
  pgTable, pgEnum, uuid, text, timestamp, jsonb, boolean, integer, index,
} from 'drizzle-orm/pg-core';

export const leadSource = pgEnum('lead_source', [
  'qualify_quiz', 'ask_widget', 'contact_form', 'pricing_cta',
]);

export const leadStatus = pgEnum('lead_status', [
  'new', 'contacted', 'qualified', 'won', 'lost', 'spam',
]);

export const leads = pgTable('leads', {
  id:        uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  name:      text('name'),
  email:     text('email').notNull(),
  phone:     text('phone'),
  company:   text('company'),
  message:   text('message'),
  source:    leadSource('source').notNull(),
  status:    leadStatus('status').notNull().default('new'),
  pageUrl:   text('page_url'),        // ask-remassist.js already sends location.href
  referrer:  text('referrer'),
  utm:       jsonb('utm').$type<Record<string, string>>(),
}, (t) => [
  index('leads_created_idx').on(t.createdAt.desc()),
  index('leads_email_idx').on(t.email),
  index('leads_status_idx').on(t.status),
]);

export const quizSubmissions = pgTable('quiz_submissions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  leadId:    uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  answers:   jsonb('answers').$type<QuizAnswers>().notNull(),
  result:    jsonb('result').$type<QuizResult>().notNull(),
  completed: boolean('completed').notNull().default(false),
}, (t) => [
  index('quiz_created_idx').on(t.createdAt.desc()),
]);
```

Two deliberate choices:

- **`leadId` is nullable.** The quiz is answered *before* the email is requested, so a partial
  funnel still produces an analysable row. Writing it only on email capture would discard the most
  interesting drop-off data.
- **`result` is a frozen snapshot, not recomputed on read.** When rates change, a historical quote
  must still show what that prospect was actually told. Recomputing would silently rewrite history.

### 6.3 Rate tables — the fix for §1.3

These three tables are the single source of truth for the home hero, the Qualify page **and** the
pricing page. A rate change becomes one `UPDATE` instead of an edit in two hand-synced JS arrays.

```ts
// db/schema/rates.ts
export const coverageOptions = pgTable('coverage_options', {
  key:          text('key').primaryKey(),           // pt | ft | shift | always
  label:        text('label').notNull(),
  longLabel:    text('long_label').notNull(),
  seats:        integer('seats').notNull(),          // 1 | 1 | 2 | 4
  monthlyHours: integer('monthly_hours').notNull(),  // 80 | 160 | 320 | 640
  sortOrder:    integer('sort_order').notNull(),
});

export const agentTiers = pgTable('agent_tiers', {
  key:           text('key').primaryKey(),          // pro | mid | expert
  label:         text('label').notNull(),
  hourlyRateUsd: numeric('hourly_rate_usd', { precision: 6, scale: 2 }).notNull(),
  sortOrder:     integer('sort_order').notNull(),
});

export const serviceCategories = pgTable('service_categories', {
  key:       text('key').primaryKey(),              // back | gtm | sdr | mixed
  name:      text('name').notNull(),
  slug:      text('slug').notNull().unique(),
  navBlurb:  text('nav_blurb'),
  sortOrder: integer('sort_order').notNull(),
});
```

`hourlyRateUsd` is `numeric`, not `integer`. Today's rates are whole dollars, but a schema that
cannot express `$8.50` needs a migration the first time pricing gets nuanced.

### 6.4 Content schema

```ts
export const publishStatus = pgEnum('publish_status', ['draft', 'published']);

export const teamMembers = pgTable('team_members', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull(),
  initials:  text('initials').notNull(),
  role:      text('role').notNull(),
  photoUrl:  text('photo_url'),
  linkedin:  text('linkedin_url'),
  blurb:     text('blurb'),
  sortOrder: integer('sort_order').notNull().default(0),
  status:    publishStatus('status').notNull().default('published'),
});

export const blogPosts = pgTable('blog_posts', {
  id:             uuid('id').primaryKey().defaultRandom(),
  slug:           text('slug').notNull().unique(),
  title:          text('title').notNull(),
  excerpt:        text('excerpt'),
  body:           text('body').notNull(),           // Markdown or MDX — see §3.2
  coverImage:     text('cover_image'),
  authorId:       uuid('author_id').references(() => teamMembers.id, { onDelete: 'set null' }),
  status:         publishStatus('status').notNull().default('draft'),
  publishedAt:    timestamp('published_at', { withTimezone: true }),
  seoTitle:       text('seo_title'),
  seoDescription: text('seo_description'),
  readingMinutes: integer('reading_minutes'),
}, (t) => [index('posts_published_idx').on(t.status, t.publishedAt.desc())]);

export const faqItems = pgTable('faq_items', {
  id:        uuid('id').primaryKey().defaultRandom(),
  question:  text('question').notNull(),
  answer:    text('answer').notNull(),
  category:  text('category'),
  sortOrder: integer('sort_order').notNull().default(0),
  status:    publishStatus('status').notNull().default('published'),
});

export const tools = pgTable('tools', {                // the hero ticker
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull(),
  domain:    text('domain').notNull(),
  logoUrl:   text('logo_url'),
  sortOrder: integer('sort_order').notNull().default(0),
});
```

### 6.5 Reviews — read-only by design

```ts
export const reviews = pgTable('reviews', {
  id:          uuid('id').primaryKey().defaultRandom(),
  authorName:  text('author_name').notNull(),
  rating:      integer('rating').notNull(),
  body:        text('body').notNull(),
  sourceUrl:   text('source_url').notNull(),      // the live Trustpilot review
  publishedAt: timestamp('published_at', { withTimezone: true }),
  mirroredAt:  timestamp('mirrored_at', { withTimezone: true }).notNull().defaultNow(),
});
```

> **Constraint.** The testimonials on `Reviews.dc.html` are **real Trustpilot reviews reproduced
> verbatim** — the page says so, links to the live profile, and notes that two are currently live.
> Putting them behind a general-purpose CMS editor creates a path to publishing a testimonial nobody
> wrote.
>
> Therefore: **`reviews` gets no create or update form in the admin.** It is populated only by a sync
> task against the Trustpilot profile, `sourceUrl` is mandatory, the page keeps linking out so any
> visitor can verify, and aggregate ratings render from mirrored rows — never from a hand-set number.

### 6.6 Migrations and seed

```bash
npx drizzle-kit generate      # author migration SQL from schema diff
npx drizzle-kit migrate       # apply — run as an explicit deploy step, never at request time
```

The seed script (`db/seed.ts`) lifts today's hardcoded content into Postgres. This is a migration of
**real data** and needs review, not just execution:

| Source | Rows |
|---|---|
| `index.html` → `teamMembers` array | 9 team members |
| `index.html` → `tickerItems` array | 22 tools |
| `FAQ.dc.html` → `<summary>` / answer pairs | 29 FAQ items |
| `Blog.dc.html` card titles + `assets/images/blog/*.svg` | 4 posts (bodies need writing — only one exists) |
| `Qualify.dc.html` → `SEATS`, `HOURS`, `HOURS_LABEL` | 4 coverage options |
| `Qualify.dc.html` → rate literals `8` / `9` / `11` | 3 agent tiers |
| `Qualify.dc.html` → `SERVICE` map | 4 service categories |

Make the seed **idempotent** (upsert on natural key) so it can be re-run against staging safely.

---

## 7. Porting the pages

### 7.1 Codemod first

Do not hand-convert 2,117 inline styles. Write a one-off codemod (`tools/codemod/`) using
`node-html-parser` or `parse5` that handles:

| Input | Output |
|---|---|
| `class="x"` | `className="x"` |
| `style="a:1;b:2"` | `style={{ a: 1, b: 2 }}` with camelCased properties |
| `style-hover="color:#fff"` | a `hover:` Tailwind class, or a CSS Module `:hover` rule |
| `onClick="{{ fn }}"` | `onClick={fn}` |
| `<sc-for list="{{ xs }}" as="x">` | `{xs.map((x) => …)}` |
| `<sc-if value="{{ v }}">` | `{v && (…)}` |
| `ref="{{ r }}"` | `ref={r}` |
| Self-closing voids, `&mdash;` entities | JSX-valid equivalents |

The codemod only has to be good enough to leave a short manual pass per page. **Validate it on
`Privacy Policy.dc.html` and `Terms of Service.dc.html` first** — they are the longest purely-static
pages (67 KB and 88 KB), so they exercise the style conversion hard without any templating risk.

**Decision gate:** if the codemod is not clearly saving time by the third page, abandon it and fall
back to CSS Modules with a much smaller diff. Do not sink a week into tooling.

### 7.2 Port order

Ascending risk, so the codemod is proven before it touches anything interactive:

1. `Privacy Policy`, `Terms of Service` — long, static, zero templating
2. `FAQ`, `Reviews`, `How it Works`, `Pricing`, `Blog`, `Case Studies` — static, some become DB-driven
3. The twelve service pages — near-identical structure, so highly repetitive once one is done
4. `Qualify` — first page with real logic
5. `index.html` — the only page with substantial templating; do it last (§7.4)

### 7.3 Route mapping (this repo)

Slugs are proposals. **This table is *not* the redirect map** — that must be derived from
`remassistance.com`'s live URLs per §3.1. This table governs the new app's internal structure.

| Current file | New route |
|---|---|
| `index.html` | `/` |
| `How it Works.dc.html` | `/how-it-works` |
| `Pricing.dc.html` | `/pricing` |
| `Qualify.dc.html` | `/qualify` |
| `FAQ.dc.html` | `/faq` |
| `Reviews.dc.html` | `/reviews` |
| `Blog.dc.html` | `/blog` |
| `Blog Post.dc.html` | `/blog/[slug]` — 4 real posts |
| `Case Studies.dc.html` | `/case-studies` (nav is intentionally disabled — see §3.2) |
| `Privacy Policy.dc.html` | `/privacy-policy` |
| `Terms of Service.dc.html` | `/terms-of-service` |
| `Customer Service Agents.dc.html` | `/services/customer-service-agents` |
| `GTM Teams.dc.html` | `/services/gtm-teams` |
| `SDR as a Service.dc.html` | `/services/sdr-as-a-service` |
| `Virtual Back Office Team.dc.html` | `/services/virtual-back-office-team` |
| `Sales and Revenue.dc.html` | `/services/sales-and-revenue` |
| `Finance and Accounting.dc.html` | `/services/finance-and-accounting` |
| `AI and Automation.dc.html` | `/services/ai-and-automation` |
| `Managed IT.dc.html` | `/services/managed-it` |
| `HR and Recruiting.dc.html` | `/services/hr-and-recruiting` |
| `Marketing and Content.dc.html` | `/services/marketing-and-content` |
| `Industry Specific.dc.html` | `/services/industry-specific` |
| `Extra Services.dc.html` | `/services/extra-services` |
| `Home v1.dc.html` | **drop** — superseded by `index.html` |
| `RemAssist Logo Icon Web-loader.html` | **drop** — ported to `website-loader.js`, itself being removed |

### 7.4 The home page and the widgets

`index.html` is the only page with a `DCLogic` class. Its state —
`{ hoveredThumb, videoPaused, soundOn, quizStep, quizAnswers, faqOpen, teamProgress }` — becomes
discrete `'use client'` components: `Hero` (orbiting chips), `HeroVideo` (play/sound toggles),
`TeamRail` (scroll-snap carousel with progress), `FaqAccordion`, `ToolTicker`, `QuizFlow`.

Two standalone scripts port mostly mechanically:

- `assets/booking-modal.js` — intercepts Calendly links and opens them in a styled modal. No
  backend dependency.
- `assets/ask-remassist.js` — 1,484 lines of rule-based assistant (keyword table → canned answers).
  No backend dependency beyond the `LEAD_ENDPOINT` wired up in §9.

Three files are **deleted, not ported**:

- `assets/website-loader.js` and the loader markup — it exists to mask the CDN React + Babel boot.
  With server rendering there is nothing to hide, and a splash screen in front of already-rendered
  HTML is a pure regression.
- `assets/image-slot.js` and its `.image-slots.state.json` sidecar — a design-canvas authoring tool
  with no role in a deployed app.
- `support.js` — the DC runtime itself.

---

## 8. De-duplicating the quiz

Extract one implementation into `lib/quiz/`:

```ts
// lib/quiz/score.ts
export function scoreQuiz(
  answers: QuizAnswers,
  rates: { coverage: CoverageOption[]; tiers: AgentTier[]; services: ServiceCategory[] },
): QuizResult { /* … */ }
```

Both `/` and `/qualify` import it. The DB-backed rate tables feed it, so the `$8/$9/$11` literals
disappear from the markup entirely.

**Verification is non-negotiable here** — this arithmetic quotes prices to prospects. The answer
space is fully enumerable:

```
gap(4) × hours(4) × process(3) × judgment(3) × timing(3) = 432 combinations
```

Write a table test that walks all 432, comparing the new implementation against the *current*
output. Capture the current output first by running today's `score()` function from
`Qualify.dc.html` over the same matrix and snapshotting it.

**Do not delete either old copy until this test passes on all 432 cases.**

---

## 9. Lead capture

### 9.1 Route handler

```ts
// app/api/leads/route.ts
import { z } from 'zod';
import { db } from '@/db';
import { leads } from '@/db/schema';
import { rateLimit } from '@/lib/rate-limit';
import { notifyNewLead } from '@/lib/notify';

const Body = z.object({
  name:    z.string().trim().max(120).optional(),
  email:   z.string().email().max(200),
  phone:   z.string().trim().max(40).optional(),
  company: z.string().trim().max(160).optional(),
  message: z.string().trim().max(5000).optional(),
  page:    z.string().url().max(500).optional(),
  source:  z.enum(['qualify_quiz', 'ask_widget', 'contact_form', 'pricing_cta']),
  honey:   z.string().max(0).optional(),      // hidden field; bots fill it
});

export async function POST(req: Request) {
  const ip = req.headers.get('x-real-ip') ?? 'unknown';
  if (!(await rateLimit(`leads:${ip}`, { limit: 5, windowSec: 600 }))) {
    return Response.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: 'invalid' }, { status: 400 });
  }
  const { honey, page, ...d } = parsed.data;
  if (honey) return Response.json({ ok: true });   // silently drop bots

  const [row] = await db.insert(leads).values({
    ...d,
    pageUrl: page,
    referrer: req.headers.get('referer'),
  }).returning({ id: leads.id });

  await notifyNewLead(row.id).catch(() => {});     // never fail the request on notify
  return Response.json({ ok: true, id: row.id });
}
```

### 9.2 Wiring the existing client

`assets/ask-remassist.js:31` becomes:

```js
var LEAD_ENDPOINT = '/api/leads';
```

The client already POSTs `{ name, email, phone, message, page, source }` at line 1364 — the shape
matches. Crucially, **keep the `mailto:` fallback**: the existing code at line 1359 falls back to
composing an email when the endpoint is absent. Extend that so it also fires when the POST *fails*.

```js
fetch(LEAD_ENDPOINT, { /* … */ })
  .then(function (r) { if (!r.ok) throw new Error('bad status'); confirmed(); })
  .catch(function () { composed(); });   // never lose a lead to a 500
```

A dead form produces no errors in a log. This fallback and the lead-volume alarm in §14 are what
make that failure visible.

### 9.3 Notification

A database nobody watches is not an improvement on an inbox. Send a lead notification to email or
the existing Slack workspace on every insert, containing the source, the page and — for quiz
submissions — the answers and the quote the prospect saw.

---

## 10. Admin

Scope: ~9 internal editors, no public accounts.

```
/admin/leads       list + filter by source/status, view quiz answers and quote, CSV export
/admin/posts       CRUD, draft/publish, Markdown editor with live preview
/admin/faq         CRUD, reorder                       (29 rows)
/admin/team        CRUD, reorder, photo upload         (9 rows)
/admin/tools       CRUD, reorder                       (22 rows)
/admin/rates       edit coverage options + agent tiers — this is the price list
/admin/reviews     LIST + RESYNC ONLY — no create, no edit (§6.5)
```

Auth gate in `app/admin/layout.tsx`:

```ts
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

const ALLOWED = ['@remconnect.io', '@remassistance.com'];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !ALLOWED.some((d) => email.endsWith(d))) redirect('/');
  return <>{children}</>;
}
```

On publish, revalidate the affected pages so the change appears without a deploy:

```ts
import { revalidateTag } from 'next/cache';
revalidateTag('faq');            // or 'posts', 'team', 'rates'
```

Content reads use `unstable_cache` / `fetch` tagging so ISR serves cached HTML and Postgres is only
hit on revalidation, not per visitor.

> **Rates are a special case.** Editing `agent_tiers` changes quoted prices site-wide. Gate it
> behind a confirmation step and log who changed what — this is the one admin screen where a typo
> has commercial consequences.

---

## 11. SEO and redirects

This is where the migration's headline benefit is collected, and where a mistake silently costs
existing rankings.

### 11.1 Metadata

Every route gets real metadata — currently 2 of 25 pages have a title and none have OG or canonical:

```ts
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Managed IT Services | Rem Assist',
    description: '…',
    alternates: { canonical: 'https://remassistance.com/services/managed-it' },
    openGraph: {
      title: '…', description: '…', url: '…', siteName: 'Rem Assist',
      images: [{ url: '/og/managed-it.png', width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image' },
  };
}
```

Set `metadataBase` once in the root layout so relative OG image paths resolve.

### 11.2 Sitemap, robots, structured data

- `app/sitemap.ts` — enumerate static routes plus published `blogPosts` slugs from the DB
- `app/robots.ts` — allow all, point at the sitemap, **disallow `/admin`**
- JSON-LD: `Organization` (root), `FAQPage` (`/faq`, from the 29 rows), `BlogPosting` (each post)

### 11.3 The redirect map

**Blocked on §3.1.** Structure it as data so it can be asserted in CI:

```ts
// lib/redirects.ts
export const redirects = [
  // { source: '/old-path-from-remassistance.com', destination: '/new-path', permanent: true },
];
```

Rules:

- `permanent: true` (301). These stay **indefinitely** — external links and search results point at
  them, and there is no expiry date on that.
- If any legacy URL contains spaces, match the **encoded** form (`%20`).
- Assert every entry resolves to a live page in CI (§13.3). A redirect to a 404 is worse than no
  redirect.
- Where a legacy page has no equivalent, redirect to the nearest relevant parent — never blanket
  everything to `/`, which reads as a soft-404 to crawlers.

### 11.4 Verify server rendering actually happened

```bash
curl -s https://staging.remassistance.com/pricing | grep -c '<title>'
curl -s https://staging.remassistance.com/pricing | grep -o 'og:title'
```

If the content is present with JavaScript disabled, §1.1 is fixed. This is the direct test.

---

## 12. Deployment pipeline

### 12.1 Release layout

```
/srv/remassist/
  releases/
    20260825143000/     ← build output
    20260826091500/
  current -> releases/20260826091500     ← symlink, swapped atomically
  shared/
    .env
    isr-cache/          ← persists across releases
    backup.sh
```

### 12.2 GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }

      - run: npm ci
      - run: npm run lint && npm run typecheck
      - run: npm test
      - run: npm run build          # produces .next/standalone

      # standalone omits these — copy them in or ship a site with no CSS or images
      - run: |
          cp -r public .next/standalone/public
          cp -r .next/static .next/standalone/.next/static
          tar -czf release.tgz -C .next/standalone .

      - uses: webfactory/ssh-agent@v0.9.0
        with: { ssh-private-key: ${{ secrets.DEPLOY_SSH_KEY }} }

      - name: Upload and activate
        run: |
          STAMP=$(date +%Y%m%d%H%M%S)
          scp -o StrictHostKeyChecking=accept-new release.tgz \
            deploy@${{ secrets.VPS_HOST }}:/tmp/
          ssh deploy@${{ secrets.VPS_HOST }} bash -eu <<EOF
            mkdir -p /srv/remassist/releases/$STAMP
            tar -xzf /tmp/release.tgz -C /srv/remassist/releases/$STAMP
            rm /tmp/release.tgz

            # Persist the ISR cache across releases
            rm -rf /srv/remassist/releases/$STAMP/.next/cache
            ln -s /srv/remassist/shared/isr-cache \
                  /srv/remassist/releases/$STAMP/.next/cache

            # Migrate BEFORE swapping, so a failed migration never goes live
            cd /srv/remassist/releases/$STAMP
            set -a; . /srv/remassist/shared/.env; set +a
            npx drizzle-kit migrate

            ln -sfn /srv/remassist/releases/$STAMP /srv/remassist/current
            sudo systemctl restart remassist

            # Keep the last 5 releases for rollback
            ls -1dt /srv/remassist/releases/* | tail -n +6 | xargs -r rm -rf
          EOF

      - name: Smoke test
        run: |
          for i in $(seq 1 15); do
            curl -fsS https://remassistance.com/ >/dev/null && exit 0
            sleep 2
          done
          echo "Smoke test failed"; exit 1
```

Grant `deploy` exactly one sudo exception rather than blanket rights —
`/etc/sudoers.d/remassist`:

```
deploy ALL=(root) NOPASSWD: /bin/systemctl restart remassist, /bin/systemctl reload nginx
```

### 12.3 Rollback

```bash
ln -sfn /srv/remassist/releases/<previous> /srv/remassist/current
sudo systemctl restart remassist
```

Under a minute, because the previous release is still on disk. **Caveat:** rolling back code does
not roll back a migration. Write migrations to be backward-compatible for one release (add columns,
don't rename or drop) so a code rollback stays safe. Destructive changes go in a *later*, separate
migration once the new code is settled.

---

## 13. Testing and verification

### 13.1 Visual regression

Stand up Playwright screenshot diffing at the **start** of Phase 01, not the end:

```ts
// tests/visual.spec.ts
const ROUTES = ['/', '/pricing', '/faq', '/services/managed-it', /* … */];

for (const route of ROUTES) {
  test(`${route} matches baseline`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveScreenshot(`${route.replace(/\//g, '_')}.png`, {
      fullPage: true, maxDiffPixelRatio: 0.01,
    });
  });
}
```

Baselines come from the current production pages. Run at 1280×800 and 375×812 to catch the mobile
breakpoints in the page-level `<style>` blocks.

> This runs in CI. It is not something to eyeball page by page across 25 pages.

### 13.2 Unit and integration

- **Quiz parity** — all 432 combinations (§8). The highest-value test in the suite.
- **Lead API** — valid insert, invalid payload rejected, rate limit trips, honeypot silently drops,
  `mailto:` fallback fires on a simulated 500.
- **Seed idempotency** — running `db/seed.ts` twice produces identical row counts.

### 13.3 CI gates

| Gate | Blocks merge | Status (2026-08-27) |
|---|---|---|
| `tsc --noEmit` | yes | **in CI** |
| ESLint | yes | **in CI** |
| Quiz parity (432 cases) | yes | **in CI** — the `npm test` step was missing entirely until 2026-08-27, so this had never run |
| Visual diffs within tolerance | yes, override with review | **not set up** — see below |
| **Every redirect resolves to a live page** | yes | **in CI**, as a unit assertion against the route list; not yet a smoke test against a running server |
| Lighthouse SEO ≥ 95 on a sampled route set | yes from Phase 05 | **not set up** |

§13.1's premise no longer holds: it says baselines come from "the current production pages", but
production is the old WordPress site and looks nothing like the port. Standing up Playwright needs
a decision about what the baseline actually is — the artboards, or a blessed run of the new site.
Until then the coverage is the measured sweeps recorded in §0, not screenshots.

§13.2's lead-API cases are covered at route level in `lib/leads/route.test.ts` — invalid payload,
malformed body, honeypot dropped silently, 503 when the database is absent (which is what makes the
`mailto:` fallback fire), the limit tripping on the sixth request, per-address isolation, and
x-forwarded-for spoofing. **A successful insert and seed idempotency are not covered**: both need a
live Postgres, and mocking the Drizzle chain would assert the mock was called rather than that a row
lands. Add them once CI has a database.

---

## 14. Cutover runbook

Deliberately last and deliberately small — by this point it is a DNS change against something
already proven on a staging subdomain.

### T-7 days

- [ ] Staging subdomain serving the full site from the VPS over HTTPS
- [ ] Redirect map complete and asserted in CI (§11.3)
- [ ] One backup restore rehearsed end to end (§4.6)
- [ ] Rollback rehearsed on staging — swap symlink, restart, verify
- [ ] Lead notification confirmed arriving from staging
- [ ] Baseline recorded: current organic sessions/day, leads/week, top 20 landing pages

### T-1 day

- [ ] **Lower DNS TTL** on apex and `www` to 300s
- [ ] Confirm certbot covers both hostnames and renewal dry-run passes
- [ ] Freeze content edits on the old site
- [ ] Final `pg_dump`, verified offsite

### T-0

- [ ] Final deploy to the VPS; smoke test passes
- [ ] Switch DNS to the VPS
- [ ] **Keep the old `remassistance.com` codebase running and reachable** at a temporary hostname
- [ ] Verify from several networks: TLS valid, home page renders, a sample of redirects 301 correctly
- [ ] Submit the new sitemap in Search Console
- [ ] Submit a real lead through the live form and confirm it lands in Postgres

### T+1 to T+7

Monitor daily:

| Signal | Where | Rollback trigger |
|---|---|---|
| **Lead volume** | `SELECT count(*) FROM leads WHERE created_at > now() - interval '1 day'` | Any sustained drop vs baseline |
| 404 rate | Nginx access logs | Spike, or any 404 on a redirected path |
| Search Console coverage | GSC | Rising "not found" or "excluded" |
| Error rate | `journalctl -u remassist` | Unhandled exceptions |
| Response time | Nginx `$request_time` | p95 regression |

**Lead volume is the real canary.** A broken form throws nothing and logs nothing — it just quietly
stops producing business.

Restore DNS TTL to normal after a week of stability.

---

## 15. Decommission

Only after a week at parity or better:

- [ ] Delete the 25 `.dc.html` files (they remain in git history)
- [ ] Delete `support.js` — the DC runtime
- [ ] Delete `tools/sync-partials.js` — superseded by the React root layout (§5.4)
- [ ] Delete `assets/website-loader.js`, `assets/image-slot.js`, `RemAssist Logo Icon Web-loader.html`
- [ ] Delete `partials/` once header/footer are components
- [ ] Retire the old `remassistance.com` codebase and its hosting
- [ ] Update the project memory / deploy notes: **the artboard workflow and the `sync-partials` step
      no longer exist**, and the deploy target is the Hostinger VPS, not Vercel
- [ ] Decide the fate of `Home v1.dc.html` and `Case Studies.dc.html` per §3.2

---

## 16. Phase summary and effort

| Phase | Days | Ships | Exit criteria |
|---|---:|---|---|
| **00** Groundwork | 5–8 | VPS provisioned and hardened, Postgres + Nginx + TLS + CI, Next.js skeleton with brand tokens, header/footer as layout components. Plus the §3.1 URL audit. | Staging subdomain serves one real page over HTTPS from the VPS; a migration has run through CI |
| **01** Static port | 10–15 | 24 static pages to JSX via codemod; old→new slug map recorded | All 24 render server-side; visual diffs clean or signed off |
| **02** Interactive | 5–7 | Home `DCLogic` → client components; quiz extracted to one module; widgets ported; loader and `image-slot` deleted | 432-case quiz parity test passes |
| **03** Database | 4–6 | `POST /api/leads` live, `LEAD_ENDPOINT` wired, quiz persisted, seed script run, notifications firing | A staging submission lands in Postgres and alerts; pages read content from the DB |
| **04** Admin | 5–8 | Auth + CRUD for posts, FAQ, team, tools, rates; leads inbox; reviews resync-only | A non-developer publishes a post and edits an FAQ unaided, no deploy |
| **05** SEO + redirects | 3–5 | Metadata, canonicals, OG, sitemap, robots, JSON-LD, real blog routes, the 301 map | Every audited legacy URL 301s to a live page, asserted in CI; metadata present with JS disabled |
| **06** Cutover | 2–3 | Production live on the VPS; old runtime removed | A week at parity or better on organic traffic and lead volume |
| **Total** | **34–52** | | ≈ 7–11 weeks, one developer |

Assumes focused engineering days for one experienced full-stack developer, excluding review cycles,
copy changes and holidays. Phases 00–02 are well-understood mechanical work and the estimates are
firm. **Phase 04 is the least certain** — admin scope creeps, because every editor wants one more
field. Phases 01 and 04 parallelise across two developers; 05 and 06 do not.

---

## 17. Risk register

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | Rankings and inbound links lost when `remassistance.com`'s URLs change | **High** | Complete the §3.1 audit; build the map during Phase 01 while renaming; assert every entry in CI; keep redirects permanently |
| 2 | Replacing a live revenue site with no managed rollback | **High** | Old codebase stays running and reachable; DNS TTL lowered a day ahead; rollback rehearsed on staging before cutover, not improvised during it |
| 3 | Lead capture silently breaks at cutover | **High** | `mailto:` fallback on POST failure (§9.2); per-lead notification; lead volume is an explicit rollback trigger (§14) |
| 4 | Single VPS is a single point of failure; uptime, patching and backups are now ours | Medium | systemd `Restart=on-failure`; nightly offsite `pg_dump` with a rehearsed restore; unattended security upgrades; external uptime monitoring. Accepted trade-off of self-hosting |
| 5 | Phase 01 overruns on 2,117 inline styles | Medium | Codemod validated on the two legal pages first, with an explicit abandon gate at page three (§7.1) |
| 6 | Quote arithmetic shifts while de-duplicating | Medium | All 432 answer combinations asserted against current output before either copy is deleted (§8) |
| 7 | Fabricated testimonials become possible | Medium | No create/edit path for `reviews`; sync-only with mandatory `sourceUrl`; live profile still linked (§6.5) |
| 8 | ISR serves stale or inconsistent pages | Medium | Single Node instance, not cluster mode (§2.2); tag-based revalidation on publish (§10) |
| 9 | A failed migration takes the site down | Medium | Migrate before the symlink swap, so a failure aborts the deploy with the old release still serving (§12.2); backward-compatible migrations for one release (§12.3) |
| 10 | Losing visual editing on the artboards | Low | Accepted decision. The `.dc.html` files stay in git history if a layout needs revisiting |

---

## Appendix — what gets deleted

| File | Lines / size | Reason |
|---|---|---|
| `support.js` | 1,768 | The DC runtime; replaced by Next.js |
| 25 × `*.dc.html` / `index.html` | ~19,900 | Ported to `app/` |
| `tools/sync-partials.js` | ~120 | Replaced by the React root layout |
| `partials/header.html`, `footer.html` | 32 KB | Become components |
| `assets/website-loader.js` | — | Masked the CDN React + Babel boot; nothing left to mask |
| `assets/image-slot.js` | — | Design-canvas authoring tool |
| `RemAssist Logo Icon Web-loader.html` | 11 KB | Superseded draft |
| `Home v1.dc.html` | 47 KB | Superseded by `index.html` |

Retained: `assets/images/**`, `uploads/**` (hero video, client logos), `assets/colors_and_type.css`
(as the token source for §5.3), `assets/booking-modal.js` and `assets/ask-remassist.js` (ported).
