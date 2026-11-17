import os
import json
import sqlite3
import logging
from typing import List, Optional, Dict, Any
from backend.app.signals.models import (
    TradingSignal,
    SignalLifecycleEvent,
    StrategyConfig,
    SignalState,
    SignalStatus,
    ScoreBreakdown,
    ConditionsMet,
)

logger = logging.getLogger("signals_storage")

DB_PATH = "backend/data/psx_market_data.db"

class SignalStorage:
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
            CREATE TABLE IF NOT EXISTS trading_signals (
                id TEXT PRIMARY KEY,
                symbol TEXT NOT NULL,
                company_name TEXT,
                sector TEXT,
                strategy_name TEXT NOT NULL,
                strategy_version TEXT NOT NULL,
                signal_type TEXT NOT NULL,
                action TEXT NOT NULL,
                status TEXT NOT NULL,
                current_price REAL NOT NULL,
                entry_zone_low REAL NOT NULL,
                entry_zone_high REAL NOT NULL,
                entry_price REAL NOT NULL,
                stop_loss REAL NOT NULL,
                target_1 REAL NOT NULL,
                target_2 REAL NOT NULL,
                target_3 REAL,
                risk_reward_ratio REAL NOT NULL,
                potential_gain_target_1_pct REAL NOT NULL,
                potential_gain_target_2_pct REAL NOT NULL,
                max_risk_pct REAL NOT NULL,
                opportunity_score INTEGER NOT NULL,
                score_breakdown_json TEXT NOT NULL,
                conditions_met_json TEXT NOT NULL,
                vwap REAL NOT NULL,
                vwap_distance_pct REAL NOT NULL,
                ema_9 REAL NOT NULL,
                ema_21 REAL NOT NULL,
                ema_trend TEXT NOT NULL,
                rsi_14 REAL NOT NULL,
                relative_volume REAL NOT NULL,
                atr_14 REAL NOT NULL,
                invalidation_reason TEXT,
                exit_reason TEXT,
                catalyst_notes TEXT,
                timeframe TEXT,
                data_freshness_seconds INTEGER NOT NULL,
                data_delay_type TEXT NOT NULL,
                is_stale INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                valid_until TEXT NOT NULL,
                is_mock INTEGER NOT NULL DEFAULT 0
            );
            """)

            cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_signals_symbol ON trading_signals(symbol);
            """)
            cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_signals_status ON trading_signals(status);
            """)
            cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_signals_type ON trading_signals(signal_type);
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS signal_lifecycle_events (
                id TEXT PRIMARY KEY,
                signal_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                previous_status TEXT NOT NULL,
                new_status TEXT NOT NULL,
                price_at_event REAL NOT NULL,
                note TEXT,
                FOREIGN KEY(signal_id) REFERENCES trading_signals(id)
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS strategy_configurations (
                strategy_name TEXT PRIMARY KEY,
                strategy_version TEXT NOT NULL,
                config_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """)

            # Automatic schema migration for circuit & compliance columns
            existing_cols = [c[1] for c in cursor.execute("PRAGMA table_info(trading_signals);").fetchall()]
            new_cols = [
                ("circuit_breaker_upper", "REAL DEFAULT 0.0"),
                ("circuit_breaker_lower", "REAL DEFAULT 0.0"),
                ("circuit_status", "TEXT DEFAULT 'NORMAL'"),
                ("cap_distance_pct", "REAL DEFAULT 0.0"),
                ("is_shariah_compliant", "INTEGER DEFAULT 1"),
                ("is_defaulter", "INTEGER DEFAULT 0"),
                ("is_non_compliant", "INTEGER DEFAULT 0"),
                ("regulatory_category", "TEXT DEFAULT 'MAINBOARD'"),
                ("sector_quadrant", "TEXT DEFAULT 'LEADING'"),
                ("macro_regime", "TEXT DEFAULT 'BULL_CONSOLIDATION'"),
            ]
            for col_name, col_type in new_cols:
                if col_name not in existing_cols:
                    cursor.execute(f"ALTER TABLE trading_signals ADD COLUMN {col_name} {col_type};")

            conn.commit()

    def _row_to_signal(self, row: sqlite3.Row) -> TradingSignal:
        score_bd = ScoreBreakdown(**json.loads(row["score_breakdown_json"]))
        cond_met = ConditionsMet(**json.loads(row["conditions_met_json"]))
        keys = row.keys()

        return TradingSignal(
            id=row["id"],
            symbol=row["symbol"],
            company_name=row["company_name"] or f"{row['symbol']} Ltd",
            sector=row["sector"] or "Equities",
            strategy_name=row["strategy_name"],
            strategy_version=row["strategy_version"],
            signal_type=SignalState(row["signal_type"]),
            action=row["action"],
            status=SignalStatus(row["status"]),
            current_price=row["current_price"],
            entry_zone_low=row["entry_zone_low"],
            entry_zone_high=row["entry_zone_high"],
            entry_price=row["entry_price"],
            stop_loss=row["stop_loss"],
            target_1=row["target_1"],
            target_2=row["target_2"],
            target_3=row["target_3"],
            risk_reward_ratio=row["risk_reward_ratio"],
            potential_gain_target_1_pct=row["potential_gain_target_1_pct"],
            potential_gain_target_2_pct=row["potential_gain_target_2_pct"],
            max_risk_pct=row["max_risk_pct"],
            opportunity_score=row["opportunity_score"],
            score_breakdown=score_bd,
            conditions_met=cond_met,
            vwap=row["vwap"],
            vwap_distance_pct=row["vwap_distance_pct"],
            ema_9=row["ema_9"],
            ema_21=row["ema_21"],
            ema_trend=row["ema_trend"],
            rsi_14=row["rsi_14"],
            relative_volume=row["relative_volume"],
            atr_14=row["atr_14"],
            circuit_breaker_upper=float(row["circuit_breaker_upper"] or 0.0) if "circuit_breaker_upper" in keys else 0.0,
            circuit_breaker_lower=float(row["circuit_breaker_lower"] or 0.0) if "circuit_breaker_lower" in keys else 0.0,
            circuit_status=str(row["circuit_status"] or "NORMAL") if "circuit_status" in keys else "NORMAL",
            cap_distance_pct=float(row["cap_distance_pct"] or 0.0) if "cap_distance_pct" in keys else 0.0,
            is_shariah_compliant=bool(row["is_shariah_compliant"]) if "is_shariah_compliant" in keys else True,
            is_defaulter=bool(row["is_defaulter"]) if "is_defaulter" in keys else False,
            is_non_compliant=bool(row["is_non_compliant"]) if "is_non_compliant" in keys else False,
            regulatory_category=str(row["regulatory_category"] or "MAINBOARD") if "regulatory_category" in keys else "MAINBOARD",
            sector_quadrant=str(row["sector_quadrant"] or "LEADING") if "sector_quadrant" in keys else "LEADING",
            macro_regime=str(row["macro_regime"] or "BULL_CONSOLIDATION") if "macro_regime" in keys else "BULL_CONSOLIDATION",
            invalidation_reason=row["invalidation_reason"],
            exit_reason=row["exit_reason"],
            catalyst_notes=row["catalyst_notes"] or "",
            timeframe=row["timeframe"] or "1D / Intraday",
            data_freshness_seconds=row["data_freshness_seconds"],
            data_delay_type=row["data_delay_type"],
            is_stale=bool(row["is_stale"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            valid_until=row["valid_until"],
            is_mock=bool(row["is_mock"]),
        )

    def save_signal(self, signal: TradingSignal):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO trading_signals (
                id, symbol, company_name, sector, strategy_name, strategy_version,
                signal_type, action, status, current_price, entry_zone_low, entry_zone_high,
                entry_price, stop_loss, target_1, target_2, target_3, risk_reward_ratio,
                potential_gain_target_1_pct, potential_gain_target_2_pct, max_risk_pct,
                opportunity_score, score_breakdown_json, conditions_met_json, vwap,
                vwap_distance_pct, ema_9, ema_21, ema_trend, rsi_14, relative_volume,
                atr_14, invalidation_reason, exit_reason, catalyst_notes, timeframe,
                data_freshness_seconds, data_delay_type, is_stale, created_at,
                updated_at, valid_until, is_mock, circuit_breaker_upper, circuit_breaker_lower,
                circuit_status, cap_distance_pct, is_shariah_compliant, is_defaulter,
                is_non_compliant, regulatory_category, sector_quadrant, macro_regime
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                signal.id, signal.symbol, signal.company_name, signal.sector,
                signal.strategy_name, signal.strategy_version, signal.signal_type.value,
                signal.action, signal.status.value, signal.current_price,
                signal.entry_zone_low, signal.entry_zone_high, signal.entry_price,
                signal.stop_loss, signal.target_1, signal.target_2, signal.target_3,
                signal.risk_reward_ratio, signal.potential_gain_target_1_pct,
                signal.potential_gain_target_2_pct, signal.max_risk_pct,
                signal.opportunity_score, json.dumps(signal.score_breakdown.model_dump()),
                json.dumps(signal.conditions_met.model_dump()), signal.vwap,
                signal.vwap_distance_pct, signal.ema_9, signal.ema_21, signal.ema_trend,
                signal.rsi_14, signal.relative_volume, signal.atr_14,
                signal.invalidation_reason, signal.exit_reason, signal.catalyst_notes,
                signal.timeframe, signal.data_freshness_seconds, signal.data_delay_type,
                1 if signal.is_stale else 0, signal.created_at, signal.updated_at,
                signal.valid_until, 1 if signal.is_mock else 0,
                signal.circuit_breaker_upper, signal.circuit_breaker_lower,
                signal.circuit_status, signal.cap_distance_pct,
                1 if signal.is_shariah_compliant else 0,
                1 if signal.is_defaulter else 0,
                1 if signal.is_non_compliant else 0,
                signal.regulatory_category,
                getattr(signal, "sector_quadrant", "LEADING"),
                getattr(signal, "macro_regime", "BULL_CONSOLIDATION")
            ))
            conn.commit()

    def get_signal_by_id(self, signal_id: str) -> Optional[TradingSignal]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM trading_signals WHERE id = ?;", (signal_id,))
            row = cursor.fetchone()
            if row:
                return self._row_to_signal(row)
        return None

    def get_active_signal_for_symbol(self, symbol: str) -> Optional[TradingSignal]:
        """Check for existing ACTIVE signal on this symbol to prevent duplicates."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT * FROM trading_signals 
            WHERE symbol = ? AND status = 'ACTIVE' 
            ORDER BY created_at DESC LIMIT 1;
            """, (symbol.upper(),))
            row = cursor.fetchone()
            if row:
                return self._row_to_signal(row)
        return None

    def get_signals(
        self,
        signal_type: Optional[str] = None,
        status: Optional[str] = None,
        min_score: int = 0,
        limit: int = 100,
    ) -> List[TradingSignal]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM trading_signals WHERE opportunity_score >= ?"
            params: List[Any] = [min_score]

            if signal_type and signal_type.upper() != "ALL":
                query += " AND signal_type = ?"
                params.append(signal_type.upper())

            if status and status.upper() != "ALL":
                query += " AND status = ?"
                params.append(status.upper())

            query += " ORDER BY opportunity_score DESC, updated_at DESC LIMIT ?;"
            params.append(limit)

            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [self._row_to_signal(r) for r in rows]

    def update_signal_status(
        self,
        signal_id: str,
        new_status: str,
        note: str = "",
        price: Optional[float] = None,
    ) -> Optional[TradingSignal]:
        import datetime
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM trading_signals WHERE id = ?;", (signal_id,))
            row = cursor.fetchone()
            if not row:
                return None

            sig = self._row_to_signal(row)
            prev_status = sig.status.value
            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cur_price = price if price is not None else sig.current_price
            status_enum = SignalStatus(new_status.upper())

            # Update status in DB
            cursor.execute("""
            UPDATE trading_signals 
            SET status = ?, updated_at = ?
            WHERE id = ?;
            """, (status_enum.value, now_str, signal_id))

            # Insert lifecycle event
            evt_id = f"EVT-{signal_id}-{int(datetime.datetime.now().timestamp())}"
            cursor.execute("""
            INSERT INTO signal_lifecycle_events (id, signal_id, timestamp, previous_status, new_status, price_at_event, note)
            VALUES (?, ?, ?, ?, ?, ?, ?);
            """, (
                evt_id, signal_id, now_str, prev_status, status_enum.value, cur_price, note or f"Status transitioned to {status_enum.value}"
            ))
            conn.commit()

            sig.status = status_enum
            sig.updated_at = now_str
            return sig

    def record_lifecycle_event(self, event: SignalLifecycleEvent):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO signal_lifecycle_events (id, signal_id, timestamp, previous_status, new_status, price_at_event, note)
            VALUES (?, ?, ?, ?, ?, ?, ?);
            """, (
                event.id, event.signal_id, event.timestamp, event.previous_status,
                event.new_status, event.price_at_event, event.note
            ))
            conn.commit()

    def get_lifecycle_events(self, signal_id: str) -> List[SignalLifecycleEvent]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM signal_lifecycle_events WHERE signal_id = ? ORDER BY timestamp ASC;", (signal_id,))
            rows = cursor.fetchall()
            return [
                SignalLifecycleEvent(
                    id=r["id"],
                    signal_id=r["signal_id"],
                    timestamp=r["timestamp"],
                    previous_status=r["previous_status"],
                    new_status=r["new_status"],
                    price_at_event=r["price_at_event"],
                    note=r["note"] or ""
                )
                for r in rows
            ]

    def save_strategy_config(self, config: StrategyConfig):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            import datetime
            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute("""
            INSERT OR REPLACE INTO strategy_configurations (strategy_name, strategy_version, config_json, updated_at)
            VALUES (?, ?, ?, ?);
            """, (config.strategy_name, config.strategy_version, json.dumps(config.model_dump()), now_str))
            conn.commit()

    def load_strategy_config(self, strategy_name: str = "Momentum + Volume + VWAP + Breakout") -> Optional[StrategyConfig]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT config_json FROM strategy_configurations WHERE strategy_name = ?;", (strategy_name,))
            row = cursor.fetchone()
            if row:
                return StrategyConfig(**json.loads(row["config_json"]))
        return None

signal_storage = SignalStorage()
