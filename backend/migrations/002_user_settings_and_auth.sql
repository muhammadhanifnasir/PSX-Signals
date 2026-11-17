-- ==============================================================================
-- PSX Signal Intelligence - User Profiles & Settings Migration
-- ==============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(128) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'trader',
    display_name VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

CREATE TABLE IF NOT EXISTS user_settings (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    theme VARCHAR(16) NOT NULL DEFAULT 'dark',
    default_capital NUMERIC(14, 2) NOT NULL DEFAULT 1000000.00,
    default_risk_pct NUMERIC(6, 2) NOT NULL DEFAULT 1.50,
    default_timeframe VARCHAR(16) NOT NULL DEFAULT '15m',
    sound_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    telegram_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    browser_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    auto_refresh_interval_sec INTEGER NOT NULL DEFAULT 5,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
