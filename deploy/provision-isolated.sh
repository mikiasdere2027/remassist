#!/usr/bin/env bash
#
# provision-isolated.sh — Rem Assist on a SHARED VPS, isolated from other apps.
#
#   sudo bash provision-isolated.sh
#
# The stock provision.sh (runbook MIGRATION-PLAN.md §4) assumes a dedicated
# box: it replaces Node system-wide, enables ufw with a default-deny policy,
# removes the nginx default site and claims :80/:443 as default_server. That is
# wrong for a VPS that already hosts other projects (remconnect.online,
# remconnect.io, api.remconnect.io on ports 3000/3001 as users deploy/solomon).
#
# This variant is idempotent and NON-destructive to the other apps:
#   · own system user `remassist`, own /srv/remassist tree   — the existing
#     `deploy` user (uid 1001) keeps running the other app on :3000 untouched
#   · app on port 3002 (PORT lives in shared/.env, never in the unit file)
#   · own Postgres role + database `remassist`
#   · systemd unit User/Group=remassist
#   · nginx vhost for remassistance.com only — NO default_server, so unknown
#     hostnames keep hitting the existing default site
#   · 2G swap, because a 3.8 GB box with other apps on it will OOM-kill the
#     neighbours during `next build` otherwise
#   · does NOT install Node 22 (the other apps run Node 20; this app is fine
#     on it), does NOT enable ufw/fail2ban (global firewall change).
#
# Limitations vs the dedicated runbook:
#   · harden-ssh.sh + certbot/nginx.conf cutover are unchanged; run them once
#     DNS for remassistance.com points at this box.
#   · The bootstrapped nginx vhost is HTTP-only and named-vhost only; it claims
#     no default_server, so `curl --resolve` is how you verify it before DNS.

set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "run with sudo" >&2; exit 1; }

ADMIN_USER="${SUDO_USER:-mikiyas}"
APP_USER=remassist
APP_ROOT=/srv/remassist
SHARED="$APP_ROOT/shared"
APP_PORT="${REMASSIST_PORT:-3002}"
SITE_URL="${SITE_URL:-https://remassistance.com}"

log()  { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m  ! %s\033[0m\n' "$*"; }
skip() { printf '  \033[2m· %s\033[0m\n' "$*"; }

log "Host"
. /etc/os-release; echo "  $PRETTY_NAME  |  $(nproc) cpu  |  $(free -h | awk '/^Mem:/{print $2}') ram"

# ── Swap, if the box is small and has none ───────────────────────────────────
MEM_MB=$(free -m | awk '/^Mem:/{print $2}')
if [ -z "$(swapon --show)" ] && [ "$MEM_MB" -lt 4000 ]; then
  log "Adding 2G swap (${MEM_MB}M RAM) — protects every app on this shared box"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ── app user and layout ──────────────────────────────────────────────────────
log "User $APP_USER and directories"
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  adduser --system --group --disabled-password \
    --home "$APP_ROOT" --no-create-home --shell /usr/sbin/nologin "$APP_USER"
else
  skip "user exists"
fi
id -nG "$ADMIN_USER" | tr ' ' '\n' | grep -qx "$APP_USER" || usermod -aG "$APP_USER" "$ADMIN_USER"

install -d -o "$APP_USER" -g "$APP_USER" -m 2775 "$APP_ROOT"
install -d -o "$APP_USER" -g "$APP_USER" -m 2775 "$APP_ROOT/releases"
install -d -o "$APP_USER" -g "$APP_USER" -m 755  "$SHARED"
install -d -o "$APP_USER" -g "$APP_USER" -m 2775 "$SHARED/uploads"
install -d -o "$APP_USER" -g "$APP_USER" -m 2775 "$SHARED/isr-cache"
install -d -o root    -g root    -m 755         /var/www/certbot

# ── Postgres: own role + database ────────────────────────────────────────────
log "Postgres role/db $APP_USER"
DB_PASS=""
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$APP_USER'" | grep -q 1; then
  skip "role exists — leaving it alone"
else
  DB_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
  sudo -u postgres psql -qc "CREATE ROLE $APP_USER LOGIN PASSWORD '$DB_PASS'"
fi
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$APP_USER'" | grep -q 1 \
  || sudo -u postgres createdb -O "$APP_USER" "$APP_USER"
# ── shared/.env ──────────────────────────────────────────────────────────────
log "Environment file ($SHARED/.env)"
if [ -f "$SHARED/.env" ]; then
  skip "exists — not touching it"
else
  [ -n "$DB_PASS" ] || { echo "the role predates this .env; set DATABASE_URL by hand" >&2; DB_PASS="SET_ME"; }
  cat > "$SHARED/.env" <<ENV
# Rem Assist production environment (ISOLATED variant — shared box).
# Read by systemd (EnvironmentFile) and by deploy/remote-deploy.sh at build
# time. NEVER commit this file.
NODE_ENV=production
PORT=$APP_PORT
HOSTNAME=127.0.0.1

DATABASE_URL=postgres://$APP_USER:$DB_PASS@localhost:5432/$APP_USER

NEXT_PUBLIC_SITE_URL=$SITE_URL
NEXT_PUBLIC_CONSENT_MODE=opt-in

# Unset = no tag loads at all (components/analytics/GoogleTagManager.tsx).
NEXT_PUBLIC_GTM_ID=
# Unset = lead notifications are skipped silently (lib/notify.ts).
LEAD_WEBHOOK_URL=
ENV
  chown "$APP_USER:$APP_USER" "$SHARED/.env"
  chmod 640 "$SHARED/.env"     # 0640, not 0600: remote-deploy.sh ($ADMIN_USER) must read it
fi

# ── systemd unit (isolated: run AS remassist, port comes from .env) ─────────
log "systemd unit"
cat > /etc/systemd/system/remassist.service <<UNIT
# Rem Assist — Next.js standalone server (ISOLATED variant: User=remassist).
# Single instance, deliberately; self-hosted ISR writes the cache locally.
[Unit]
Description=Rem Assist Next.js
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_ROOT/current
EnvironmentFile=$SHARED/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=remassist

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only
ReadWritePaths=$SHARED

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/sudoers.d/remassist <<SUDO
# Exactly two privileged operations, no more.
$ADMIN_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart remassist, /usr/bin/systemctl reload nginx
SUDO
chmod 440 /etc/sudoers.d/remassist
visudo -cf /etc/sudoers.d/remassist
systemctl daemon-reload
systemctl enable remassist >/dev/null 2>&1 || true
# ── nginx: snippet + NAMED vhost (not default_server) ───────────────────────
log "nginx vhost (remassistance.com only, :$APP_PORT upstream)"
command -v nginx >/dev/null || { echo "nginx not installed" >&2; exit 1; }
install -d -m 755 /etc/nginx/snippets
SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
[ -f "$SCRIPTS/remassist-common.conf" ] && install -o root -g root -m 644 \
  "$SCRIPTS/remassist-common.conf" /etc/nginx/snippets/remassist-common.conf

cat > /etc/nginx/sites-available/remassist <<VHOST
# Rem Assist — nginx bootstrap (HTTP only), ISOLATED variant for a shared box.
# Deliberately NOT default_server and no catch-all hostname: unknown-host
# requests keep hitting the pre-existing default site. DNS still points at
# WordPress, so verification is curl --resolve (see deploy/README.md).
upstream remassist_app {
  server 127.0.0.1:$APP_PORT;
  keepalive 32;
}

server {
  listen 80;
  listen [::]:80;
  server_name remassistance.com www.remassistance.com;

  # Let's Encrypt HTTP-01, present from the start.
  location ^~ /.well-known/acme-challenge/ {
    root /var/www/certbot;
    default_type "text/plain";
  }

  include /etc/nginx/snippets/remassist-common.conf;
}
VHOST

ln -sfn /etc/nginx/sites-available/remassist /etc/nginx/sites-enabled/remassist
nginx -t && systemctl reload nginx

log "Verify"
echo "  app port      : $APP_PORT (upstream remassist_app)"
echo "  DATABASE_URL  : postgres://$APP_USER:****@localhost:5432/$APP_USER"
echo
cat <<'NEXT'
  Next:
    1. ./tools/deploy.sh            — first run seeds shared/uploads (141 MB)
    2. curl -sI --resolve remassistance.com:80:72.62.234.125 http://remassistance.com/
    3. DNS cutover + certbot, then deploy/nginx.conf (adapted to :3002)
NEXT