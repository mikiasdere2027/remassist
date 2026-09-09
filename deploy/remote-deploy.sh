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
# MIGRATION-PLAN.md §12. The ordering matters and is not arbitrary:
# tests and migrations both run BEFORE the symlink swap, so a failure of either
# leaves the previous release serving untouched.

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

# ── Migrate and seed, BEFORE the build ─────────────────────────────────────
# This has to precede `next build`, not follow it. /faq, /reviews and
# /blog/[slug] read these tables while prerendering — generateStaticParams
# queries `posts` — so building against an unmigrated database fails with
# `relation "posts" does not exist`. It did exactly that once; the build step
# aborts before the symlink swap, so the live site stayed on the previous
# release, which is the one thing that went right about it.
#
# The order this creates is worth being explicit about: the schema is changed
# while the OLD code is still serving. That is safe only because every
# migration here is additive — new tables, new nullable or defaulted columns —
# so code that predates them ignores them. A migration that drops or narrows
# anything would break the running release the moment it applied, and would
# need the change split into an expand step and a later contract step instead.
#
# The seed runs here too, for the same reason and one more: a build that
# prerenders /faq against empty tables produces pages with no content and
# reports success.
if [ -n "${DATABASE_URL:-}" ]; then
  log "drizzle-kit migrate"
  npx drizzle-kit migrate

  # Safe on every deploy by construction, not by care: both seeds are
  # insert-only and match on natural keys, so they add what is missing and
  # cannot overwrite anything edited in the admin.
  log "content seed"
  node db/seed-content.mjs

  # The rate tables were never seeded on the server, which is why the Rates
  # screen read as empty there while the local database had figures in it. The
  # quote calculator does not read these yet — §6.3 — but the admin does, and
  # an empty price list on the box that serves the site is indistinguishable
  # from a broken one.
  log "rate seed"
  node db/seed-rates.mjs
else
  warn "DATABASE_URL unset — skipping migrations and seeds"
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

# The admin sign-in page, checked separately and only once the app is up.
#
# `/` renders fine with a broken admin: it touches no session and no Auth.js
# config. So a missing or empty AUTH_SECRET made Auth.js refuse to initialise,
# /admin answered 500, and this script still reported a successful deploy — the
# worst kind of green. AUTH_SECRET is written empty by provision.sh and has to
# be filled in by hand, so this is the likely failure, not a hypothetical one.
#
# A public page by design (signed-out visitors must reach it), so a 200 here
# discloses nothing that a browser could not already see.
if [ "$ok" = 1 ]; then
  if ! curl -fsS -o /dev/null -m 5 "${HEALTH_URL%/}/admin/signin"; then
    warn "/ is up but /admin/signin is not — check AUTH_SECRET in shared/.env"
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
# node_modules is ~600 MB per release and is only needed for a future
# drizzle-kit run, which only ever happens against the newest release.
for old in $(ls -1dt "$RELEASES"/*/ 2>/dev/null | tail -n +2); do
  rm -rf "${old}node_modules"
done
ls -1dt "$RELEASES"/*/ 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -rf

printf '\n\033[1;32mDeployed %s in %ss\033[0m\n' "$STAMP" "$(( $(date +%s) - START ))"
df -h "$APP_ROOT" | tail -1
