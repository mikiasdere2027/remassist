#!/usr/bin/env bash
#
# backup.sh — nightly logical dump of the Rem Assist database.
#
# Installed at /srv/remassist/shared/backup.sh, run by deploy's crontab:
#   0 3 * * *  /srv/remassist/shared/backup.sh >> /srv/backups/backup.log 2>&1
#
# MIGRATION-PLAN.md §4.6. A VPS snapshot is not this: a snapshot cannot restore
# one dropped table, and it is useless if the corruption predates it.

set -euo pipefail

DEST="${BACKUP_DEST:-/srv/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
RCLONE_REMOTE="${BACKUP_RCLONE_REMOTE:-}"   # e.g. b2:remassist-backups
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$DEST/remassist-$STAMP.dump"

set -a
. /srv/remassist/shared/.env
set +a

mkdir -p "$DEST"

pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --file="$FILE"
echo "$(date -Is)  wrote $FILE ($(du -h "$FILE" | cut -f1))"

# Prove it is not a zero-byte file pretending to be a backup.
pg_restore --list "$FILE" >/dev/null || { echo "DUMP IS UNREADABLE — $FILE" >&2; exit 1; }

find "$DEST" -name 'remassist-*.dump' -mtime "+$KEEP_DAYS" -delete

if [ -n "$RCLONE_REMOTE" ] && command -v rclone >/dev/null; then
  rclone copy "$FILE" "$RCLONE_REMOTE/"
  echo "$(date -Is)  copied offsite to $RCLONE_REMOTE"
else
  # Local-only backups die with the VPS. Say so every night rather than let it
  # be a comfortable assumption.
  echo "$(date -Is)  WARNING: no offsite copy (BACKUP_RCLONE_REMOTE unset)" >&2
fi
