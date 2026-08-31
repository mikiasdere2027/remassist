#!/usr/bin/env bash
#
# provision.sh — turn a stock Hostinger Ubuntu 24.04 box into the Rem Assist
# host. MIGRATION-PLAN.md §4.1–§4.5.
#
#   sudo bash provision.sh
#
# Idempotent: safe to re-run. It never overwrites an existing shared/.env and
# never touches the database if the role already exists.
#
# It deliberately does NOT harden sshd — that is deploy/harden-ssh.sh, run last,
# once key auth is proven. Locking password auth off from inside a script that
# might fail halfway is how people lose access to their own server.

set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "run with sudo" >&2; exit 1; }

# The human account that will run deploys (member of the deploy group).
ADMIN_USER="${SUDO_USER:-mikiyas}"
APP_ROOT=/srv/remassist
SHARED="$APP_ROOT/shared"
SITE_URL="${SITE_URL:-https://remassistance.com}"

log()  { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m  ! %s\033[0m\n' "$*"; }
skip() { printf '  \033[2m· %s\033[0m\n' "$*"; }

log "Host"
. /etc/os-release; echo "  $PRETTY_NAME  |  $(uname -r)  |  $(nproc) cpu  |  $(free -h | awk '/^Mem:/{print $2}') ram"

# ── Swap, if the box is small ───────────────────────────────────────────────
# `next build` across 23 routes peaks around 2 GB. Being OOM-killed mid-build
# surfaces as a mystifying "Killed" with no stack.
MEM_MB=$(free -m | awk '/^Mem:/{print $2}')
if [ "$MEM_MB" -lt 4000 ] && ! swapon --show | grep -q .; then
  log "Adding 2G swap (only ${MEM_MB}M RAM)"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
  skip "swap not needed"
fi

# ── Packages ────────────────────────────────────────────────────────────────
log "Base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg ufw fail2ban unattended-upgrades \
                       postgresql postgresql-contrib certbot acl >/dev/null
dpkg-reconfigure -f noninteractive unattended-upgrades

# ── Node 22 LTS ─────────────────────────────────────────────────────────────
if ! command -v node >/dev/null || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -ne 22 ]; then
  log "Installing Node 22 LTS"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
else
  skip "node $(node -v) already installed"
fi
echo "  node $(node -v), npm $(npm -v)"

# ── deploy user and release layout (§12.1) ──────────────────────────────────
log "User and directories"
id -u deploy >/dev/null 2>&1 || adduser --system --group --disabled-password \
  --shell /bin/bash --home "$APP_ROOT" --no-create-home deploy
id -nG "$ADMIN_USER" | tr ' ' '\n' | grep -qx deploy || usermod -aG deploy "$ADMIN_USER"

install -d -o deploy -g deploy -m 755  "$APP_ROOT"
install -d -o deploy -g deploy -m 2775 "$APP_ROOT/releases"
install -d -o deploy -g deploy -m 755  "$SHARED"
install -d -o deploy -g deploy -m 2775 "$SHARED/uploads"
install -d -o deploy -g deploy -m 2775 "$SHARED/isr-cache"
install -d -o root   -g root   -m 755  /var/www/certbot

# ── Postgres (§4.3) ─────────────────────────────────────────────────────────
log "Postgres"
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='remassist'" | grep -q 1; then
  skip "role remassist already exists — leaving it and its password alone"
  DB_PASS=""
else
  DB_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 >/dev/null <<SQL
CREATE ROLE remassist WITH LOGIN PASSWORD '$DB_PASS';
CREATE DATABASE remassist OWNER remassist;
SQL
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d remassist >/dev/null <<'SQL'
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO remassist;
SQL
fi

# Never listen on anything but loopback. ufw also blocks 5432, but defence in
# depth costs nothing here.
PG_CONF="$(sudo -u postgres psql -tAc 'SHOW config_file')"
if ! grep -qE "^listen_addresses *= *'localhost'" "$PG_CONF"; then
  sed -i "s/^#\?listen_addresses.*/listen_addresses = 'localhost'/" "$PG_CONF"
  systemctl restart postgresql
fi
echo "  listening on: $(ss -lntH 'sport = :5432' | awk '{print $4}' | paste -sd' ')"

# ── shared/.env ─────────────────────────────────────────────────────────────
log "Environment file"
if [ -f "$SHARED/.env" ]; then
  skip "$SHARED/.env exists — not touching it"
else
  [ -n "$DB_PASS" ] || { echo "the postgres role predates this .env; set DATABASE_URL by hand" >&2; DB_PASS="SET_ME"; }
  cat > "$SHARED/.env" <<ENV
# Rem Assist production environment. Read by systemd (EnvironmentFile) and by
# deploy/remote-deploy.sh at build time. NEVER commit this file.
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1

DATABASE_URL=postgres://remassist:$DB_PASS@localhost:5432/remassist

NEXT_PUBLIC_SITE_URL=$SITE_URL
NEXT_PUBLIC_CONSENT_MODE=opt-in

# Unset = no tag loads at all (components/analytics/GoogleTagManager.tsx).
NEXT_PUBLIC_GTM_ID=
# Unset = lead notifications are skipped silently (lib/notify.ts).
LEAD_WEBHOOK_URL=
ENV
  # 0640, not 0600: deploy/remote-deploy.sh runs as $ADMIN_USER and has to
  # source this file to get NEXT_PUBLIC_* into the build. The deploy group is
  # exactly {deploy, $ADMIN_USER}.
  chown deploy:deploy "$SHARED/.env"
  chmod 640 "$SHARED/.env"
fi

# ── systemd (§4.4) ──────────────────────────────────────────────────────────
log "systemd unit"
install -o root -g root -m 644 "$(dirname "$0")/remassist.service" \
        /etc/systemd/system/remassist.service
cat > /etc/sudoers.d/remassist <<SUDO
# Exactly two privileged operations, no more (§12.2).
deploy      ALL=(root) NOPASSWD: /usr/bin/systemctl restart remassist, /usr/bin/systemctl reload nginx
$ADMIN_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart remassist, /usr/bin/systemctl reload nginx
SUDO
chmod 440 /etc/sudoers.d/remassist
visudo -cf /etc/sudoers.d/remassist
systemctl daemon-reload
systemctl enable remassist >/dev/null 2>&1 || true

# ── nginx (already installed on this image) ─────────────────────────────────
log "nginx"
command -v nginx >/dev/null || apt-get install -y -qq nginx >/dev/null
install -d -m 755 /etc/nginx/snippets
install -o root -g root -m 644 "$(dirname "$0")/remassist-common.conf" \
        /etc/nginx/snippets/remassist-common.conf
# Bootstrap (HTTP-only) until certbot has issued; Phase 5 swaps in nginx.conf.
install -o root -g root -m 644 "$(dirname "$0")/nginx-bootstrap.conf" \
        /etc/nginx/sites-available/remassist
ln -sfn /etc/nginx/sites-available/remassist /etc/nginx/sites-enabled/remassist
# The stock welcome page is also a default_server; two of them is a config error.
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── Firewall (§4.1) ─────────────────────────────────────────────────────────
log "Firewall"
ufw --force default deny incoming >/dev/null
ufw --force default allow outgoing >/dev/null
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp  >/dev/null
ufw allow 443/tcp >/dev/null
# Postgres is deliberately absent.
ufw --force enable >/dev/null
ufw status numbered | sed 's/^/  /'

systemctl enable --now fail2ban >/dev/null 2>&1 || true

log "Provisioned"
cat <<'NEXT'
  Next:
    1. ./tools/deploy.sh          (from your laptop — builds and activates)
    2. verify over HTTP with curl --resolve
    3. DNS cutover, then certbot, then deploy/nginx.conf
    4. sudo bash deploy/harden-ssh.sh
NEXT
