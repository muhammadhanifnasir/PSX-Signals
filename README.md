# PSX Signal Intelligence 📈🇵🇰

A professional, high-performance Pakistan Stock Exchange (PSX) market scanning, automated trading-signal research, quantitative backtesting, and trade journal platform.

> [!IMPORTANT]
> **REGULATORY & DATA DISCLOSURE**  
> PSX Signal Intelligence is designed exclusively for quantitative research, algorithmic scanning, and pre-trade analysis.
> 1. **Data Delay Transparency**: Market observations collected from the official PSX Data Portal are typically delayed by ~15 minutes in accordance with exchange distribution policies. Delayed data is explicitly labeled and never misrepresented as real-time tick feeds.
> 2. **No Automatic Order Placement**: The application does not route orders or interact directly with broker execution APIs (e.g., SCSTrade). All order execution must be conducted manually by the authorized account owner.
> 3. **No Profit Guarantee**: Quantitative scores, backtest metrics, and signal suggestions are mathematical risk-management models and do not guarantee future profitability.

---

## 🏗 System Architecture & Tech Stack

```
                          [ Internet / PSX Data Portal / Supabase ]
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │  Nginx Reverse Proxy     │
                               │  (SSL, Rate Limit, Gzip)  │
                               └─────────────┬─────────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      │                                             │
                      ▼ :3000                                       ▼ :8000
       ┌─────────────────────────────┐               ┌─────────────────────────────┐
       │   Next.js 16 App Router     │               │    FastAPI Python Engine    │
       │   - TypeScript & Tailwind   │ ◄── REST ───► │    - Async Background Tasks │
       │   - Lightweight Charts      │ ◄── WSS ────► │    - Rate Limit Middleware  │
       │   - Responsive Dark UI      │               │    - Security Headers (HSTS)│
       └─────────────────────────────┘               └──────────────┬──────────────┘
                                                                    │
                                      ┌─────────────────────────────┴─────────────────────────────┐
                                      │                                                           │
                                      ▼                                                           ▼
                       ┌─────────────────────────────┐                             ┌─────────────────────────────┐
                       │  SQLite Local Database      │                             │  Supabase PostgreSQL Sync   │
                       │  (backend/data/psx.db)      │                             │  (Cloud Database & Auth)    │
                       └─────────────────────────────┘                             └─────────────────────────────┘
```

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui design patterns, Lucide Icons
- **Charting**: TradingView Lightweight Charts (Interactive Candlestick, EMA overlays, VWAP, Volume Histograms)
- **Backend**: Python FastAPI with Pydantic v2 validation and async concurrency
- **Background Worker Manager**: Centralized scheduling for Market Data Collector, Market Scanner, and Signal Engine
- **Security & Protection**: Per-IP sliding-window rate limiting, HTTP security headers (nosniff, DENY, HSTS)
- **Real-Time Stream**: WebSockets (`/ws/live-signals`) with fallback to REST polling
- **Authentication**: Supabase Auth (GoTrue REST API) and standalone JWT Bearer token authentication
- **Databases**: SQLite (Zero-config local persistence) and Supabase PostgreSQL with automated schema migrations and indexes

---

## 🌟 Core Features & Modules

### 1. Market Data Engine (`/data-sources`)
- Multi-provider abstraction: PSX Public Portal scraper, CSV import provider, and future licensed API provider.
- Full PSX 30-share and KSE-100 symbol universe management.
- Data freshness monitor with automatic stale data rejection (>15m) to protect signal generation.

### 2. Automated Market Scanner (`/scanner`)
- Multi-indicator pipeline: Volume surge, RVOL, EMA 9/21 trend alignment, VWAP reclaim, RSI(14) bounds, ATR(14) volatility.
- Setup categorization: `BREAKOUT`, `PULLBACK`, `VWAP_RECLAIM`, `MOMENTUM_SURGE`.
- Real-time ranking with composite Opportunity Score (0–100).

### 3. Systematic Trading Signals (`/signals`)
- Momentum + Volume + VWAP + Breakout strategy engine.
- Generates `BUY CANDIDATE`, `WATCH`, `WAIT`, and `EXIT` states.
- Exact entry zones, structural stop-loss levels, Target 1 and Target 2 with risk-to-reward ratios ($1:R$).
- Duplicate prevention, time expiry, and signal invalidation tracking.

### 4. Interactive Stock Analysis (`/stock-analysis`)
- TradingView candlestick chart with volume histograms.
- Dynamic indicator overlays: EMA 9, EMA 21, intraday VWAP, RSI, ATR.
- Visual entry, stop-loss, and target price lines.
- One-click Watchlist management with real-time localStorage and database synchronization.

### 5. Historical Backtesting Lab (`/backtesting`)
- Chronological bar-by-bar progression across 2025–2026 historical daily data (488 bars).
- Zero look-ahead bias: future candle information is strictly isolated from past decision points.
- Real-world market frictions: configurable PSX brokerage commission (0.15%) and market slippage (0.10%).
- Full performance reporting: Win Rate, Profit Factor, Expectancy, Max Drawdown, Sharpe/Sortino ratios, and RFC 4180 CSV export.

### 6. Trade Journal & Risk Center (`/trade-journal` & `/risk-management`)
- **Trade Journal**: Manual trade logging, automatic brokerage deduction, trade closure with realized PnL, post-mortem notes, and CSV history downloads.
- **Risk Center**: Intelligent position sizing calculator ($\text{Shares} = \frac{\text{Capital} \times \text{Risk \%}}{\text{Entry} - \text{Stop Loss}}$), max risk per trade (1.5%), daily loss circuit breaker (3.0%), max open positions (5), and sector ceiling guards (30%).
- **Performance Analytics**: Mathematical expectancy, strategy breakdown comparison, and monthly accounting.

---

## 🚀 Azure Ubuntu 24 VPS Production Deployment

### Option A: Automated One-Click Deployment (Recommended)

1. Connect to your Azure Ubuntu 24 LTS VPS via SSH:
   ```bash
   ssh azureuser@your-vps-ip
   ```

2. Clone repository to `/var/www/psx-signals`:
   ```bash
   sudo mkdir -p /var/www/psx-signals
   sudo chown -R $USER:$USER /var/www/psx-signals
   git clone https://github.com/your-username/PSX-Signals.git /var/www/psx-signals
   cd /var/www/psx-signals
   ```

3. Configure your production environment variables:
   ```bash
   cp .env.production.example .env
   nano .env
   ```

4. Make deployment scripts executable and run:
   ```bash
   chmod +x deploy/scripts/*.sh start-prod.sh
   sudo ./deploy/scripts/deploy-ubuntu24.sh
   ```

5. Configure SSL certificates with Let's Encrypt:
   ```bash
   sudo certbot --nginx -d psxsignals.yourdomain.com
   ```

---

### Option B: Docker Compose Deployment

1. Ensure Docker and Docker Compose v2 are installed on Ubuntu 24:
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io docker-compose-v2
   sudo systemctl enable --now docker
   ```

2. Build and launch all three containers (`backend`, `frontend`, `nginx`):
   ```bash
   docker compose up -d --build
   ```

3. Verify container status and health:
   ```bash
   docker compose ps
   docker compose logs -f backend
   ```

---

### Option C: PM2 & Systemd Process Management

For environments running directly on the host without Docker:

```bash
# Backend Virtual Environment
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
python -m backend.app.db.migrate

# Frontend Build
cd frontend
npm install
npm run build
cd ..

# Start with PM2
pm2 start deploy/pm2/ecosystem.config.js
pm2 save
pm2 startup systemd
```

---

## 💾 Database Migrations & Disaster Recovery

### Applying Migrations
To execute database schema migrations and verify all 9 performance indexes:
```bash
python -m backend.app.db.migrate
```

### Automated Backup Script
Add a daily cron job to backup the database and configurations to `/var/backups/psx-signals`:
```bash
sudo ./deploy/scripts/backup.sh
```
To automate via cron (`crontab -e`):
```cron
0 2 * * * /var/www/psx-signals/deploy/scripts/backup.sh >> /var/log/psx-signals/backup.log 2>&1
```

### Disaster Recovery Restore
To restore from a backup snapshot:
```bash
sudo ./deploy/scripts/restore.sh /var/backups/psx-signals/psx_signals_backup_YYYYMMDD_HHMMSS.tar.gz
```

---

## 💻 Windows 10/11 Development Setup

### Quick Start:
Run the provided development launcher:
```powershell
.\start-dev.ps1
```

Or start both servers manually:

```powershell
# Terminal 1 - Backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
python -m backend.app.db.migrate
python backend/run.py

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Live Health & Monitoring Endpoint**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Default Trader Credentials**: `trader@psxsignals.com` / `admin123`

---

## 🧪 Automated Test Suite Execution

All test suites can be executed independently with zero external test runner dependencies:

```powershell
# 1. Full Production End-to-End Integration Suite
python backend/tests/test_production_integration.py

# 2. Authentication, Security Headers & Rate Limiting Suite
python backend/tests/test_auth_and_security.py

# 3. Trade Journal, Risk Center & PnL Accounting Suite
python backend/tests/test_journal_and_risk.py

# 4. Historical Backtesting & Strategy Lab Suite
python backend/tests/test_backtest.py

# 5. Frontend Production Type-Check & Build
npm --prefix frontend run build
```

---

## 📄 License & Disclaimer

This project is developed for quantitative research and educational analysis under the MIT License. Past backtested performance is no guarantee of future results. Strictly verify market conditions before committing real capital.
