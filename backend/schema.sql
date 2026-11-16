-- ========================================================
-- PSX Signal Intelligence - Supabase PostgreSQL Schema
-- ========================================================

-- 1. STOCKS TABLE
CREATE TABLE IF NOT EXISTS stocks (
    symbol VARCHAR(12) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    is_shariah_compliant BOOLEAN DEFAULT TRUE,
    market_cap_pkr NUMERIC(18, 2),
    shares_outstanding NUMERIC(18, 2),
    pe_ratio NUMERIC(10, 2),
    dividend_yield NUMERIC(6, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SIGNALS TABLE
CREATE TABLE IF NOT EXISTS signals (
    id VARCHAR(50) PRIMARY KEY,
    symbol VARCHAR(12) REFERENCES stocks(symbol) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL')),
    strategy VARCHAR(100) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    current_price NUMERIC(12, 2) NOT NULL,
    entry_price NUMERIC(12, 2) NOT NULL,
    stop_loss NUMERIC(12, 2) NOT NULL,
    target_1 NUMERIC(12, 2) NOT NULL,
    target_2 NUMERIC(12, 2),
    target_3 NUMERIC(12, 2),
    risk_reward_ratio NUMERIC(5, 2) NOT NULL,
    potential_gain_percent NUMERIC(6, 2),
    max_loss_percent NUMERIC(6, 2),
    rsi_14 NUMERIC(6, 2),
    volume_surge_ratio NUMERIC(6, 2),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'TARGET_1_HIT', 'TARGET_2_HIT', 'STOPPED_OUT', 'EXPIRED')),
    catalyst_notes TEXT,
    is_mock BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL
);

-- 3. WATCHLIST TABLE
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(12) REFERENCES stocks(symbol) ON DELETE CASCADE,
    target_buy_price NUMERIC(12, 2),
    alert_on_signal BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TRADE JOURNAL TABLE
CREATE TABLE IF NOT EXISTS trade_journal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(12) REFERENCES stocks(symbol) ON DELETE CASCADE,
    signal_id VARCHAR(50) REFERENCES signals(id) ON DELETE SET NULL,
    trade_type VARCHAR(10) CHECK (trade_type IN ('BUY', 'SELL')),
    shares_quantity INTEGER NOT NULL,
    entry_price NUMERIC(12, 2) NOT NULL,
    exit_price NUMERIC(12, 2),
    stop_loss NUMERIC(12, 2),
    take_profit NUMERIC(12, 2),
    pnl_pkr NUMERIC(14, 2),
    pnl_percent NUMERIC(8, 2),
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),
    entry_date TIMESTAMPTZ DEFAULT NOW(),
    exit_date TIMESTAMPTZ,
    strategy_tag VARCHAR(100),
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SCANNER RUNS TABLE
CREATE TABLE IF NOT EXISTS scanner_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_timestamp TIMESTAMPTZ DEFAULT NOW(),
    total_scanned INTEGER NOT NULL,
    matches_count INTEGER NOT NULL,
    filter_criteria JSONB,
    results JSONB
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_confidence ON signals(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);
CREATE INDEX IF NOT EXISTS idx_trade_journal_status ON trade_journal(status);

-- SEED TOP PSX STOCKS
INSERT INTO stocks (symbol, name, sector, is_shariah_compliant, pe_ratio, dividend_yield)
VALUES 
    ('OGDC', 'Oil & Gas Development Co', 'Oil & Gas Exploration', TRUE, 4.8, 11.2),
    ('PPL', 'Pakistan Petroleum Limited', 'Oil & Gas Exploration', TRUE, 4.2, 9.5),
    ('HUBC', 'Hub Power Company Limited', 'Power Generation', TRUE, 4.9, 14.5),
    ('ENGRO', 'Engro Corporation', 'Fertilizer / Conglomerate', TRUE, 6.5, 8.5),
    ('LUCK', 'Lucky Cement Limited', 'Cement', TRUE, 7.8, 4.2),
    ('MCB', 'MCB Bank Limited', 'Commercial Banks', FALSE, 3.9, 12.8),
    ('UBL', 'United Bank Limited', 'Commercial Banks', FALSE, 4.1, 13.5),
    ('MEBL', 'Meezan Bank Limited', 'Islamic Banking', TRUE, 5.2, 10.5),
    ('PSO', 'Pakistan State Oil', 'Oil & Gas Marketing', TRUE, 5.8, 6.2),
    ('FFC', 'Fauji Fertilizer Company', 'Fertilizer', TRUE, 5.0, 15.0),
    ('SYS', 'Systems Limited', 'Technology & Comm.', TRUE, 16.5, 2.1),
    ('ATRL', 'Attock Refinery Limited', 'Refinery', TRUE, 3.4, 8.0),
    ('DGKC', 'D.G. Khan Cement', 'Cement', TRUE, 9.2, 3.0),
    ('PRL', 'Pakistan Refinery Limited', 'Refinery', TRUE, 4.5, 0.0),
    ('SEARL', 'The Searle Company', 'Pharmaceuticals', TRUE, 14.2, 2.5),
    ('AIRLINK', 'Air Link Communication', 'Technology', TRUE, 11.2, 3.5),
    ('PAEL', 'Pak Elektron Limited', 'Engineering', TRUE, 7.5, 2.0),
    ('CNERGY', 'Cnergyico PK Limited', 'Refinery', TRUE, 12.0, 0.0),
    ('TELE', 'Telecard Limited', 'Technology', TRUE, 8.5, 0.0),
    ('EFERT', 'Engro Fertilizers Limited', 'Fertilizer', TRUE, 6.8, 13.8)
ON CONFLICT (symbol) DO NOTHING;
