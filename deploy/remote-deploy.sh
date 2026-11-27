#!/usr/bin/env bash
#
# remote-deploy.sh — the half of a deploy that runs ON the VPS.
#
#   remote-deploy.sh <stamp> <source-tarball>
#
# Shipped and invoked by tools/deploy.sh; not run by hand. Runs as an ordinary
# user who is a member of the `deploy` group — the only privileged thing it
# does is `sudo systemctl restart remassist`, which /etc/sudoers.d/remassist
# grants explicitly and passwordlessly.
#
# MIGRATION-PLAN.md §12. The ordering matters and is not arbitrary: the backend
# check, tests and build all run BEFORE the symlink swap, so a failure of any of
# them leaves the previous release serving untouched. (Database migrations are
# the backend's: remassist-backend/scripts/deploy.sh, run first.)

set -euo pipefail

STAMP="${1:?usage: remote-deploy.sh <stamp> <source-tarball>}"
TARBALL="${2:?usage: remote-deploy.sh <stamp> <source-tarball>}"

APP_ROOT=/srv/remassist
SHARED="$APP_ROOT/shared"
RELEASES="$APP_ROOT/releases"
RELEASE="$RELEASES/$STAMP"
CURRENT="$APP_ROOT/current"
KEEP="${KEEP_RELEASES:-5}"
SKIP_TESTS="${SKIP_TESTS:-0}"
HEALTH_URL=""   # resolved after .env is sourced (PORT varies on the shared box)

log()  { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m  ! %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mDEPLOY FAILED:\033[0m %s\n' "$*" >&2; exit 1; }

START=$(date +%s)

# What we roll back to. Resolved before anything changes.
PREVIOUS=""
if [ -L "$CURRENT" ]; then PREVIOUS="$(readlink "$CURRENT")"; fi

[ -f "$SHARED/.env" ] || fail "$SHARED/.env is missing — run the Phase 2 provisioning first"

AVAIL_GB=$(df -BG --output=avail "$APP_ROOT" | tail -1 | tr -dc '0-9')
[ "${AVAIL_GB:-0}" -lt 4 ] && warn "only ${AVAIL_GB}G free on $APP_ROOT — a build plus five releases wants more"

# ── Unpack ──────────────────────────────────────────────────────────────────
log "Unpacking release $STAMP"
mkdir -p "$RELEASE"
tar -xzf "$TARBALL" -C "$RELEASE"
rm -f "$TARBALL"

# ── Uploads live in shared/, never in a release ──────────────────────────────
# 142 MB of interview video. Copying it into every release would cost 710 MB
# across the five we keep, and re-uploading it on every deploy would make a
# one-line copy change a 150 MB transfer.
mkdir -p "$SHARED/uploads"
if [ -d "$RELEASE/public/uploads" ] && [ ! -L "$RELEASE/public/uploads" ]; then
  if [ -z "$(ls -A "$SHARED/uploads" 2>/dev/null)" ]; then
    log "Seeding shared/uploads from this release (first deploy)"
    # Do not `set -e` on this: cp -a tries to preserve timestamps on the
    # target dir, which a non-owner cannot do, and that metadata warning makes
    # cp exit non-zero even though all the files were copied. The files landing
    # is what matters on a shared box where shared/uploads is group-writable
    # but not owned by the deploying user.
    cp -a "$RELEASE/public/uploads/." "$SHARED/uploads/" || true
  else
    warn "release carried public/uploads but shared/uploads is already populated — keeping shared"
  fi
  rm -rf "$RELEASE/public/uploads"
fi
# lib/interviews.test.ts reads public/uploads/Interviews off the disk, so the
# link has to exist before the test step, not after it.
ln -sfn "$SHARED/uploads" "$RELEASE/public/uploads"

cd "$RELEASE"

# ── Install ─────────────────────────────────────────────────────────────────
# Before loading .env, deliberately: that file sets NODE_ENV=production, and
# npm would then skip devDependencies — leaving no typescript, no eslint and no
# vitest to build or test with.
log "npm ci"
npm ci --no-audit --no-fund

# ── Verify ──────────────────────────────────────────────────────────────────
if [ "$SKIP_TESTS" = "1" ]; then
  warn "skipping lint / typecheck / test (SKIP_TESTS=1)"
else
  log "lint"       ; npm run lint
  log "typecheck"  ; npm run typecheck
  log "test"       ; npm test
fi

# ── Build ───────────────────────────────────────────────────────────────────
# NEXT_PUBLIC_* are inlined into the client bundle at build time, so the build
# must see them. Everything else in the file is harmless here.
#
# This ordering is load-bearing for analytics, and silently so. NEXT_PUBLIC_GTM_ID,
# NEXT_PUBLIC_GA_ID and NEXT_PUBLIC_ANALYTICS_ENV are read by
# lib/analytics/events.ts and by the two loaders in components/analytics/, all
# of it client code: if they are absent from the environment *at build time*
# they are compiled away to undefined, no tag is even emitted into the page,
# every event is dropped, and nothing logs an error on the box or in the
# browser. Build somewhere other than here — CI, a laptop,
# a Docker layer that does not source shared/.env — and measurement goes dark
# while the deploy reports success.
set -a
# shellcheck disable=SC1091
. "$SHARED/.env"
set +a

# ── The backend must be up BEFORE the build ─────────────────────────────────
# This app no longer owns a database: migrations, seeds and every admin write
# live in the backend (remassist-backend, Docker; its scripts/deploy.sh). It has
# to be deployed FIRST, for two reasons:
#   1. `next build` prerenders /faq, /reviews, /blog/[slug] and /pricing from the
#      API. With the API down they would be built from the bundled seed content
#      and the deploy would report success on stale pages.
#   2. A release that needs a new endpoint must find it already there.
# API_URL and REVALIDATE_SECRET come from shared/.env (the secret is shared with
# the backend so its content edits can refresh pages without a rebuild).
[ -n "${API_URL:-}" ] || fail "API_URL is not set in $SHARED/.env (e.g. http://127.0.0.1:4000)"
[ -n "${REVALIDATE_SECRET:-}" ] || warn "REVALIDATE_SECRET is not set in $SHARED/.env — content edits will only reach the site on its hourly refresh"
if [ "${SKIP_API_CHECK:-0}" = "1" ]; then
  warn "skipping the backend check (SKIP_API_CHECK=1)"
else
  log "Backend ready? ($API_URL)"
  api_ok=0
  for _ in $(seq 1 15); do
    if curl -fsS -o /dev/null -m 5 "${API_URL%/}/v1/health/ready"; then api_ok=1; break; fi
    sleep 2
  done
  [ "$api_ok" = 1 ] || fail "the backend does not answer at $API_URL/v1/health/ready — deploy it first (remassist-backend: scripts/deploy.sh)"
fi

log "next build"
npm run build

# `next build` emits .next/standalone without public/ or .next/static; this is
# the tool that completes it. CI guards the same step.
# The uploads symlink comes out first: package-standalone's copyDir() sees a
# symlink as not-a-directory and would try copyFileSync on it (EISDIR).
rm -f "$RELEASE/public/uploads"
log "package standalone"
node tools/package-standalone.js
ln -sfn "$SHARED/uploads" "$RELEASE/public/uploads"
ln -sfn "$SHARED/uploads" "$RELEASE/.next/standalone/public/uploads"

# The smoke test hits the port the app is actually bound to. On the shared
# box PORT=3002 (see provision-isolated.sh); the dedicated runbook used 3000.
# .env is sourced above with `set -a`, so PORT is in scope here.
HEALTH_URL="http://127.0.0.1:${PORT:-3000}/"

# ISR cache persists across releases, so a deploy does not start cold (§12.1).
# The standalone server's working directory is the standalone dir, so its cache
# is the one that matters.
mkdir -p "$SHARED/isr-cache"
rm -rf "$RELEASE/.next/standalone/.next/cache"
ln -sfn "$SHARED/isr-cache" "$RELEASE/.next/standalone/.next/cache"

# The root build cache is dead weight once the bundle is packaged — a fresh
# release directory gets no incremental benefit from it.
rm -rf "$RELEASE/.next/cache"

# ── Swap and restart ────────────────────────────────────────────────────────
# `current` points at the standalone bundle, not the release root: the systemd
# unit runs `node server.js` from WorkingDirectory=/srv/remassist/current, and
# server.js lives inside .next/standalone.
log "Activating release $STAMP"
ln -sfn "$RELEASE/.next/standalone" "$CURRENT"
sudo systemctl restart remassist

# ── Smoke test, with rollback ───────────────────────────────────────────────
log "Smoke test"
ok=0
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null -m 5 "$HEALTH_URL"; then ok=1; break; fi
  sleep 1
done

# The deep health check: the site is up AND it can reach the backend and its
# database. `/` renders fine with the API down (public pages fall back to the
# bundled seed content), so a plain page fetch would call a broken release good.
if [ "$ok" = 1 ]; then
  if ! curl -fsS -o /dev/null -m 8 "${HEALTH_URL%/}/api/health?deep=1"; then
    warn "the site is up but cannot reach the backend — check API_URL in shared/.env and that the backend is running"
    ok=0
  fi
fi
# The admin sign-in page too: a public page by design, and the first thing a
# signed-out team member opens.
if [ "$ok" = 1 ]; then
  if ! curl -fsS -o /dev/null -m 5 "${HEALTH_URL%/}/admin/signin"; then
    warn "/ is up but /admin/signin is not"
    ok=0
  fi
fi

if [ "$ok" != 1 ]; then
  if [ -n "$PREVIOUS" ]; then
    warn "smoke test failed — rolling back to $PREVIOUS"
    ln -sfn "$PREVIOUS" "$CURRENT"
    sudo systemctl restart remassist
    journalctl -u remassist -n 40 --no-pager || true
    fail "rolled back; the site is on the previous release"
  fi
  journalctl -u remassist -n 40 --no-pager || true
  fail "smoke test failed and there is no previous release to fall back to"
fi

# ── Prune ───────────────────────────────────────────────────────────────────
# node_modules is ~600 MB per release and is only needed to build and test that
# release, so older ones can drop it.
for old in $(ls -1dt "$RELEASES"/*/ 2>/dev/null | tail -n +2); do
  rm -rf "${old}node_modules"
done
ls -1dt "$RELEASES"/*/ 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -rf

printf '\n\033[1;32mDeployed %s in %ss\033[0m\n' "$STAMP" "$(( $(date +%s) - START ))"
df -h "$APP_ROOT" | tail -1
