import os
import sqlite3
import datetime
import logging
from typing import List, Optional, Dict, Any
from backend.app.market_engine.models import NormalizedQuote, SymbolUniverseItem, HistoricalBar
from backend.app.services.supabase_client import supabase_service

logger = logging.getLogger("market_storage")

class MarketDataStorage:
    def __init__(self, db_path: str = "backend/data/psx_market_data.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_sqlite()

    def _init_sqlite(self):
        """Ensure local relational tables exist for storing validated observations."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS market_quotes (
                        symbol TEXT NOT NULL,
                        price REAL NOT NULL,
                        change REAL,
                        change_percent REAL,
                        open_price REAL,
                        high_price REAL,
                        low_price REAL,
                        ldcp REAL,
                        volume INTEGER,
                        sector TEXT,
                        timestamp TEXT NOT NULL,
                        source_timestamp TEXT,
                        delay_type TEXT NOT NULL,
                        provider TEXT NOT NULL,
                        is_valid INTEGER NOT NULL,
                        PRIMARY KEY (symbol, timestamp)
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS symbol_universe (
                        symbol TEXT PRIMARY KEY,
                        name TEXT,
                        sector TEXT,
                        listed_indices TEXT,
                        is_shariah_compliant INTEGER,
                        lot_size INTEGER,
                        circuit_breaker_upper REAL,
                        circuit_breaker_lower REAL,
                        last_updated TEXT
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS data_source_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        provider TEXT NOT NULL,
                        event_type TEXT NOT NULL,
                        status TEXT NOT NULL,
                        message TEXT,
                        symbols_count INTEGER,
                        latency_ms REAL,
                        timestamp TEXT NOT NULL
                    )
                """)
                conn.commit()
                logger.info("Local market storage initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing local market storage: {e}")

    def save_quotes(self, quotes: List[NormalizedQuote]):
        """Store validated quotes into PostgreSQL / SQLite."""
        if not quotes:
            return

        valid_quotes = [q for q in quotes if q.is_valid]
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # 1. Store in local SQLite
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                rows = [
                    (
                        q.symbol,
                        q.price,
                        q.change,
                        q.change_percent,
                        q.open_price,
                        q.high_price,
                        q.low_price,
                        q.ldcp,
                        q.volume,
                        q.sector,
                        q.timestamp,
                        q.source_timestamp or now_str,
                        q.delay_type.value,
                        q.provider.value,
                        1 if q.is_valid else 0,
                    )
                    for q in valid_quotes
                ]
                cursor.executemany("""
                    INSERT OR REPLACE INTO market_quotes (
                        symbol, price, change, change_percent, open_price, high_price,
                        low_price, ldcp, volume, sector, timestamp, source_timestamp,
                        delay_type, provider, is_valid
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, rows)
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to save quotes to SQLite: {e}")

        # 2. Synchronize to Supabase PostgreSQL if active
        if supabase_service.is_connected:
            try:
                # Batch upsert to Supabase
                records = [
                    {
                        "symbol": q.symbol,
                        "current_price": q.price,
                        "sector": q.sector,
                        "volume": q.volume,
                        "updated_at": q.timestamp
                    }
                    for q in valid_quotes[:50] # Top 50 to avoid payload limits
                ]
                supabase_service._client.table("stocks").upsert(records).execute()
            except Exception as e:
                logger.warning(f"Supabase upsert failed: {e}")

    def log_sync_event(self, provider: str, status: str, message: str, symbols_count: int, latency_ms: float):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO data_source_logs (
                        provider, event_type, status, message, symbols_count, latency_ms, timestamp
                    ) VALUES (?, 'COLLECTION_RUN', ?, ?, ?, ?, ?)
                """, (
                    provider,
                    status,
                    message,
                    symbols_count,
                    latency_ms,
                    datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to log sync event: {e}")

    def get_latest_quote(self, symbol: str) -> Optional[NormalizedQuote]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT symbol, price, change, change_percent, open_price, high_price,
                           low_price, ldcp, volume, sector, timestamp, source_timestamp,
                           delay_type, provider, is_valid
                    FROM market_quotes
                    WHERE symbol = ?
                    ORDER BY timestamp DESC
                    LIMIT 1
                """, (symbol.upper(),))
                row = cursor.fetchone()
                if row:
                    return NormalizedQuote(
                        symbol=row[0],
                        price=row[1],
                        change=row[2],
                        change_percent=row[3],
                        open_price=row[4],
                        high_price=row[5],
                        low_price=row[6],
                        ldcp=row[7],
                        volume=row[8],
                        sector=row[9],
                        timestamp=row[10],
                        source_timestamp=row[11],
                        delay_type=row[12],
                        provider=row[13],
                        is_valid=bool(row[14])
                    )
        except Exception as e:
            logger.error(f"Failed to read latest quote: {e}")
        return None

    def get_all_latest_quotes(self) -> List[NormalizedQuote]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT symbol, price, change, change_percent, open_price, high_price,
                           low_price, ldcp, volume, sector, timestamp, source_timestamp,
                           delay_type, provider, is_valid
                    FROM market_quotes
                    GROUP BY symbol
                    HAVING timestamp = MAX(timestamp)
                """)
                rows = cursor.fetchall()
                results = []
                for row in rows:
                    results.append(NormalizedQuote(
                        symbol=row[0],
                        price=row[1],
                        change=row[2],
                        change_percent=row[3],
                        open_price=row[4],
                        high_price=row[5],
                        low_price=row[6],
                        ldcp=row[7],
                        volume=row[8],
                        sector=row[9],
                        timestamp=row[10],
                        source_timestamp=row[11],
                        delay_type=row[12],
                        provider=row[13],
                        is_valid=bool(row[14])
                    ))
                return results
        except Exception as e:
            logger.error(f"Failed to read all latest quotes: {e}")
            return []

market_storage = MarketDataStorage()
