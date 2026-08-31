#!/usr/bin/env bash
#
# deploy.sh — ship this working tree to the VPS and activate it.
#
#   ./tools/deploy.sh                 # normal deploy
#   ./tools/deploy.sh --with-uploads  # force re-sending public/uploads (142 MB)
#   ./tools/deploy.sh --skip-tests    # emergency only; the box normally runs the suite
#
# Runs from Git Bash on Windows or any Linux shell. Talks to the host through
# the `remvps` alias in ~/.ssh/config; override with REMASSIST_HOST.
#
# The build happens ON the box, not here — `sharp` is a native module, so a
# Windows-built standalone bundle carries win32 binaries and next/image dies on
# the server. See deploy/README.md.

set -euo pipefail

HOST="${REMASSIST_HOST:-remvps}"
WITH_UPLOADS=0
SKIP_TESTS=0

for arg in "$@"; do
  case "$arg" in
    --with-uploads) WITH_UPLOADS=1 ;;
    --skip-tests)   SKIP_TESTS=1 ;;
    -h|--help)      sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $arg (try --help)" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAMP="$(date -u +%Y%m%d%H%M%S)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
NAME="remassist-src-$STAMP.tgz"
TARBALL="$TMP/$NAME"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }

# Uncommitted work is allowed — this ships the working tree, not a commit — but
# say so, because "why is my fix not live" usually ends here.
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  printf '\033[1;33m  ! working tree is dirty; deploying it as-is\033[0m\n'
fi
log "Deploying $(git rev-parse --short HEAD 2>/dev/null || echo '(no git)') to $HOST as $STAMP"

# First deploy? Then the video has to go up, whatever the flags say.
if [ "$WITH_UPLOADS" = 0 ]; then
  if ! ssh "$HOST" 'test -n "$(ls -A /srv/remassist/shared/uploads 2>/dev/null)"'; then
    printf '  shared/uploads is empty on %s — including public/uploads this time\n' "$HOST"
    WITH_UPLOADS=1
  fi
fi

EXCLUDES=(
  --exclude=./node_modules
  --exclude=./.next
  --exclude=./.git
  --exclude=./.playwright-mcp
  --exclude=./.claude
  --exclude=./dev.log
  --exclude=./.env
  --exclude=./.env.local
  --exclude=./.env.production
  --exclude=./.env.vercel        # the server has its own shared/.env
  --exclude=*.tsbuildinfo
)
if [ "$WITH_UPLOADS" = 0 ]; then
  EXCLUDES+=(--exclude=./public/uploads)   # already in shared/ on the box
fi

log "Packing source"
tar czf "$TARBALL" --warning=no-file-changed "${EXCLUDES[@]}" . || {
  # GNU tar exits 1 on "file changed as we read it", which is noise here.
  [ -s "$TARBALL" ] || { echo "tar produced nothing" >&2; exit 1; }
}
printf '  %s\n' "$(du -h "$TARBALL" | cut -f1) $NAME"

log "Uploading"
scp -q "$TARBALL" "$HOST:/tmp/$NAME"
scp -q "$ROOT/deploy/remote-deploy.sh" "$HOST:/tmp/remote-deploy-$STAMP.sh"

log "Building and activating on $HOST"
# The `sed` is insurance: .gitattributes pins these to LF, but a checkout on a
# machine without it would ship CRLF and the shebang becomes `bash`.
ssh "$HOST" "sed -i 's/\$//' /tmp/remote-deploy-$STAMP.sh; SKIP_TESTS=$SKIP_TESTS bash /tmp/remote-deploy-$STAMP.sh '$STAMP' '/tmp/$NAME'; rc=\$?; rm -f /tmp/remote-deploy-$STAMP.sh '/tmp/$NAME'; exit \$rc"
