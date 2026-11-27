#!/usr/bin/env bash
#
# run-sla-monthly.sh — post the monthly commission reconciliation summary.
# Crontab (with CRON_TZ=America/New_York):
#   0 9 1 * *  bash /srv/remassist/current/../../deploy/run-sla-monthly.sh >> /tmp/rem-sla-monthly.log 2>&1
#
#   bash run-sla-monthly.sh --dry      # inspect JSON without posting to Slack

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
echo "$(date -u +%FT%TZ) $(curl -fsS --max-time 60 -X POST -H "x-cron-secret: $SECRET" "http://127.0.0.1:$PORT/api/cron/sla-monthly$Q")"
