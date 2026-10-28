#!/usr/bin/env bash
# Usage: ./scripts/backup-db.sh
# Requires: pg_dump, DATABASE_URL in environment or .env
#
# Backs up the database and the uploaded documents folder (UPLOADS_DIR,
# default: <backend>/uploads). Backup files are kept locally forever.
# IT: fill in one of the transfer options in the TODO block below
# once the second server access method is confirmed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if present
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

: "${DATABASE_URL:?DATABASE_URL is required}"

# Prisma's ?schema=public parameter is not a libpq option and makes pg_dump
# reject the URL, so strip it before dumping.
PG_URL=$(printf '%s' "$DATABASE_URL" | sed -E 's/([?&])schema=[^&]*&?/\1/; s/[?&]$//')

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/procurement_$TIMESTAMP.sql.gz"

echo "[backup] Starting pg_dump → $BACKUP_FILE"
if ! pg_dump "$PG_URL" | gzip > "$BACKUP_FILE"; then
  rm -f "$BACKUP_FILE" # don't leave a truncated file that looks like a backup
  echo "[backup] ERROR: pg_dump failed" >&2
  exit 1
fi
echo "[backup] Local backup complete: $BACKUP_FILE"

# Uploaded documents live on disk, not in the database, so archive them too.
UPLOADS_DIR="${UPLOADS_DIR:-$ROOT_DIR/uploads}"
UPLOADS_FILE="$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz"
if [ -d "$UPLOADS_DIR" ]; then
  tar -czf "$UPLOADS_FILE" -C "$UPLOADS_DIR" .
  echo "[backup] Uploads archived: $UPLOADS_FILE"
else
  UPLOADS_FILE=""
  echo "[backup] WARN: uploads directory not found at $UPLOADS_DIR — skipping"
fi

# ---------------------------------------------------------------------------
# TODO (IT): Off-server transfer
# ---------------------------------------------------------------------------
# Once IT confirms how the second server is accessible, uncomment ONE block.
#
# Option A — Mounted network share (NFS/SMB already mounted at $BACKUP_REMOTE_PATH):
#
#   REMOTE_PATH="${BACKUP_REMOTE_PATH:-}"
#   if [ -n "$REMOTE_PATH" ]; then
#     cp "$BACKUP_FILE" ${UPLOADS_FILE:+"$UPLOADS_FILE"} "$REMOTE_PATH/"
#     echo "[backup] Copied to mounted share: $REMOTE_PATH"
#   else
#     echo "[backup] WARN: BACKUP_REMOTE_PATH not set — skipping remote copy"
#   fi
#
# Option B — rsync over SSH (SSH key auth must already be configured):
#
#   REMOTE_PATH="${BACKUP_REMOTE_PATH:-}"   # e.g. backupuser@192.168.1.50:/backups/procurement
#   if [ -n "$REMOTE_PATH" ]; then
#     rsync -az --no-perms "$BACKUP_FILE" ${UPLOADS_FILE:+"$UPLOADS_FILE"} "$REMOTE_PATH/"
#     echo "[backup] Sent via rsync to: $REMOTE_PATH"
#   else
#     echo "[backup] WARN: BACKUP_REMOTE_PATH not set — skipping rsync"
#   fi
#
# ---------------------------------------------------------------------------

echo "[backup] Done."
