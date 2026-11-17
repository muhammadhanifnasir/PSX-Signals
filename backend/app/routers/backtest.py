from fastapi import APIRouter, HTTPException, Response, Query
from typing import List, Dict, Any, Optional

from backend.app.backtesting.models import (
    BacktestRequest,
    BacktestResult,
    StrategyComparisonResponse,
)
from backend.app.backtesting.engine import backtest_engine
from backend.app.backtesting.storage import backtest_storage
from backend.app.backtesting.historical_data import historical_data_mgr
from backend.app.backtesting.export import generate_trades_csv, generate_equity_csv

router = APIRouter(prefix="/backtest", tags=["Historical Backtesting & Evaluation"])

@router.post("/run", response_model=BacktestResult)
async def run_backtest_simulation(req: BacktestRequest):
    """
    Execute a rigorous historical backtest across requested PSX equities:
    - Eliminates look-ahead bias through chronological bar-by-bar progression
    - Incorporates PSX brokerage commissions and market slippage
    - Simulates stop-loss, Target 1, Target 2, and time expiry
    - Computes Win Rate, Profit Factor, Expectancy, Max Drawdown, and Alpha
    - Separates In-Sample and Out-of-Sample metrics
    """
    try:
        result = backtest_engine.run_backtest(req)
        backtest_storage.save_result(result)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/history", response_model=List[Dict[str, Any]])
async def get_backtest_history(limit: int = 20):
    """Retrieve historical backtest runs and summary KPI scorecards."""
    return backtest_storage.list_history(limit=limit)

@router.get("/presets")
async def get_backtest_presets():
    """Retrieve pre-configured strategy templates for quick testing."""
    return [
        {
            "id": "momentum_vwap",
            "name": "Momentum + VWAP Breakout (Standard)",
            "description": "Standard 9-confluence rule setup with 1.8x risk-reward target.",
            "params": {
                "min_score": 70,
                "min_rsi": 48.0,
                "max_rsi": 75.0,
                "min_rvol": 1.3,
                "atr_stop_multiplier": 1.5,
                "target_1_multiplier": 1.8,
                "target_2_multiplier": 2.8,
                "max_vwap_distance_pct": 3.5,
                "position_size_type": "PERCENT_OF_EQUITY",
                "position_size_value": 20.0,
                "commission_rate_pct": 0.15,
                "slippage_pct": 0.10,
            }
        },
        {
            "id": "conservative_swing",
            "name": "Conservative Swing Pullback",
            "description": "Higher threshold (75+ pts), 1.6x RVOL, and 2.2x target multiple.",
            "params": {
                "min_score": 75,
                "min_rsi": 52.0,
                "max_rsi": 72.0,
                "min_rvol": 1.6,
                "atr_stop_multiplier": 1.6,
                "target_1_multiplier": 2.2,
                "target_2_multiplier": 3.2,
                "max_vwap_distance_pct": 2.5,
                "position_size_type": "RISK_BASED",
                "position_size_value": 2.0,
                "commission_rate_pct": 0.15,
                "slippage_pct": 0.10,
            }
        },
        {
            "id": "aggressive_breakout",
            "name": "Aggressive High RVOL Breakout",
            "description": "Fast breakout entries requiring 2.0x+ volume surge with rapid 1.5x take-profit.",
            "params": {
                "min_score": 65,
                "min_rsi": 45.0,
                "max_rsi": 78.0,
                "min_rvol": 2.0,
                "atr_stop_multiplier": 1.3,
                "target_1_multiplier": 1.5,
                "target_2_multiplier": 2.5,
                "max_vwap_distance_pct": 4.5,
                "position_size_type": "PERCENT_OF_EQUITY",
                "position_size_value": 25.0,
                "commission_rate_pct": 0.15,
                "slippage_pct": 0.10,
            }
        },
    ]

@router.get("/symbols")
async def get_available_backtest_symbols():
    """Retrieve symbols with available historical daily data and the overall date span."""
    symbols = historical_data_mgr.get_available_symbols()
    min_date, max_date = historical_data_mgr.get_date_range()
    return {
        "symbols": symbols,
        "min_date": min_date,
        "max_date": max_date,
    }

@router.post("/compare", response_model=StrategyComparisonResponse)
async def compare_strategies(
    symbols: Optional[str] = Query("AIRLINK,OGDC,MARI,SYS,LUCK"),
    start_date: str = "2025-01-01",
    end_date: str = "2026-11-15",
    initial_capital: float = 1_000_000.0,
):
    """Run side-by-side strategy comparison across 3 parameter variants against KSE-100 benchmark."""
    sym_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    return backtest_engine.compare_strategies(
        symbols=sym_list,
        start_date=start_date,
        end_date=end_date,
        capital=initial_capital
    )

@router.get("/{run_id}", response_model=BacktestResult)
async def get_backtest_result_by_id(run_id: str):
    """Retrieve full backtest report by ID including trade logs and equity curve."""
    res = backtest_storage.get_result(run_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Backtest run '{run_id}' not found")
    return res

@router.get("/{run_id}/export/trades.csv")
async def export_trades_csv_endpoint(run_id: str):
    """Download trade-by-trade simulated transactions as CSV."""
    res = backtest_storage.get_result(run_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Backtest run '{run_id}' not found")
    csv_content = generate_trades_csv(res)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=backtest_trades_{run_id}.csv"}
    )

@router.get("/{run_id}/export/equity.csv")
async def export_equity_csv_endpoint(run_id: str):
    """Download daily portfolio equity curve & drawdown data as CSV."""
    res = backtest_storage.get_result(run_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Backtest run '{run_id}' not found")
    csv_content = generate_equity_csv(res)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=backtest_equity_{run_id}.csv"}
    )
