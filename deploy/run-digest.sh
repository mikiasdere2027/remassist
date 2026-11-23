#!/usr/bin/env bash
#
# run-digest.sh — post the daily CRM digest to Slack. Run by cron on the VPS:
#
#   0 6 * * 1-5  bash /srv/remassist/current/../../deploy/run-digest.sh >> /tmp/rem-digest.log 2>&1
#
# (06:00 UTC = 09:00 in Addis Ababa, Monday to Friday.)
#
# The secret: CRON_SECRET from shared/.env if set, otherwise the same value
# the app derives from AUTH_SECRET (lib/crm/automation.ts cronSecret), so no
# one has to edit the environment. Calls the app directly on localhost, never
# through the public site.
#
#   bash run-digest.sh --dry     # print the digest, post nothing

set -euo pipefail
ENV_FILE="${ENV_FILE:-/srv/remassist/shared/.env}"
PORT="${PORT:-3002}"

val() { grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"; }

SECRET="$(val CRON_SECRET || true)"
if [ -z "$SECRET" ]; then
  AUTH="$(val AUTH_SECRET || true)"
  [ -n "$AUTH" ] || { echo "$(date -u +%FT%TZ) no CRON_SECRET or AUTH_SECRET in $ENV_FILE" >&2; exit 1; }
  SECRET="$(printf '%s' 'rem-assist-cron-v1' | openssl dgst -sha256 -hmac "$AUTH" -r | cut -d' ' -f1)"
fi

Q=""
[ "${1:-}" = "--dry" ] && Q="?dry=1"
echo "$(date -u +%FT%TZ) $(curl -fsS --max-time 60 -X POST -H "x-cron-secret: $SECRET" "http://127.0.0.1:$PORT/api/cron/digest$Q")"
