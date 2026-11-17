#!/usr/bin/env bash
# ==============================================================================
# PSX Signal Intelligence - Azure Ubuntu 24 LTS Automated Deployment Script
# ==============================================================================
set -euo pipefail

echo "=================================================================="
echo "DEPLOYING PSX SIGNAL INTELLIGENCE ON UBUNTU 24 LTS VPS"
echo "=================================================================="

APP_DIR="/var/www/psx-signals"
LOG_DIR="/var/log/psx-signals"

# 1. Update OS packages
echo "[1/8] Updating Ubuntu 24 system packages..."
apt-get update -y
apt-get install -y --no-install-recommends \
    curl git sqlite3 build-essential nginx certbot python3-certbot-nginx \
    python3 python3-pip python3-venv ufw

# 2. Install Node.js 20 LTS
if ! command -v node &> /dev/null; then
    echo "[2/8] Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
npm install -g pm2

# 3. Setup UFW Firewall
echo "[3/8] Configuring UFW Firewall..."
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
ufw --force enable || true

# 4. Directory and permissions setup
echo "[4/8] Preparing application and log directories..."
mkdir -p "${APP_DIR}" "${LOG_DIR}" /var/backups/psx-signals
chown -R www-data:www-data "${LOG_DIR}"

# 5. Setup Python Virtual Environment & Dependencies
echo "[5/8] Setting up Python virtual environment..."
cd "${APP_DIR}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# 6. Database Migrations
echo "[6/8] Executing database schema migrations and indexing..."
python -m backend.app.db.migrate

# 7. Frontend Production Build
echo "[7/8] Installing frontend packages and building Next.js..."
cd "${APP_DIR}/frontend"
npm install
npm run build

# 8. Service Orchestration with PM2
echo "[8/8] Starting production services with PM2..."
cd "${APP_DIR}"
pm2 start deploy/pm2/ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root || true

# Nginx setup
echo "[INFO] Linking Nginx configuration..."
cp deploy/nginx/psx-signals.conf /etc/nginx/sites-available/psx-signals.conf
ln -sf /etc/nginx/sites-available/psx-signals.conf /etc/nginx/sites-enabled/psx-signals.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Health Check verification
echo "[INFO] Verifying local deployment health..."
sleep 3
curl -s http://127.0.0.1:8000/api/health | grep -q "status" && echo " Backend API: HEALTHY" || echo " Backend API check failed"
curl -s http://127.0.0.1:3000 | grep -q "PSX" && echo " Frontend UI: ONLINE" || echo " Frontend UI check failed"

echo "=================================================================="
echo "DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "To configure SSL certificates run:"
echo "  certbot --nginx -d your-psx-domain.com"
echo "=================================================================="
