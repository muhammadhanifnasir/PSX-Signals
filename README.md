# PSX Signal Intelligence 📈🇵🇰

A professional, high-performance Pakistan Stock Exchange (PSX) market scanning, automated trading-signal research, and quantitative analytics platform.

> [!IMPORTANT]
> **RESEARCH & SIMULATION NOTICE**  
> All market data, prices, signals, and volumes presented in this development version are **simulated and realistic mock data** designed specifically for algorithmic research, backtesting, and UI development. **They are NOT live official PSX data feeds** and must not be used for unverified financial transactions.

---

## 🛠 Tech Stack

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui design patterns, Lucide Icons
- **Charting**: TradingView Lightweight Charts (Interactive Candlestick & Volume Histograms)
- **Backend**: Python FastAPI with Pydantic v2 validation and async concurrency
- **Real-time Engine**: WebSockets (`/ws/live-signals`) with graceful automatic REST polling fallback
- **Database**: Supabase PostgreSQL schema (`backend/schema.sql`) with in-memory fallback
- **Platform**: Fully tuned and verified for Windows 10 & 11

---

## 🚀 Quick Start (Windows 10 / 11)

### Option 1: One-Click Development Launchers

Double-click or run either of the provided development scripts from the project root:

- **Batch Launcher**:
  ```cmd
  start-dev.bat
  ```
- **PowerShell Launcher**:
  ```powershell
  .\start-dev.ps1
  ```

Both servers will launch in parallel:
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend & Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Real-Time WebSocket Stream**: `ws://localhost:8000/ws/live-signals`

---

### Option 2: Manual Step-by-Step Setup

#### 1. Prerequisites Check
Ensure you have installed:
- **Node.js**: v18+ or v20+ (Node v25+ also supported)
- **Python**: v3.10+ (Tested on Python 3.14)
- **Git**

#### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```cmd
copy .env.example .env
```

#### 3. Backend Setup (FastAPI)
Open a terminal in the project root:
```cmd
python -m pip install -r backend/requirements.txt
python backend/run.py
```
*The backend starts at `http://localhost:8000`.*

#### 4. Frontend Setup (Next.js)
Open a second terminal window:
```cmd
cd frontend
npm install
npm run dev
```
*The web dashboard starts at `http://localhost:3000`.*

---

## 📊 Application Architecture & Features

### 1. Trading Dashboard (`/`)
- **Top 6 Metric Cards**:
  1. **Market Status**: OPEN/CLOSED indicator, advances/declines market breadth visualization.
  2. **KSE-100**: Current index level, net change, percentage, and total traded volume.
  3. **Stocks Scanned**: Coverage of all 388 listed PSX main-board equities.
  4. **Active Signals**: Real-time tally of algorithmic Buy/Sell triggers.
  5. **Strong Opportunities**: Top high-conviction risk/reward opportunities.
  6. **Data Freshness**: Stream latency counter with timestamp.
- **Interactive TradingView Lightweight Charts**:
  - Switch between top PSX equities: `KSE-100`, `AIRLINK`, `ATRL`, `LUCK`, `OGDC`, `HUBC`, `SYS`.
  - Candlesticks + volume histograms with crosshairs and responsive scaling.
- **Signal Overview Table**:
  - Filterable by `All`, `Buys Only`, `Sells Only`.
  - Calculated Entry Price, Stop Loss, Target 1, Target 2, Risk/Reward ratio, and Volume Surge.
  - Interactive "Thesis" modal with fundamental catalysts and quantitative drivers.
- **Top Opportunities & Market Movers Panels**:
  - High-conviction setups with expected ROI and risk levels.
  - Tabs for Top Gainers, Losers, and Volume Leaders.

### 2. Full Sidebar Navigation
1. **Dashboard** (`/`): Real-time trading terminal overview.
2. **Market Scanner** (`/scanner`): Multi-factor scanner filtering by minimum confidence score and chart pattern (Breakouts, Double Bottoms, Cup & Handle, etc.).
3. **Signals** (`/signals`): Dedicated signals discovery hub.
4. **Stock Analysis** (`/stock-analysis`): Fundamental ratios (P/E, Dividend Yield), technical momentum, and KMI-30 Shariah compliance checks.
5. **Watchlist** (`/watchlist`): Custom stock watchlist with target buy triggers and price alerts.
6. **Strategy Lab** (`/strategy-lab`): Algorithmic model parameter tuning (RSI thresholds, volume multipliers, timeframes).
7. **Backtesting** (`/backtesting`): 2-year simulation analytics including Sharpe ratio, max drawdown, and win rate.
8. **Trade Journal** (`/trade-journal`): Execution tracking with realized PnL in PKR.
9. **Risk Management** (`/risk-management`): Position sizing rules (1.5% max risk) and sector concentration limits.
10. **Data Sources** (`/data-sources`): Connection monitoring for WebSocket streams and Supabase PostgreSQL.
11. **Settings** (`/settings`): Custom endpoint ports, audible alerts, and notification thresholds.

---

## 🗄 Database Setup (Supabase PostgreSQL)

The schema is defined in [backend/schema.sql](file:///d:/2.%20GiHub%20Repositories/Autotrading/PSX-Signals/backend/schema.sql).

To deploy into Supabase:
1. Log in to your [Supabase Dashboard](https://supabase.com).
2. Open the **SQL Editor**.
3. Copy and paste the contents of `backend/schema.sql`.
4. Run the script. It creates:
   - `stocks` table with top PSX seed companies.
   - `signals` table with indexes on confidence and status.
   - `watchlist`, `trade_journal`, and `scanner_runs` tables.
5. Add your `SUPABASE_URL` and `SUPABASE_KEY` to `.env`.

*Note: If Supabase credentials are not provided, the platform automatically runs in graceful in-memory simulation mode.*

---

## 🔧 Windows 10 Troubleshooting

- **PowerShell Script Execution**:  
  If `start-dev.ps1` gives an execution policy error, run:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```
- **Port Conflicts (8000 or 3000)**:  
  Change `PORT=8001` in `.env` and `PORT=3001` for Next.js if ports 8000/3000 are in use by another project.

---

## 🛡 Disclaimer
This software is built for educational, quantitative research, and UI development purposes. Stock market trading involves substantial risk of loss. Always consult licensed financial professionals before trading on the Pakistan Stock Exchange.
