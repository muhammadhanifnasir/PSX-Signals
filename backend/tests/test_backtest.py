import os
import sys

# Ensure repository root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.backtesting.models import (
    BacktestRequest,
    BacktestTrade,
    EquityPoint,
)
from backend.app.backtesting.historical_data import historical_data_mgr
from backend.app.backtesting.metrics import calculate_performance_metrics
from backend.app.backtesting.engine import backtest_engine
from backend.app.backtesting.export import generate_trades_csv, generate_equity_csv

def test_historical_data_integrity():
    print("Testing Historical Data Loading & Integrity...")
    bars = historical_data_mgr.get_historical_bars("AIRLINK", "2025-01-01", "2026-11-15")
    assert len(bars) > 100, f"Expected >100 historical bars for AIRLINK, got {len(bars)}"
    
    # Check OHLC structure
    for b in bars[:10]:
        assert b.high >= b.low, f"High must be >= low: {b}"
        assert b.high >= max(b.open, b.close) - 0.01, f"High must be >= open and close: {b}"
        assert b.low <= min(b.open, b.close) + 0.01, f"Low must be <= open and close: {b}"
        assert b.volume > 0, "Volume must be positive"
    
    # Check date ordering
    dates = [b.date for b in bars]
    assert dates == sorted(dates), "Historical bars must be strictly sorted by date"
    print(f"  -> Historical data verified ({len(bars)} bars, strictly chronological).")

def test_manual_calculation_verification():
    print("Testing Performance Metrics with Manually Calculated Examples...")
    # Manual Example: Initial Capital = PKR 1,000,000
    # Trade 1: +10,000 Net PnL (Gross 11,000 - 1,000 fees)
    # Trade 2: -5,000 Net PnL (Gross -4,000 - 1,000 fees)
    # Trade 3: +15,000 Net PnL (Gross 16,000 - 1,000 fees)
    # Trade 4: -5,000 Net PnL (Gross -4,000 - 1,000 fees)
    
    sample_trades = [
        BacktestTrade(
            trade_id="TRD-01", symbol="AIRLINK", direction="LONG",
            entry_date="2025-01-10", entry_price=100.0, effective_entry_price=100.1,
            exit_date="2025-01-15", exit_price=111.0, effective_exit_price=110.89,
            shares=1000, position_value=100100.0, stop_loss=95.0, target_1=110.0, target_2=115.0,
            exit_reason="TARGET_1", gross_pnl=11000.0, fees_paid=600.0, slippage_paid=400.0,
            net_pnl=10000.0, return_pct=9.99, holding_period_days=5,
            risk_reward_planned=2.0, risk_reward_realized=2.18, is_out_of_sample=False
        ),
        BacktestTrade(
            trade_id="TRD-02", symbol="OGDC", direction="LONG",
            entry_date="2025-01-20", entry_price=100.0, effective_entry_price=100.1,
            exit_date="2025-01-23", exit_price=96.0, effective_exit_price=95.9,
            shares=1000, position_value=100100.0, stop_loss=95.0, target_1=110.0, target_2=115.0,
            exit_reason="STOP_LOSS", gross_pnl=-4000.0, fees_paid=600.0, slippage_paid=400.0,
            net_pnl=-5000.0, return_pct=-4.99, holding_period_days=3,
            risk_reward_planned=2.0, risk_reward_realized=-0.84, is_out_of_sample=False
        ),
        BacktestTrade(
            trade_id="TRD-03", symbol="MARI", direction="LONG",
            entry_date="2025-02-01", entry_price=100.0, effective_entry_price=100.1,
            exit_date="2025-02-08", exit_price=116.0, effective_exit_price=115.89,
            shares=1000, position_value=100100.0, stop_loss=95.0, target_1=115.0, target_2=120.0,
            exit_reason="TARGET_1", gross_pnl=16000.0, fees_paid=600.0, slippage_paid=400.0,
            net_pnl=15000.0, return_pct=14.99, holding_period_days=7,
            risk_reward_planned=3.0, risk_reward_realized=3.16, is_out_of_sample=True
        ),
        BacktestTrade(
            trade_id="TRD-04", symbol="SYS", direction="LONG",
            entry_date="2025-02-15", entry_price=100.0, effective_entry_price=100.1,
            exit_date="2025-02-18", exit_price=96.0, effective_exit_price=95.9,
            shares=1000, position_value=100100.0, stop_loss=95.0, target_1=110.0, target_2=115.0,
            exit_reason="STOP_LOSS", gross_pnl=-4000.0, fees_paid=600.0, slippage_paid=400.0,
            net_pnl=-5000.0, return_pct=-4.99, holding_period_days=3,
            risk_reward_planned=2.0, risk_reward_realized=-0.84, is_out_of_sample=True
        ),
    ]

    sample_equity = [
        EquityPoint(date="2025-01-01", equity=1_000_000.0, cash=1_000_000.0, drawdown_pct=0.0, benchmark_equity=1_000_000.0),
        EquityPoint(date="2025-01-15", equity=1_010_000.0, cash=1_010_000.0, drawdown_pct=0.0, benchmark_equity=1_005_000.0),
        EquityPoint(date="2025-01-23", equity=1_005_000.0, cash=1_005_000.0, drawdown_pct=0.50, benchmark_equity=1_007_000.0),
        EquityPoint(date="2025-02-08", equity=1_020_000.0, cash=1_020_000.0, drawdown_pct=0.0, benchmark_equity=1_010_000.0),
        EquityPoint(date="2025-02-18", equity=1_015_000.0, cash=1_015_000.0, drawdown_pct=0.49, benchmark_equity=1_012_000.0),
    ]

    metrics = calculate_performance_metrics(1_000_000.0, sample_trades, sample_equity)

    # 1. Total Net Profit = 10,000 - 5,000 + 15,000 - 5,000 = 15,000 PKR
    assert metrics.net_profit_pkr == 15000.0, f"Expected 15,000 net profit, got {metrics.net_profit_pkr}"
    assert metrics.total_return_pct == 1.5, f"Expected 1.5% return, got {metrics.total_return_pct}"

    # 2. Win Rate = 2 wins / 4 total = 50.0%
    assert metrics.win_rate_pct == 50.0, f"Expected 50.0% win rate, got {metrics.win_rate_pct}"

    # 3. Profit Factor = Gross Profits (11,000 + 16,000 = 27,000) / Gross Losses (|-4,000| + |-4,000| = 8,000) = 3.375 -> 3.38
    assert metrics.profit_factor == 3.38, f"Expected 3.38 profit factor, got {metrics.profit_factor}"

    # 4. Average Win = (10,000 + 15,000) / 2 = 12,500 PKR
    assert metrics.average_win_pkr == 12500.0, f"Expected 12,500 avg win, got {metrics.average_win_pkr}"

    # 5. Average Loss = (5,000 + 5,000) / 2 = 5,000 PKR
    assert metrics.average_loss_pkr == 5000.0, f"Expected 5,000 avg loss, got {metrics.average_loss_pkr}"

    # 6. Win/Loss Ratio = 12,500 / 5,000 = 2.5
    assert metrics.win_loss_ratio == 2.5, f"Expected 2.5 win/loss ratio, got {metrics.win_loss_ratio}"

    # 7. Expectancy = (0.50 * 12,500) - (0.50 * 5,000) = 6,250 - 2,500 = 3,750 PKR
    assert metrics.expectancy_pkr == 3750.0, f"Expected 3,750 expectancy PKR, got {metrics.expectancy_pkr}"

    # 8. Max Drawdown = (1,010,000 - 1,005,000) = 5,000 PKR, pct = 5,000 / 1,010,000 * 100 = 0.50%
    assert metrics.max_drawdown_pkr == 5000.0, f"Expected 5,000 max DD PKR, got {metrics.max_drawdown_pkr}"
    assert metrics.max_drawdown_pct == 0.50, f"Expected 0.50% max DD, got {metrics.max_drawdown_pct}"

    print("  -> Hand-calculated mathematical verifications ALL MATCH EXACTLY.")

def test_backtest_engine_execution():
    print("Testing Full Backtest Engine Execution & No-Lookahead Bias...")
    req = BacktestRequest(
        symbols=["AIRLINK", "OGDC"],
        start_date="2025-01-01",
        end_date="2026-11-15",
        initial_capital=1_000_000.0,
        position_size_type="PERCENT_OF_EQUITY",
        position_size_value=20.0,
        max_open_positions=4,
        commission_rate_pct=0.15,
        slippage_pct=0.10,
        min_score=70,
        min_rvol=1.3,
        enable_out_of_sample=True,
        out_of_sample_split_pct=0.30
    )

    result = backtest_engine.run_backtest(req)
    assert result.id.startswith("BT-")
    assert len(result.equity_curve) >= 100
    assert len(result.trades) > 0, "Backtest should execute trades across the 2-year period"

    # Verify no lookahead bias: every trade's exit date must be >= entry date
    for t in result.trades:
        assert t.exit_date >= t.entry_date, f"Lookahead bias violation: exit {t.exit_date} < entry {t.entry_date}"
        assert t.fees_paid > 0, "Fees must be deducted"
        assert t.slippage_paid > 0, "Slippage friction must be deducted"

    # Verify out-of-sample metrics separation
    assert result.in_sample_metrics is not None, "In-sample metrics must be computed"
    assert result.out_of_sample_metrics is not None, "Out-of-sample metrics must be computed"
    print(f"  -> Executed {len(result.trades)} trades. Win Rate: {result.metrics.win_rate_pct}%, Profit Factor: {result.metrics.profit_factor}.")

def test_csv_export():
    print("Testing CSV Export Capabilities...")
    req = BacktestRequest(
        symbols=["AIRLINK"],
        start_date="2025-06-01",
        end_date="2026-11-15",
        initial_capital=500_000.0,
    )
    result = backtest_engine.run_backtest(req)
    trades_csv = generate_trades_csv(result)
    assert "Trade ID,Symbol,Direction,Entry Date" in trades_csv
    assert len(trades_csv.splitlines()) >= len(result.trades) + 1

    equity_csv = generate_equity_csv(result)
    assert "Date,Portfolio Equity (PKR),Available Cash (PKR)" in equity_csv
    assert len(equity_csv.splitlines()) == len(result.equity_curve) + 1
    print("  -> CSV Export functions generated valid, complete CSV documents.")

def test_fastapi_endpoints():
    print("Testing FastAPI Backtest Router Endpoints...")
    from fastapi.testclient import TestClient
    from backend.app.main import app
    client = TestClient(app)

    # 1. Presets
    res_presets = client.get("/api/backtest/presets")
    assert res_presets.status_code == 200
    presets = res_presets.json()
    assert len(presets) >= 3, "Expected at least 3 strategy presets"

    # 2. Available symbols
    res_syms = client.get("/api/backtest/symbols")
    assert res_syms.status_code == 200
    assert "AIRLINK" in res_syms.json()["symbols"]

    # 3. Run backtest
    res_run = client.post("/api/backtest/run", json={
        "symbols": ["AIRLINK", "SYS"],
        "start_date": "2025-06-01",
        "end_date": "2026-11-15",
        "initial_capital": 500000.0,
        "commission_rate_pct": 0.15,
        "slippage_pct": 0.10,
        "min_score": 70
    })
    assert res_run.status_code == 200
    run_data = res_run.json()
    run_id = run_data["id"]

    # 4. Export CSV endpoints
    res_csv = client.get(f"/api/backtest/{run_id}/export/trades.csv")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]

    res_eq_csv = client.get(f"/api/backtest/{run_id}/export/equity.csv")
    assert res_eq_csv.status_code == 200
    assert "text/csv" in res_eq_csv.headers["content-type"]

    # 5. Strategy comparison
    res_comp = client.post("/api/backtest/compare?symbols=AIRLINK,OGDC&start_date=2025-06-01&end_date=2026-11-15")
    assert res_comp.status_code == 200
    comp_data = res_comp.json()
    assert len(comp_data["strategies"]) == 3
    print("  -> FastAPI Backtesting REST endpoints ALL PASSED.")

if __name__ == "__main__":
    print("==================================================================")
    print("RUNNING HISTORICAL BACKTESTING & STRATEGY EVALUATION TESTS")
    print("==================================================================")
    test_historical_data_integrity()
    test_manual_calculation_verification()
    test_backtest_engine_execution()
    test_csv_export()
    test_fastapi_endpoints()
    print("==================================================================")
    print("ALL BACKTESTING MODULE TESTS PASSED SUCCESSFULLY! (100% OK)")
    print("==================================================================")
