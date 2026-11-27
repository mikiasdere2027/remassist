#!/usr/bin/env bash
#
# run-sla-watchdog.sh — run the 5-minute SLA breach & coverage-gap watchdog.
# Crontab:
#   */5 * * * *  bash /srv/remassist/current/../../deploy/run-sla-watchdog.sh >> /tmp/rem-sla-watchdog.log 2>&1
#
#   bash run-sla-watchdog.sh --dry     # inspect JSON without posting alerts or opening incidents

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
echo "$(date -u +%FT%TZ) $(curl -fsS --max-time 60 -X POST -H "x-cron-secret: $SECRET" "http://127.0.0.1:$PORT/api/cron/sla-watchdog$Q")"
