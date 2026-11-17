#!/usr/bin/env bash
# ==============================================================================
# PSX Signal Intelligence - Production Disaster Recovery & Restore Script
# ==============================================================================
set -euo pipefail

if [ $# -eq 0 ]; then
    echo "Usage: $0 /var/backups/psx-signals/psx_signals_backup_YYYYMMDD_HHMMSS.tar.gz"
    exit 1
fi

BACKUP_ARCHIVE="$1"
APP_DIR="/var/www/psx-signals"
TMP_RESTORE="/tmp/psx_restore_$(date +%s)"

if [ ! -f "${BACKUP_ARCHIVE}" ]; then
    echo "[ERROR] Backup archive ${BACKUP_ARCHIVE} not found!"
    exit 1
fi

echo "[INFO] Extracting backup archive..."
mkdir -p "${TMP_RESTORE}"
tar -xzf "${BACKUP_ARCHIVE}" -C "${TMP_RESTORE}"

echo "[INFO] Halting services during restoration..."
systemctl stop psx-backend || pm2 stop psx-signals-backend || true

if [ -f "${TMP_RESTORE}/sqlite_dump.db" ]; then
    echo "[INFO] Restoring SQLite database..."
    mkdir -p "${APP_DIR}/backend/data"
    cp "${TMP_RESTORE}/sqlite_dump.db" "${APP_DIR}/backend/data/psx_market_data.db"
    chown -R www-data:www-data "${APP_DIR}/backend/data"
fi

if [ -f "${TMP_RESTORE}/.env" ]; then
    echo "[INFO] Restoring environment variables..."
    cp -n "${TMP_RESTORE}/.env" "${APP_DIR}/.env.restored"
fi

rm -rf "${TMP_RESTORE}"

echo "[INFO] Running database migrations on restored database..."
cd "${APP_DIR}"
"${APP_DIR}/venv/bin/python" -m backend.app.db.migrate

echo "[INFO] Restarting services..."
systemctl start psx-backend || pm2 restart psx-signals-backend || true

echo "[SUCCESS] Disaster recovery restoration complete."
