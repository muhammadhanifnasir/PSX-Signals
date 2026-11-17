#!/usr/bin/env bash
# ==============================================================================
# PSX Signal Intelligence - Production Backup Script (Ubuntu 24 VPS)
# ==============================================================================
set -euo pipefail

BACKUP_DIR="/var/backups/psx-signals"
APP_DIR="/var/www/psx-signals"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/psx_signals_backup_${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Starting PSX Signal Intelligence Backup at $(date)..."

# Create consistent SQLite snapshot
if [ -f "${APP_DIR}/backend/data/psx_market_data.db" ]; then
    sqlite3 "${APP_DIR}/backend/data/psx_market_data.db" ".backup '${BACKUP_DIR}/sqlite_dump.db'"
fi

# Package database snapshot, environment file, and migrations
tar -czf "${BACKUP_FILE}" \
    -C "${BACKUP_DIR}" sqlite_dump.db \
    -C "${APP_DIR}" .env backend/migrations

rm -f "${BACKUP_DIR}/sqlite_dump.db"

echo "[SUCCESS] Backup saved: ${BACKUP_FILE} ($(du -sh "${BACKUP_FILE}" | cut -f1))"

# Retention policy: remove backups older than 14 days
find "${BACKUP_DIR}" -type f -name "psx_signals_backup_*.tar.gz" -mtime +14 -exec rm -f {} \;
echo "[INFO] Cleaned up backups older than 14 days."
