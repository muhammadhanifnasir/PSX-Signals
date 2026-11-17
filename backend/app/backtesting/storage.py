import os
import json
import sqlite3
import logging
from typing import List, Dict, Any, Optional

from backend.app.backtesting.models import BacktestResult

logger = logging.getLogger("backtest_storage")

DB_PATH = "backend/data/psx_market_data.db"

class BacktestStorage:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_tables()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_tables(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS backtest_runs (
                id TEXT PRIMARY KEY,
                strategy_name TEXT NOT NULL,
                run_timestamp TEXT NOT NULL,
                symbols TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                initial_capital REAL NOT NULL,
                final_equity REAL NOT NULL,
                total_return_pct REAL NOT NULL,
                win_rate_pct REAL NOT NULL,
                profit_factor REAL NOT NULL,
                expectancy_pkr REAL NOT NULL,
                max_drawdown_pct REAL NOT NULL,
                trades_count INTEGER NOT NULL,
                result_json TEXT NOT NULL
            );
            """)
            conn.commit()

    def save_result(self, res: BacktestResult):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            symbols_str = ",".join(res.config.symbols)
            cursor.execute("""
            INSERT OR REPLACE INTO backtest_runs (
                id, strategy_name, run_timestamp, symbols, start_date, end_date,
                initial_capital, final_equity, total_return_pct, win_rate_pct,
                profit_factor, expectancy_pkr, max_drawdown_pct, trades_count, result_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                res.id,
                res.strategy_name,
                res.run_timestamp,
                symbols_str,
                res.config.start_date,
                res.config.end_date,
                res.metrics.initial_capital,
                res.metrics.final_equity,
                res.metrics.total_return_pct,
                res.metrics.win_rate_pct,
                res.metrics.profit_factor,
                res.metrics.expectancy_pkr,
                res.metrics.max_drawdown_pct,
                res.metrics.total_trades,
                json.dumps(res.model_dump())
            ))
            conn.commit()
            logger.info(f"Saved backtest result {res.id}")

    def get_result(self, run_id: str) -> Optional[BacktestResult]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT result_json FROM backtest_runs WHERE id = ?;", (run_id,))
            row = cursor.fetchone()
            if row:
                return BacktestResult(**json.loads(row["result_json"]))
        return None

    def list_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT id, strategy_name, run_timestamp, symbols, start_date, end_date,
                   total_return_pct, win_rate_pct, profit_factor, max_drawdown_pct, trades_count
            FROM backtest_runs
            ORDER BY run_timestamp DESC
            LIMIT ?;
            """, (limit,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

backtest_storage = BacktestStorage()
