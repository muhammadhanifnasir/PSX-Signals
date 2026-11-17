import os
import sqlite3
import datetime
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.market_engine.engine import market_data_engine
from backend.app.market_engine.symbol_universe import symbol_universe_mgr
from backend.app.signals.storage import signal_storage

logger = logging.getLogger("watchlist_router")

DB_PATH = "backend/data/psx_market_data.db"

class WatchlistItem(BaseModel):
    symbol: str
    company_name: str
    sector: str
    current_price: float
    change: float
    change_percent: float
    volume: int
    volume_formatted: str
    target_buy_price: Optional[float] = None
    target_sell_price: Optional[float] = None
    alert_enabled: bool = True
    notes: str = ""
    active_signal_action: Optional[str] = None
    active_signal_score: Optional[int] = None
    active_signal_type: Optional[str] = None
    created_at: str

class WatchlistAddRequest(BaseModel):
    symbol: str
    target_buy_price: Optional[float] = None
    target_sell_price: Optional[float] = None
    alert_enabled: bool = True
    notes: str = ""

router = APIRouter(prefix="/watchlist", tags=["Watchlist Management"])

def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn

def _init_watchlist_table():
    with _get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_watchlist (
            symbol TEXT PRIMARY KEY,
            target_buy_price REAL,
            target_sell_price REAL,
            alert_enabled INTEGER NOT NULL DEFAULT 1,
            notes TEXT,
            created_at TEXT NOT NULL
        );
        """)
        # Seed default watchlist if empty
        cursor.execute("SELECT COUNT(*) as cnt FROM user_watchlist;")
        if cursor.fetchone()["cnt"] == 0:
            defaults = [
                ("AIRLINK", 138.00, 155.00, 1, "Wait for VWAP pullback or breakout above 145.", "2026-11-16 10:00:00"),
                ("OGDC", 162.00, 175.00, 1, "High institutional dividend allocation play.", "2026-11-16 10:00:00"),
                ("MARI", 735.00, 810.00, 1, "VWAP reclaim setup after exploration tests.", "2026-11-16 10:00:00"),
                ("SYS", 475.00, 520.00, 0, "Tech sector export pipeline momentum.", "2026-11-16 10:00:00"),
                ("LUCK", 930.00, 995.00, 1, "Cement margin expansion on coal price drops.", "2026-11-16 10:00:00"),
            ]
            cursor.executemany("""
            INSERT INTO user_watchlist (symbol, target_buy_price, target_sell_price, alert_enabled, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?);
            """, defaults)
        conn.commit()

_init_watchlist_table()

@router.get("", response_model=List[WatchlistItem])
async def get_watchlist():
    """Retrieve full watchlist joined with live PSX quotes and active signals."""
    with _get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_watchlist ORDER BY created_at DESC;")
        rows = cursor.fetchall()

    results: List[WatchlistItem] = []

    for r in rows:
        sym = r["symbol"].upper()
        # Fetch live quote
        quote = await market_data_engine.get_quote(sym)
        univ_item = symbol_universe_mgr.get_by_symbol(sym)
        active_sig = signal_storage.get_active_signal_for_symbol(sym)

        price = quote.price if quote else (r["target_buy_price"] or 100.0)
        change = quote.change if quote else 0.0
        change_pct = quote.change_percent if quote else 0.0
        vol = quote.volume if quote else 1000000
        vol_fmt = f"{round(vol / 1_000_000, 2)}M" if vol >= 1_000_000 else f"{round(vol / 1000, 1)}K"

        comp_name = univ_item.name if (univ_item and univ_item.name) else f"{sym} Ltd"
        sector_name = univ_item.sector if univ_item else (quote.sector if quote else "Equities")

        results.append(WatchlistItem(
            symbol=sym,
            company_name=comp_name,
            sector=sector_name,
            current_price=price,
            change=change,
            change_percent=change_pct,
            volume=vol,
            volume_formatted=vol_fmt,
            target_buy_price=r["target_buy_price"],
            target_sell_price=r["target_sell_price"],
            alert_enabled=bool(r["alert_enabled"]),
            notes=r["notes"] or "",
            active_signal_action=active_sig.action if active_sig else None,
            active_signal_score=active_sig.opportunity_score if active_sig else None,
            active_signal_type=active_sig.signal_type.value if active_sig else None,
            created_at=r["created_at"]
        ))

    return results

@router.post("", response_model=WatchlistItem)
async def add_to_watchlist(req: WatchlistAddRequest):
    """Add a stock to user watchlist or update notes/targets."""
    sym = req.symbol.strip().upper()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with _get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT OR REPLACE INTO user_watchlist (symbol, target_buy_price, target_sell_price, alert_enabled, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?);
        """, (sym, req.target_buy_price, req.target_sell_price, 1 if req.alert_enabled else 0, req.notes, now_str))
        conn.commit()

    quote = await market_data_engine.get_quote(sym)
    univ_item = symbol_universe_mgr.get_by_symbol(sym)
    active_sig = signal_storage.get_active_signal_for_symbol(sym)

    price = quote.price if quote else (req.target_buy_price or 100.0)
    change = quote.change if quote else 0.0
    change_pct = quote.change_percent if quote else 0.0
    vol = quote.volume if quote else 0
    vol_fmt = f"{round(vol / 1_000_000, 2)}M" if vol >= 1_000_000 else f"{round(vol / 1000, 1)}K"

    return WatchlistItem(
        symbol=sym,
        company_name=univ_item.name if univ_item else f"{sym} Ltd",
        sector=univ_item.sector if univ_item else "Equities",
        current_price=price,
        change=change,
        change_percent=change_pct,
        volume=vol,
        volume_formatted=vol_fmt,
        target_buy_price=req.target_buy_price,
        target_sell_price=req.target_sell_price,
        alert_enabled=req.alert_enabled,
        notes=req.notes,
        active_signal_action=active_sig.action if active_sig else None,
        active_signal_score=active_sig.opportunity_score if active_sig else None,
        active_signal_type=active_sig.signal_type.value if active_sig else None,
        created_at=now_str
    )

@router.delete("/{symbol}")
async def remove_from_watchlist(symbol: str):
    """Remove a symbol from user watchlist."""
    sym = symbol.strip().upper()
    with _get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_watchlist WHERE symbol = ?;", (sym,))
        conn.commit()
    return {"status": "success", "symbol": sym}

@router.post("/{symbol}/toggle-alert")
async def toggle_watchlist_alert(symbol: str):
    """Toggle alert on/off for a watchlist symbol."""
    sym = symbol.strip().upper()
    with _get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT alert_enabled FROM user_watchlist WHERE symbol = ?;", (sym,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Symbol not found in watchlist")
        new_val = 0 if row["alert_enabled"] else 1
        cursor.execute("UPDATE user_watchlist SET alert_enabled = ? WHERE symbol = ?;", (new_val, sym))
        conn.commit()
    return {"status": "success", "symbol": sym, "alert_enabled": bool(new_val)}
