# Deploying Rem Assist to the VPS

Runbook for the Hostinger VPS at `72.62.234.125`. The design and the reasoning
live in `MIGRATION-PLAN.md` §4 (server setup) and §12 (release pipeline); this
file is the operational summary and the parts that differ from the plan because
of what the real box turned out to be.

## The short version

```bash
./tools/deploy.sh
```

That is the whole thing once the box is provisioned. It packs the working tree,
ships it, builds on the server, runs lint + typecheck + the 460-case suite,
applies migrations, swaps the release symlink, restarts, smoke-tests, and rolls
back on its own if the smoke test fails.

## Access

`~/.ssh/config` carries a `remvps` alias (host `72.62.234.125`, user `mikiyas`,
key `~/.ssh/id_ed25519_remvps`). The key is dedicated to this box and separate
from the GitHub key; it has no passphrase, because deploys are unattended.

```bash
ssh remvps
```

Password authentication is disabled by `harden-ssh.sh`, so the key is the only
way in. **If you lose the key, recovery is Hostinger's console, not SSH.**

## Layout on the box

```
/srv/remassist/
  releases/20260828143000/          full source + build for one deploy
  current -> releases/…/.next/standalone     ← swapped atomically
  shared/
    .env            secrets; 0640 deploy:deploy; never committed
    uploads/        the 142 MB of interview video, outside every release
    isr-cache/      survives deploys, so a release does not start cold
    backup.sh
```

`current` points at the **standalone bundle**, not the release root — the
systemd unit runs `node server.js` with `WorkingDirectory=/srv/remassist/current`,
and `server.js` only exists inside `.next/standalone`.

## Why the build runs on the server

`sharp` is a native module. A build done on Windows bundles win32 binaries into
`.next/standalone/node_modules`, and `next/image` optimisation then fails on
Linux. Building on the box is what makes the artifact correct; it is not a
convenience.

## Files here

| File | Goes to | Notes |
|---|---|---|
| `provision.sh` | run once with sudo | §4.1–§4.5. Idempotent; never overwrites `shared/.env`. |
| `harden-ssh.sh` | run last with sudo | Disables password auth. Refuses to run without a key installed. |
| `remassist.service` | `/etc/systemd/system/` | Single instance, deliberately (§2.2 — ISR cache is local). |
| `remassist-common.conf` | `/etc/nginx/snippets/` | The serving rules; shared by both vhosts. |
| `nginx-bootstrap.conf` | `/etc/nginx/sites-available/remassist` | HTTP only. Used before a certificate exists. |
| `nginx.conf` | same, after certbot | HTTPS, `www` → apex, HTTP → HTTPS. |
| `remote-deploy.sh` | shipped per deploy | The server half of `tools/deploy.sh`. |
| `backup.sh` | `/srv/remassist/shared/` | Nightly `pg_dump`, 14 local dailies, optional rclone offsite. |

## Departures from MIGRATION-PLAN §4.5

Three, each for a reason recorded in `remassist-common.conf`:

1. **`/uploads/` is served by nginx off the disk**, not proxied. The clips are
   4–68 MB and every `<video>` fetches them as byte ranges; nginx does ranges
   natively, and the single Node process should not be holding them open.
2. **`/_next/static/` is proxied to Node**, not aliased through `current`.
   Aliasing opens a window between the symlink swap and the restart where the
   old page markup asks for hashes that only the old release has.
3. **§4.5's `proxy_cache_valid` is dropped** — inert without a `proxy_cache_path`,
   which cannot live in a server block.

Also: certificates come from `certbot certonly --webroot`, not `--nginx`, so
certbot never rewrites `nginx.conf` and the repo copy stays truthful.

## First-time provisioning

```bash
scp -r deploy remvps:/tmp/                 # or just deploy the tree once
ssh remvps 'sudo bash /tmp/deploy/provision.sh'
./tools/deploy.sh                          # first run auto-includes public/uploads
```

## On a shared VPS (isolated setup)

The box at `72.62.234.125` is NOT dedicated — it also live-serves remconnect
apps (`remconnect.online` / `api.remconnect.io` on :3000 as user `deploy`,
`remconnect.io` on :3001 as user `solomon`). The dedicated runbook
(`provision.sh`) would break them: it claims :3000, replaces Node system-wide
and enables a default-deny firewall.

For this box use `deploy/provision-isolated.sh` instead (already run):

* own system user + group `remassist`, own `/srv/remassist` tree (2775, so the
  deployer can swap the `current` symlink)
* app on **PORT=3002** (in `shared/.env`, never in the unit file)
* own Postgres role + database `remassist`
* systemd `User=remassist`; nginx vhost for `remassistance.com` only —
  **no `default_server`**, so unknown hosts still hit the pre-existing default
* Node 20 is left alone (this app builds fine on it); ufw/fail2ban untouched
* 2G swap added to survive `next build` without OOM-killing the neighbours
* `remote-deploy.sh` smoke test reads PORT from `shared/.env` (defaults 3000)

The first deploy seeded `shared/uploads` (141 MB) straight off the release
tarball (with a `|| true` on the copy — a non-owner cannot preserve
timestamps, and that metadata warning must not abort a deploy).

Verify before DNS moves:

```bash
curl -sI --resolve remassistance.com:80:72.62.234.125 http://remassistance.com/
```

Cutover is unchanged, but remember: `deploy/nginx.conf` still says
`127.0.0.1:3000` in its upstream — change it to 3002 when you install it.
## Cutover to remassistance.com

The live site today is WordPress + Elementor on Hostinger **shared hosting
behind Hostinger's CDN** (`Server: hcdn`) — not on this VPS. Moving the domain
is four steps, in this order, and step 1 is the one people forget:

1. **Turn off the Hostinger CDN for the domain in hPanel.** While it is on it
   can keep serving WordPress no matter what the DNS zone says.
2. DNS zone: apex `A` → `72.62.234.125`; **delete both `AAAA` records** (this
   VPS has no IPv6, and leaving them sends IPv6 clients to the old host);
   replace the `www` CNAME (currently `www.remassistance.com.cdn.hstgr.net`)
   with an `A` to the same IP.
   **Do not touch MX, SPF, DKIM or DMARC** — mail is Microsoft 365 and will
   break. Apex TTL was ~53 s at the last audit, so propagation is quick.
3. `sudo certbot certonly --webroot -w /var/www/certbot -d remassistance.com -d www.remassistance.com`
4. Install `nginx.conf` over `nginx-bootstrap.conf`, `nginx -t`,
   `sudo systemctl reload nginx`, then **actually run**
   `sudo certbot renew --dry-run`.

Verify everything *before* step 2 by pinning the hostname to the new box:

```bash
curl -sI --resolve remassistance.com:80:72.62.234.125 http://remassistance.com/
```

**Leave the WordPress hosting account running and unmodified for two weeks.**
It is the rollback.

## Rollback

```bash
# Bad release — under a minute, the previous one is still on disk
ssh remvps 'ln -sfn /srv/remassist/releases/<previous>/.next/standalone /srv/remassist/current \
            && sudo systemctl restart remassist'
```

This does not roll back a migration. Keep migrations additive for one release
(add columns; never rename or drop in the same deploy as the code that stops
using them) — §12.3.

A bad cutover rolls back by reverting the DNS records.

## Watching it

```bash
ssh remvps 'systemctl status remassist'
ssh remvps 'journalctl -u remassist -f'
ssh remvps 'sudo tail -f /var/log/nginx/access.log'
```
