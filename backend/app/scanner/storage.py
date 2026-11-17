import os
import sqlite3
import datetime
import logging
from typing import List, Optional, Dict, Any
from backend.app.scanner.models import StockOpportunity, ScanRunSummary

logger = logging.getLogger("scanner_storage")

class ScannerStorage:
    def __init__(self, db_path: str = "backend/data/psx_market_data.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_tables()

    def _init_tables(self):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS scan_runs (
                        id TEXT PRIMARY KEY,
                        scan_timestamp TEXT NOT NULL,
                        total_universe_count INTEGER,
                        eligible_stocks_scanned INTEGER,
                        stale_stocks_rejected INTEGER,
                        invalid_data_rejected INTEGER,
                        opportunities_found INTEGER,
                        provider_used TEXT,
                        data_delay TEXT,
                        execution_time_ms REAL,
                        status TEXT
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS scan_opportunities (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        run_id TEXT NOT NULL,
                        symbol TEXT NOT NULL,
                        company_name TEXT,
                        sector TEXT,
                        last_price REAL,
                        price_change_percent REAL,
                        volume INTEGER,
                        relative_volume REAL,
                        vwap REAL,
                        ema_trend TEXT,
                        rsi_14 REAL,
                        atr_14 REAL,
                        momentum_score INTEGER,
                        opportunity_score INTEGER,
                        setup_type TEXT,
                        setup_description TEXT,
                        is_late_entry_risk INTEGER,
                        data_timestamp TEXT,
                        FOREIGN KEY (run_id) REFERENCES scan_runs(id)
                    )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_opp_symbol ON scan_opportunities(symbol)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_opp_score ON scan_opportunities(opportunity_score DESC)")
                conn.commit()
                logger.info("Scanner persistence tables initialized.")
        except Exception as e:
            logger.error(f"Error initializing scanner tables: {e}")

    def save_scan_run(self, summary: ScanRunSummary, opportunities: List[StockOpportunity]):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO scan_runs (
                        id, scan_timestamp, total_universe_count, eligible_stocks_scanned,
                        stale_stocks_rejected, invalid_data_rejected, opportunities_found,
                        provider_used, data_delay, execution_time_ms, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    summary.id,
                    summary.scan_timestamp,
                    summary.total_universe_count,
                    summary.eligible_stocks_scanned,
                    summary.stale_stocks_rejected,
                    summary.invalid_data_rejected,
                    summary.opportunities_found,
                    summary.provider_used,
                    summary.data_delay,
                    summary.execution_time_ms,
                    summary.status
                ))

                rows = [
                    (
                        summary.id,
                        opp.symbol,
                        opp.company_name,
                        opp.sector,
                        opp.last_price,
                        opp.price_change_percent,
                        opp.volume,
                        opp.relative_volume,
                        opp.vwap,
                        opp.ema_trend,
                        opp.rsi_14,
                        opp.atr_14,
                        opp.momentum_score,
                        opp.opportunity_score,
                        opp.setup_type.value,
                        opp.setup_description,
                        1 if opp.is_late_entry_risk else 0,
                        opp.data_timestamp
                    )
                    for opp in opportunities
                ]
                cursor.executemany("""
                    INSERT INTO scan_opportunities (
                        run_id, symbol, company_name, sector, last_price, price_change_percent,
                        volume, relative_volume, vwap, ema_trend, rsi_14, atr_14,
                        momentum_score, opportunity_score, setup_type, setup_description,
                        is_late_entry_risk, data_timestamp
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, rows)
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to persist scan run: {e}")

    def get_latest_opportunities(self, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM scan_opportunities
                    WHERE run_id = (SELECT id FROM scan_runs ORDER BY scan_timestamp DESC LIMIT 1)
                    ORDER BY opportunity_score DESC
                    LIMIT ?
                """, (limit,))
                rows = cursor.fetchall()
                return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Error reading latest opportunities: {e}")
            return []

scanner_storage = ScannerStorage()
