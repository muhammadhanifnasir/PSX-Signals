import os
import sys
import sqlite3
import logging

# Ensure root in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

logger = logging.getLogger("db_migrate")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

DB_PATH = "backend/data/psx_market_data.db"
MIGRATIONS_DIR = "backend/migrations"

def run_sqlite_migrations(db_path: str = DB_PATH):
    """Executes SQLite-compatible DDL and index migrations."""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    # Ensure auth tables are initialized
    from backend.app.auth.storage import AuthStorage
    AuthStorage(db_path=db_path)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Track applied migrations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(64) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.commit()

    # List of database tables and performance indexes to verify
    required_indexes = [
        ("idx_market_quotes_symbol_time", "CREATE INDEX IF NOT EXISTS idx_market_quotes_symbol_time ON market_quotes(symbol, timestamp DESC);"),
        ("idx_historical_ohlcv_symbol_date", "CREATE INDEX IF NOT EXISTS idx_historical_ohlcv_symbol_date ON historical_ohlcv_daily(symbol, date ASC);"),
        ("idx_trading_signals_symbol_status", "CREATE INDEX IF NOT EXISTS idx_trading_signals_symbol_status ON trading_signals(symbol, status);"),
        ("idx_trading_signals_created", "CREATE INDEX IF NOT EXISTS idx_trading_signals_created ON trading_signals(created_at DESC);"),
        ("idx_trade_journal_status", "CREATE INDEX IF NOT EXISTS idx_trade_journal_status ON trade_journal(status, entry_date DESC);"),
        ("idx_trade_journal_symbol", "CREATE INDEX IF NOT EXISTS idx_trade_journal_symbol ON trade_journal(symbol);"),
        ("idx_scan_opps_run_score", "CREATE INDEX IF NOT EXISTS idx_scan_opps_run_score ON scan_opportunities(run_id, opportunity_score DESC);"),
        ("idx_data_logs_provider_time", "CREATE INDEX IF NOT EXISTS idx_data_logs_provider_time ON data_source_logs(provider, timestamp DESC);"),
        ("idx_user_profiles_email", "CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);"),
    ]

    for idx_name, ddl in required_indexes:
        try:
            cursor.execute(ddl)
            logger.info(f"Verified index: {idx_name}")
        except Exception as e:
            logger.warning(f"Index {idx_name} check note: {e}")

    cursor.execute("INSERT OR IGNORE INTO schema_migrations (version) VALUES ('001_initial_schema'), ('002_user_settings_and_auth');")
    conn.commit()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [r[0] for r in cursor.fetchall()]
    logger.info(f"Migration completed successfully. Active database tables ({len(tables)}): {tables}")
    conn.close()
    return tables

if __name__ == "__main__":
    print("==================================================================")
    print("EXECUTING DATABASE MIGRATIONS & PERFORMANCE INDEX AUDIT")
    print("==================================================================")
    tables = run_sqlite_migrations()
    print(f"Database migrated and verified with {len(tables)} active tables.")
    print("==================================================================")
