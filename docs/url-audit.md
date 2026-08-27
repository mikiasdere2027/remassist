# §3.1 URL Audit — remassistance.com (blocking prerequisite)

> **Status:** inventory collected (2026-08-25); destinations resolved and the
> redirect map filled (2026-08-26). One open item remains — see §4.
>
> This audit sizes Phase 01 (port scope) and feeds `lib/redirects.ts` (Phase 05).

## 1. Live stack (measured)

The production site at `remassistance.com` is **WordPress + Elementor**, not the
artifact codebase in this repo:

| Evidence | Value |
|---|---|
| Sitemap | `https://remassistance.com/sitemap.xml` → `wp-sitemap-*` index |
| Robots | `User-agent: *`; `Disallow: /wp-admin/`; sitemap → `wp-sitemap.xml` |
| Page slugs | `elementor-1003/`, `pricing-2/` indicate Elementor/plugin artifacts |
| `www` | CNAME / A records resolve to the same host set as the apex |

**Implication:** the old WordPress deployment is a separate thing from the
`.dc.html` artboards in this repo. Both produce URLs that search engines and
external links point at, so the redirect map must cover the WordPress URL set.

## 2. Live URL inventory (20 indexed URLs)

### 2.1 Pages (15)
| URL | lastmod |
|---|---|
| `/` | 2026-06-05 |
| `/blog/` | 2026-03-03 |
| `/how-it-works/` | 2026-03-03 |
| `/services/` | 2026-04-08 |
| `/pricing/` | 2026-04-08 |
| `/pricing-2/` | 2026-03-10 |
| `/reviews/` | 2023-04-19 |
| `/saas/` | 2023-03-13 |
| `/rem-ai/` | 2025-06-11 |
| `/careers/` | 2023-04-07 |
| `/job-form/` | 2023-04-07 |
| `/thank-you-page/` | 2023-04-13 |
| `/privacy-policy/` | 2026-02-26 |
| `/terms-of-use/` | 2026-02-26 |
| `/inspirations/` | 2026-02-23 |

### 2.2 Posts (4)
| URL | lastmod |
|---|---|
| `/viverra-ullamcorper-diam-nibh-suspendisse-erat-in-sit-sodales/` | 2026-03-03 |
| `/bpos-emerging-growth-in-african-cities-why-ethiopia-is-the-future-hub-of-outsourcing/` | 2026-03-03 |
| `/rem-assist-your-guide-to-the-future/` | 2026-03-03 |
| `/elementor-1003/` | 2026-03-03 |

### 2.3 Taxonomies (1)
| URL |
|---|
| `/category/uncategorized/` |

### 2.4 Diagnostics (not business pages — recorded for completeness)
- `/sitemap.xml`, `/robots.txt` — served by WordPress itself.

## 3. DNS facts (measured 2026-08-25)

| Record | Value | TTL |
|---|---|---|
| `remassistance.com` A | `5.252.75.14`, `88.222.223.25` | **~53s** |
| `www.remassistance.com` | CNAME → `remassistance.com` (A `88.222.223.41`, `5.252.75.41`) | 60s / 300s |
| MX | `remassistance-com.mail.protection.outlook.com` (pref 0) — **Microsoft 365 email** | — |
| NS | `ns1.dns-parking.com`, `ns2.dns-parking.com` — **Hostinger parking DNS** | — |

**Cutover note:** the apex TTL is already low (~53s), which is favorable for the
§14 cutover window. No TTL-lowering step is likely needed, but re-verify before cutover.

**Critical:** MX points at Microsoft 365. Repointing the A records during cutover
must **not** alter or drop the MX record, or email breaks.

## 4. Open items (need client/business input — not fetchable)

- [x] **Where is DNS managed?** → **Hostinger** (nameservers `ns1/ns2.dns-parking.com`). Record changes happen in the Hostinger control panel / DNS zone editor. Semi-resolved — still confirm the active hosting account.
- [ ] **Where does TLS terminate today?** (WordPress host cert vs Cloudflare) —
      if Cloudflare proxies, its "orange cloud" behavior changes the cutover.
- [ ] **Inbound campaign URLs / QR codes / printed media** that must not move to
      a 301 — these are business-owned, not discoverable via sitemap.
- [x] **Which legacy WordPress pages have a true Next.js equivalent** vs. which
      map to the nearest relevant parent (rule: never blanket-redirect to `/`;
      §11.3). → **Resolved 2026-08-26** by loading each live page and mapping it
      in `lib/redirects.ts`. `/saas/`, `/rem-ai/`, `/thank-you-page/` and
      `/job-form/` turned out to be empty Elementor stubs (nav + footer only),
      which is why two go to the nearest topical parent and two are left to
      404. Asserted in `lib/redirects.test.ts`.
- [ ] **Does `/careers/` come back?** It is the one legacy page with real
      content and no Next.js equivalent (its listings look like Elementor demo
      copy — "Head of Payment Operations"). Currently left to 404 rather than
      dumping applicants on a sales page. Decide: rebuild it, point it at a
      third-party job board, or keep the 404. `/job-form/` follows whatever
      `/careers/` does.

## 5. Feed into the project

- `lib/redirects.ts` — the typed, CI-assertable redirect map; Phase 05 fills it
  from this audit.
- Phase 01 — the 15 WordPress page slugs hint at the *canonical* new slugs the
  port should aim for; keep the old→new map recorded while renaming.
- §11.2 — `/sitemap.ts` and `/robots.ts` in the app must enumerate the new
  canonical URLs (not the WordPress set).