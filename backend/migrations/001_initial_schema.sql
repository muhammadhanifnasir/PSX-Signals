-- ==============================================================================
-- PSX Signal Intelligence - Production Database Schema (PostgreSQL / Supabase)
-- Version: 1.0.0
-- ==============================================================================

-- 1. Symbol Universe
CREATE TABLE IF NOT EXISTS symbol_universe (
    symbol VARCHAR(16) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    sector VARCHAR(64) NOT NULL DEFAULT 'Equities',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_kse100 BOOLEAN NOT NULL DEFAULT FALSE,
    min_volume_threshold BIGINT NOT NULL DEFAULT 50000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_symbol_universe_active ON symbol_universe(is_active);
CREATE INDEX IF NOT EXISTS idx_symbol_universe_sector ON symbol_universe(sector);

-- 2. Market Quotes & Price Observations
CREATE TABLE IF NOT EXISTS market_quotes (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(16) NOT NULL REFERENCES symbol_universe(symbol) ON DELETE CASCADE,
    last_price NUMERIC(12, 2) NOT NULL,
    change NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    change_percent NUMERIC(8, 4) NOT NULL DEFAULT 0.00,
    open_price NUMERIC(12, 2),
    high_price NUMERIC(12, 2),
    low_price NUMERIC(12, 2),
    volume BIGINT NOT NULL DEFAULT 0,
    vwap NUMERIC(12, 2),
    data_source VARCHAR(32) NOT NULL DEFAULT 'PSX_DATA_PORTAL',
    is_delayed BOOLEAN NOT NULL DEFAULT TRUE,
    delay_minutes INTEGER NOT NULL DEFAULT 15,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_market_quotes_symbol_time ON market_quotes(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_quotes_timestamp ON market_quotes(timestamp DESC);

-- 3. Data Source Connection Logs & Audit
CREATE TABLE IF NOT EXISTS data_source_logs (
    id BIGSERIAL PRIMARY KEY,
    source_name VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    symbols_received INTEGER NOT NULL DEFAULT 0,
    data_delay_minutes INTEGER NOT NULL DEFAULT 15,
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_data_logs_source_time ON data_source_logs(source_name, timestamp DESC);

-- 4. Market Scanner Runs
CREATE TABLE IF NOT EXISTS scan_runs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    universe_size INTEGER NOT NULL DEFAULT 0,
    scanned_count INTEGER NOT NULL DEFAULT 0,
    passed_filters_count INTEGER NOT NULL DEFAULT 0,
    execution_time_seconds NUMERIC(8, 3) NOT NULL DEFAULT 0.00,
    data_freshness_status VARCHAR(32) NOT NULL DEFAULT 'FRESH'
);

CREATE INDEX IF NOT EXISTS idx_scan_runs_timestamp ON scan_runs(timestamp DESC);

-- 5. Market Scanner Opportunities
CREATE TABLE IF NOT EXISTS scan_opportunities (
    id VARCHAR(64) PRIMARY KEY,
    run_id VARCHAR(64) REFERENCES scan_runs(id) ON DELETE CASCADE,
    symbol VARCHAR(16) NOT NULL REFERENCES symbol_universe(symbol) ON DELETE CASCADE,
    company_name VARCHAR(128),
    sector VARCHAR(64),
    last_price NUMERIC(12, 2) NOT NULL,
    price_change_percent NUMERIC(8, 4) NOT NULL,
    volume BIGINT NOT NULL,
    relative_volume NUMERIC(8, 2) NOT NULL,
    vwap NUMERIC(12, 2) NOT NULL,
    ema_trend VARCHAR(32) NOT NULL,
    rsi NUMERIC(8, 2) NOT NULL,
    atr NUMERIC(12, 2) NOT NULL,
    momentum_score INTEGER NOT NULL,
    opportunity_score INTEGER NOT NULL,
    setup_type VARCHAR(32) NOT NULL,
    support_level NUMERIC(12, 2),
    resistance_level NUMERIC(12, 2),
    data_freshness_status VARCHAR(32) NOT NULL DEFAULT 'FRESH',
    is_watchlisted BOOLEAN NOT NULL DEFAULT FALSE,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_opps_run_score ON scan_opportunities(run_id, opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_scan_opps_symbol ON scan_opportunities(symbol);

-- 6. Systematic Trading Signals
CREATE TABLE IF NOT EXISTS trading_signals (
    id VARCHAR(64) PRIMARY KEY,
    symbol VARCHAR(16) NOT NULL REFERENCES symbol_universe(symbol) ON DELETE CASCADE,
    company_name VARCHAR(128),
    sector VARCHAR(64),
    strategy_name VARCHAR(64) NOT NULL,
    strategy_version VARCHAR(16) NOT NULL DEFAULT '1.0.0',
    signal_type VARCHAR(32) NOT NULL,
    action VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    current_price NUMERIC(12, 2) NOT NULL,
    entry_zone_low NUMERIC(12, 2) NOT NULL,
    entry_zone_high NUMERIC(12, 2) NOT NULL,
    entry_price NUMERIC(12, 2) NOT NULL,
    stop_loss NUMERIC(12, 2) NOT NULL,
    target_1 NUMERIC(12, 2) NOT NULL,
    target_2 NUMERIC(12, 2) NOT NULL,
    target_3 NUMERIC(12, 2),
    risk_reward_ratio NUMERIC(8, 2) NOT NULL,
    potential_gain_target_1_pct NUMERIC(8, 2) NOT NULL,
    potential_gain_target_2_pct NUMERIC(8, 2) NOT NULL,
    max_risk_pct NUMERIC(8, 2) NOT NULL,
    opportunity_score INTEGER NOT NULL,
    score_breakdown_json TEXT NOT NULL,
    conditions_met_json TEXT NOT NULL,
    vwap NUMERIC(12, 2) NOT NULL,
    ema_9 NUMERIC(12, 2) NOT NULL,
    ema_21 NUMERIC(12, 2) NOT NULL,
    rsi NUMERIC(8, 2) NOT NULL,
    relative_volume NUMERIC(8, 2) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_expired BOOLEAN NOT NULL DEFAULT FALSE,
    is_invalidated BOOLEAN NOT NULL DEFAULT FALSE,
    data_timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trading_signals_symbol_status ON trading_signals(symbol, status);
CREATE INDEX IF NOT EXISTS idx_trading_signals_created ON trading_signals(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_signals_score ON trading_signals(opportunity_score DESC);

-- 7. Signal Lifecycle Audit Trail
CREATE TABLE IF NOT EXISTS signal_lifecycle_events (
    id BIGSERIAL PRIMARY KEY,
    signal_id VARCHAR(64) NOT NULL REFERENCES trading_signals(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL,
    previous_state VARCHAR(32),
    new_state VARCHAR(32),
    price_at_event NUMERIC(12, 2) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_signal_events_signal_time ON signal_lifecycle_events(signal_id, timestamp DESC);

-- 8. Historical OHLCV Daily Bars
CREATE TABLE IF NOT EXISTS historical_ohlcv_daily (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(16) NOT NULL REFERENCES symbol_universe(symbol) ON DELETE CASCADE,
    date DATE NOT NULL,
    open NUMERIC(12, 2) NOT NULL,
    high NUMERIC(12, 2) NOT NULL,
    low NUMERIC(12, 2) NOT NULL,
    close NUMERIC(12, 2) NOT NULL,
    volume BIGINT NOT NULL,
    turnover_pkr NUMERIC(16, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_historical_ohlcv_symbol_date ON historical_ohlcv_daily(symbol, date ASC);

-- 9. Backtest Simulations
CREATE TABLE IF NOT EXISTS backtest_runs (
    id VARCHAR(64) PRIMARY KEY,
    strategy_name VARCHAR(64) NOT NULL,
    run_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    config_json TEXT NOT NULL,
    metrics_json TEXT NOT NULL,
    trades_json TEXT NOT NULL,
    equity_curve_json TEXT NOT NULL,
    assumptions_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_backtest_runs_timestamp ON backtest_runs(run_timestamp DESC);

-- 10. Trade Journal & Quantitative Accounting
CREATE TABLE IF NOT EXISTS trade_journal (
    id VARCHAR(64) PRIMARY KEY,
    symbol VARCHAR(16) NOT NULL,
    company_name VARCHAR(128),
    sector VARCHAR(64),
    direction VARCHAR(8) NOT NULL DEFAULT 'BUY',
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    quantity INTEGER NOT NULL,
    entry_price NUMERIC(12, 2) NOT NULL,
    entry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    stop_loss NUMERIC(12, 2),
    target_1 NUMERIC(12, 2),
    target_2 NUMERIC(12, 2),
    exit_price NUMERIC(12, 2),
    exit_date TIMESTAMP WITH TIME ZONE,
    exit_reason VARCHAR(32),
    strategy VARCHAR(64),
    setup_type VARCHAR(32),
    signal_id VARCHAR(64),
    position_value NUMERIC(14, 2) NOT NULL,
    brokerage_commission_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.15,
    total_charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gross_pnl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    net_pnl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    return_percent NUMERIC(8, 4) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trade_journal_status ON trade_journal(status, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_trade_journal_symbol ON trade_journal(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_journal_signal ON trade_journal(signal_id);

-- 11. Portfolio Risk Settings
CREATE TABLE IF NOT EXISTS risk_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    trading_capital NUMERIC(14, 2) NOT NULL DEFAULT 1000000.00,
    max_risk_per_trade_pct NUMERIC(6, 2) NOT NULL DEFAULT 1.50,
    max_daily_loss_pct NUMERIC(6, 2) NOT NULL DEFAULT 3.00,
    max_open_positions INTEGER NOT NULL DEFAULT 5,
    max_sector_exposure_pct NUMERIC(6, 2) NOT NULL DEFAULT 30.00,
    max_single_position_pct NUMERIC(6, 2) NOT NULL DEFAULT 25.00,
    commission_rate_pct NUMERIC(6, 4) NOT NULL DEFAULT 0.15,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. User Watchlist
CREATE TABLE IF NOT EXISTS user_watchlist (
    symbol VARCHAR(16) PRIMARY KEY REFERENCES symbol_universe(symbol) ON DELETE CASCADE,
    notes TEXT,
    alert_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Alert & Notification Settings
CREATE TABLE IF NOT EXISTS alert_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    telegram_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    telegram_bot_token TEXT,
    telegram_chat_id VARCHAR(64),
    min_alert_score INTEGER NOT NULL DEFAULT 75,
    alert_on_buy BOOLEAN NOT NULL DEFAULT TRUE,
    alert_on_target BOOLEAN NOT NULL DEFAULT TRUE,
    alert_on_stop_loss BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
