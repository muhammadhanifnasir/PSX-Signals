import os
import uuid
import sqlite3
import datetime
import logging
from typing import List, Optional, Dict, Any, Tuple

from backend.app.journal.models import (
    JournalTrade,
    JournalTradeCreate,
    JournalTradeUpdate,
    JournalTradeClose,
    RiskSettings,
    PortfolioExposure,
    RiskWarning,
)
from backend.app.market_engine.symbol_universe import symbol_universe_mgr
from backend.app.services.supabase_client import supabase_service

logger = logging.getLogger("journal_storage")

DB_PATH = "backend/data/psx_market_data.db"

class JournalStorage:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_tables()
        self._seed_default_data_if_empty()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_tables(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS trade_journal (
                id TEXT PRIMARY KEY,
                symbol TEXT NOT NULL,
                company_name TEXT,
                sector TEXT,
                direction TEXT NOT NULL DEFAULT 'BUY',
                status TEXT NOT NULL DEFAULT 'OPEN',
                quantity INTEGER NOT NULL,
                entry_price REAL NOT NULL,
                entry_date TEXT NOT NULL,
                stop_loss REAL,
                target_1 REAL,
                target_2 REAL,
                exit_price REAL,
                exit_date TEXT,
                exit_reason TEXT,
                strategy TEXT,
                setup_type TEXT,
                signal_id TEXT,
                position_value REAL NOT NULL,
                brokerage_commission_rate REAL NOT NULL DEFAULT 0.15,
                total_charges REAL NOT NULL DEFAULT 0,
                gross_pnl REAL NOT NULL DEFAULT 0,
                net_pnl REAL NOT NULL DEFAULT 0,
                return_percent REAL NOT NULL DEFAULT 0,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS risk_settings (
                id INTEGER PRIMARY KEY DEFAULT 1,
                trading_capital REAL NOT NULL DEFAULT 1000000.0,
                max_risk_per_trade_pct REAL NOT NULL DEFAULT 1.5,
                max_daily_loss_pct REAL NOT NULL DEFAULT 3.0,
                max_open_positions INTEGER NOT NULL DEFAULT 5,
                max_sector_exposure_pct REAL NOT NULL DEFAULT 30.0,
                max_single_position_pct REAL NOT NULL DEFAULT 25.0,
                commission_rate_pct REAL NOT NULL DEFAULT 0.15,
                updated_at TEXT NOT NULL
            );
            """)
            conn.commit()

    def _seed_default_data_if_empty(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as cnt FROM risk_settings;")
            if cursor.fetchone()["cnt"] == 0:
                now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                cursor.execute("""
                INSERT INTO risk_settings (id, trading_capital, max_risk_per_trade_pct, max_daily_loss_pct,
                                           max_open_positions, max_sector_exposure_pct, max_single_position_pct,
                                           commission_rate_pct, updated_at)
                VALUES (1, 1000000.0, 1.5, 3.0, 5, 30.0, 25.0, 0.15, ?);
                """, (now_str,))

            cursor.execute("SELECT COUNT(*) as cnt FROM trade_journal;")
            if cursor.fetchone()["cnt"] == 0:
                # Seed realistic closed & open journal trades
                seed_trades = [
                    (
                        "TJ-202611-001", "AIRLINK", "Air Link Communication Ltd", "Technology & Communication", "BUY", "CLOSED",
                        2000, 134.50, "2026-11-03 10:15:00", 128.00, 144.00, 150.00,
                        143.50, "2026-11-10 14:30:00", "TARGET_1",
                        "Momentum + VWAP Breakout", "BREAKOUT", "SIG-PSX-AIRLINK-01",
                        269000.0, 0.15, 834.0, 18000.0, 17166.0, 6.38,
                        "Reclaimed intraday VWAP with 2.4x RVOL expansion. Clean target 1 scale out.",
                        "2026-11-03 10:15:00", "2026-11-10 14:30:00"
                    ),
                    (
                        "TJ-202611-002", "OGDC", "Oil & Gas Development Co", "Oil & Gas Exploration", "BUY", "CLOSED",
                        1500, 161.00, "2026-11-05 11:20:00", 154.00, 172.00, 180.00,
                        154.00, "2026-11-08 11:45:00", "STOP_LOSS",
                        "EMA Pullback", "PULLBACK", None,
                        241500.0, 0.15, 708.75, -10500.0, -11208.75, -4.64,
                        "Sector pull back on global Brent softening. Stop loss strictly honored.",
                        "2026-11-05 11:20:00", "2026-11-08 11:45:00"
                    ),
                    (
                        "TJ-202611-003", "MARI", "Mari Petroleum Co Ltd", "Oil & Gas Exploration", "BUY", "CLOSED",
                        300, 720.00, "2026-11-07 09:45:00", 690.00, 765.00, 800.00,
                        762.00, "2026-11-13 13:10:00", "TARGET_1",
                        "Momentum + VWAP Breakout", "BREAKOUT", "SIG-PSX-MARI-01",
                        216000.0, 0.15, 666.9, 12600.0, 11933.1, 5.52,
                        "Exploration reserve confirmation catalyst. Exited at 762 near R2 pivot.",
                        "2026-11-07 09:45:00", "2026-11-13 13:10:00"
                    ),
                    (
                        "TJ-202611-004", "LUCK", "Lucky Cement Ltd", "Cement", "BUY", "CLOSED",
                        250, 915.00, "2026-11-10 10:05:00", 880.00, 965.00, 1000.00,
                        955.00, "2026-11-14 15:00:00", "TARGET_1",
                        "Support Bounce", "PULLBACK", None,
                        228750.0, 0.15, 701.25, 10000.0, 9298.75, 4.06,
                        "Coal price drop margin expansion thesis. Closed ahead of weekend.",
                        "2026-11-10 10:05:00", "2026-11-14 15:00:00"
                    ),
                    (
                        "TJ-202611-005", "SYS", "Systems Limited", "Technology & Communication", "BUY", "OPEN",
                        400, 478.00, "2026-11-15 10:30:00", 458.00, 510.00, 535.00,
                        None, None, None,
                        "Momentum + VWAP Breakout", "BREAKOUT", "SIG-PSX-SYS-01",
                        191200.0, 0.15, 286.8, 0.0, 0.0, 0.0,
                        "Active position holding above 21 EMA. Awaiting Target 1 test.",
                        "2026-11-15 10:30:00", "2026-11-15 10:30:00"
                    ),
                ]
                cursor.executemany("""
                INSERT INTO trade_journal (
                    id, symbol, company_name, sector, direction, status, quantity,
                    entry_price, entry_date, stop_loss, target_1, target_2,
                    exit_price, exit_date, exit_reason, strategy, setup_type, signal_id,
                    position_value, brokerage_commission_rate, total_charges, gross_pnl, net_pnl, return_percent,
                    notes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, seed_trades)
            conn.commit()

    def _row_to_trade(self, row: sqlite3.Row) -> JournalTrade:
        return JournalTrade(
            id=row["id"],
            symbol=row["symbol"],
            company_name=row["company_name"] or f"{row['symbol']} Ltd",
            sector=row["sector"] or "Equities",
            direction=row["direction"],
            status=row["status"],
            quantity=row["quantity"],
            entry_price=row["entry_price"],
            entry_date=row["entry_date"],
            stop_loss=row["stop_loss"],
            target_1=row["target_1"],
            target_2=row["target_2"],
            exit_price=row["exit_price"],
            exit_date=row["exit_date"],
            exit_date_str=row["exit_date"],
            exit_reason=row["exit_reason"],
            strategy=row["strategy"] or "Discretionary",
            setup_type=row["setup_type"] or "GENERAL",
            signal_id=row["signal_id"],
            position_value=row["position_value"],
            brokerage_commission_rate=row["brokerage_commission_rate"],
            total_charges=row["total_charges"],
            gross_pnl=row["gross_pnl"],
            net_pnl=row["net_pnl"],
            return_percent=row["return_percent"],
            notes=row["notes"] or "",
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def create_trade(self, req: JournalTradeCreate) -> JournalTrade:
        sym = req.symbol.strip().upper()
        trade_id = f"TJ-{datetime.datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:5].upper()}"
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        univ_item = symbol_universe_mgr.get_by_symbol(sym)
        comp_name = req.company_name or (univ_item.name if univ_item else f"{sym} Ltd")
        sector_name = req.sector or (univ_item.sector if univ_item else "Equities")

        pos_val = round(req.quantity * req.entry_price, 2)
        entry_commission = round(pos_val * (req.brokerage_commission_rate / 100.0), 2)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO trade_journal (
                id, symbol, company_name, sector, direction, status, quantity,
                entry_price, entry_date, stop_loss, target_1, target_2,
                exit_price, exit_date, exit_reason, strategy, setup_type, signal_id,
                position_value, brokerage_commission_rate, total_charges, gross_pnl, net_pnl, return_percent,
                notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, 0.0, 0.0, 0.0, ?, ?, ?);
            """, (
                trade_id, sym, comp_name, sector_name, req.direction, req.quantity,
                req.entry_price, req.entry_date, req.stop_loss, req.target_1, req.target_2,
                req.strategy, req.setup_type, req.signal_id,
                pos_val, req.brokerage_commission_rate, entry_commission,
                req.notes or "", now_str, now_str
            ))
            conn.commit()

        return self.get_trade(trade_id)  # type: ignore

    def get_trade(self, trade_id: str) -> Optional[JournalTrade]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM trade_journal WHERE id = ?;", (trade_id,))
            row = cursor.fetchone()
            if row:
                return self._row_to_trade(row)
        return None

    def get_trades(self, status: Optional[str] = None, symbol: Optional[str] = None) -> List[JournalTrade]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM trade_journal WHERE 1=1"
            params: List[Any] = []
            if status and status.upper() != "ALL":
                query += " AND status = ?"
                params.append(status.upper())
            if symbol and symbol.strip():
                query += " AND symbol = ?"
                params.append(symbol.strip().upper())

            query += " ORDER BY entry_date DESC;"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [self._row_to_trade(r) for r in rows]

    def close_trade(self, trade_id: str, close_data: JournalTradeClose) -> Optional[JournalTrade]:
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM trade_journal WHERE id = ?;", (trade_id,))
            row = cursor.fetchone()
            if not row:
                return None

            trade = self._row_to_trade(row)
            if trade.status == "CLOSED":
                return trade

            qty = trade.quantity
            entry_p = trade.entry_price
            exit_p = close_data.exit_price
            comm_rate = trade.brokerage_commission_rate / 100.0

            entry_comm = round(qty * entry_p * comm_rate, 2)
            exit_comm = round(qty * exit_p * comm_rate, 2)
            total_charges = round(entry_comm + exit_comm, 2)

            if trade.direction == "BUY":
                gross_pnl = round(qty * (exit_p - entry_p), 2)
            else:
                gross_pnl = round(qty * (entry_p - exit_p), 2)

            net_pnl = round(gross_pnl - total_charges, 2)
            ret_pct = round((net_pnl / trade.position_value) * 100.0, 2) if trade.position_value > 0 else 0.0

            full_notes = trade.notes
            if close_data.closing_notes:
                full_notes = f"{trade.notes}\n[Closed {close_data.exit_date}]: {close_data.closing_notes}".strip()

            cursor.execute("""
            UPDATE trade_journal
            SET status = 'CLOSED', exit_price = ?, exit_date = ?, exit_reason = ?,
                total_charges = ?, gross_pnl = ?, net_pnl = ?, return_percent = ?,
                notes = ?, updated_at = ?
            WHERE id = ?;
            """, (
                exit_p, close_data.exit_date, close_data.exit_reason,
                total_charges, gross_pnl, net_pnl, ret_pct,
                full_notes, now_str, trade_id
            ))
            conn.commit()

        return self.get_trade(trade_id)

    def update_trade(self, trade_id: str, update: JournalTradeUpdate) -> Optional[JournalTrade]:
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM trade_journal WHERE id = ?;", (trade_id,))
            row = cursor.fetchone()
            if not row:
                return None

            fields = []
            vals = []
            if update.stop_loss is not None:
                fields.append("stop_loss = ?")
                vals.append(update.stop_loss)
            if update.target_1 is not None:
                fields.append("target_1 = ?")
                vals.append(update.target_1)
            if update.target_2 is not None:
                fields.append("target_2 = ?")
                vals.append(update.target_2)
            if update.strategy is not None:
                fields.append("strategy = ?")
                vals.append(update.strategy)
            if update.notes is not None:
                fields.append("notes = ?")
                vals.append(update.notes)

            if fields:
                fields.append("updated_at = ?")
                vals.append(now_str)
                vals.append(trade_id)
                query = f"UPDATE trade_journal SET {', '.join(fields)} WHERE id = ?;"
                cursor.execute(query, vals)
                conn.commit()

        return self.get_trade(trade_id)

    def delete_trade(self, trade_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM trade_journal WHERE id = ?;", (trade_id,))
            conn.commit()
            return cursor.rowcount > 0

    def get_risk_settings(self) -> RiskSettings:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM risk_settings WHERE id = 1;")
            row = cursor.fetchone()
            if row:
                return RiskSettings(
                    trading_capital=row["trading_capital"],
                    max_risk_per_trade_pct=row["max_risk_per_trade_pct"],
                    max_daily_loss_pct=row["max_daily_loss_pct"],
                    max_open_positions=row["max_open_positions"],
                    max_sector_exposure_pct=row["max_sector_exposure_pct"],
                    max_single_position_pct=row["max_single_position_pct"],
                    commission_rate_pct=row["commission_rate_pct"],
                )
        return RiskSettings()

    def update_risk_settings(self, s: RiskSettings) -> RiskSettings:
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE risk_settings
            SET trading_capital = ?, max_risk_per_trade_pct = ?, max_daily_loss_pct = ?,
                max_open_positions = ?, max_sector_exposure_pct = ?, max_single_position_pct = ?,
                commission_rate_pct = ?, updated_at = ?
            WHERE id = 1;
            """, (
                s.trading_capital, s.max_risk_per_trade_pct, s.max_daily_loss_pct,
                s.max_open_positions, s.max_sector_exposure_pct, s.max_single_position_pct,
                s.commission_rate_pct, now_str
            ))
            conn.commit()
        return self.get_risk_settings()

    def get_portfolio_exposure(self) -> PortfolioExposure:
        settings = self.get_risk_settings()
        trades = self.get_trades(status="OPEN")
        closed_trades = self.get_trades(status="CLOSED")

        allocated_cap = sum(t.position_value for t in trades)
        remaining_cash = max(settings.trading_capital - allocated_cap, 0.0)
        exposure_pct = round((allocated_cap / settings.trading_capital) * 100.0, 2) if settings.trading_capital > 0 else 0.0

        # Sector exposure
        sector_map: Dict[str, float] = {}
        for t in trades:
            sec = t.sector or "Other"
            sector_map[sec] = sector_map.get(sec, 0.0) + t.position_value

        sector_pct_map = {
            sec: round((val / settings.trading_capital) * 100.0, 2)
            for sec, val in sector_map.items()
        }

        # Daily Realized PnL (trades closed today)
        today_str = datetime.datetime.now().strftime("%Y-%m-%d")
        today_closed = [t for t in closed_trades if t.exit_date_str and t.exit_date_str.startswith(today_str)]
        daily_pnl = sum(t.net_pnl for t in today_closed)
        daily_pnl_pct = round((daily_pnl / settings.trading_capital) * 100.0, 2)

        max_daily_loss_pkr = round(settings.trading_capital * (settings.max_daily_loss_pct / 100.0), 2)
        is_breached = daily_pnl < 0 and abs(daily_pnl) >= max_daily_loss_pkr

        # Evaluate Risk Warnings
        warnings: List[RiskWarning] = []

        if len(trades) >= settings.max_open_positions:
            warnings.append(RiskWarning(
                type="WARNING",
                category="CONCURRENCY_LIMIT",
                message=f"Maximum open positions limit ({settings.max_open_positions}) reached. No new trades should be opened."
            ))

        if is_breached:
            warnings.append(RiskWarning(
                type="DANGER",
                category="DAILY_LOSS_BREACH",
                message=f"CRITICAL: Daily loss cap ({settings.max_daily_loss_pct}% / PKR {max_daily_loss_pkr}) breached! Trading halted for the day."
            ))

        for sec, pct in sector_pct_map.items():
            if pct > settings.max_sector_exposure_pct:
                warnings.append(RiskWarning(
                    type="WARNING",
                    category="SECTOR_CONCENTRATION",
                    message=f"Sector allocation in '{sec}' is {pct}%, exceeding the {settings.max_sector_exposure_pct}% threshold."
                ))

        for t in trades:
            t_pct = (t.position_value / settings.trading_capital) * 100.0
            if t_pct > settings.max_single_position_pct:
                warnings.append(RiskWarning(
                    type="WARNING",
                    category="SINGLE_POSITION_SIZE",
                    message=f"Position size in {t.symbol} is {t_pct:.1f}% of capital (ceiling: {settings.max_single_position_pct}%)."
                ))

        return PortfolioExposure(
            trading_capital=settings.trading_capital,
            allocated_capital=allocated_cap,
            remaining_cash=remaining_cash,
            exposure_pct=exposure_pct,
            open_positions_count=len(trades),
            max_positions_limit=settings.max_open_positions,
            daily_realized_pnl=daily_pnl,
            daily_pnl_pct=daily_pnl_pct,
            max_daily_loss_limit_pkr=max_daily_loss_pkr,
            is_daily_loss_breached=is_breached,
            sector_exposure=sector_pct_map,
            warnings=warnings,
        )

journal_storage = JournalStorage()
