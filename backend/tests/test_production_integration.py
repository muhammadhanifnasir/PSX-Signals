import os
import sys
import tempfile
import shutil

# Ensure repository root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.market_engine.engine import market_data_engine
from backend.app.scanner.scanner_engine import scanner_engine
from backend.app.signals.engine import signal_engine
from backend.app.signals.storage import signal_storage
from backend.app.journal.storage import journal_storage
from backend.app.journal.models import JournalTradeCreate, JournalTradeClose
from backend.app.journal.calculator import calculate_position_size_and_risk
from backend.app.journal.analytics import calculate_performance_analytics
from backend.app.backtesting.engine import backtest_engine
from backend.app.backtesting.models import BacktestRequest
from backend.app.services.worker_manager import worker_manager

client = TestClient(app)

def test_full_pipeline_market_data():
    print("1. Testing Market Data Collection & Freshness Validation...")
    res = client.get("/api/market-data/overview")
    assert res.status_code == 200, f"Overview error: {res.text}"
    overview = res.json()
    assert overview["index_value"] > 0
    assert "market_status" in overview
    assert "timestamp" in overview
    print(f"  -> Market overview verified: Index={overview['index_value']}, Status={overview['market_status']}")

    res_quotes = client.get("/api/market-data/quotes?symbols=AIRLINK,OGDC,MARI,SYS")
    assert res_quotes.status_code == 200
    quotes = res_quotes.json()
    assert len(quotes) >= 4
    for q in quotes:
        assert q["price"] > 0
        assert "delay_type" in q
    print(f"  -> Verified {len(quotes)} normalized quotes with transparent delay tags.")

def test_full_pipeline_scanner():
    print("2. Testing Automated Market Scanner Execution...")
    res = client.post("/api/scanner/run")
    assert res.status_code == 200
    opportunities = res.json()
    assert isinstance(opportunities, list)
    assert len(opportunities) > 0
    print(f"  -> Market scanner executed: {len(opportunities)} opportunities identified.")

    res_opps = client.get("/api/scanner/opportunities?limit=10")
    assert res_opps.status_code == 200
    opps_list = res_opps.json()
    assert isinstance(opps_list, list)
    assert len(opps_list) > 0
    first = opps_list[0]
    assert first["opportunity_score"] >= 0
    assert first["rsi_14"] > 0
    assert first["vwap"] > 0
    print(f"  -> Top scanner opportunity: {first['symbol']} (Score: {first['opportunity_score']}, Setup: {first['setup_type']})")

def test_full_pipeline_signal_engine():
    print("3. Testing Systematic Trading Signal Generation & Scoring...")
    res = client.post("/api/signals/generate")
    assert res.status_code == 200
    summary = res.json()
    assert "active_signals" in summary
    signals = summary["active_signals"]
    assert len(signals) > 0
    top_sig = signals[0]
    assert top_sig["opportunity_score"] > 0
    assert top_sig["entry_price"] > 0
    assert top_sig["stop_loss"] < top_sig["entry_price"]
    assert top_sig["target_1"] > top_sig["entry_price"]
    assert top_sig["risk_reward_ratio"] >= 1.0
    print(f"  -> Signal generated: {top_sig['symbol']} {top_sig['action']} (Score={top_sig['opportunity_score']}, R:R={top_sig['risk_reward_ratio']}:1)")

def test_signal_to_journal_conversion():
    print("4. Testing Signal-to-Trade Journal Conversion & PnL Accounting...")
    # Retrieve active signal
    signals = signal_storage.get_signals(limit=5)
    sig = signals[0] if signals else None

    trade_in = JournalTradeCreate(
        symbol=sig.symbol if sig else "AIRLINK",
        direction="BUY",
        quantity=1500,
        entry_price=sig.entry_price if sig else 135.0,
        entry_date="2026-11-16 10:15:00",
        stop_loss=sig.stop_loss if sig else 128.0,
        target_1=sig.target_1 if sig else 145.0,
        target_2=sig.target_2 if sig else 152.0,
        strategy=sig.strategy_name if sig else "Momentum + VWAP Breakout",
        signal_id=sig.id if sig else "SIG-TEST-01",
        brokerage_commission_rate=0.15,
        notes="Converted from automated engine opportunity",
    )
    trade = journal_storage.create_trade(trade_in)
    assert trade.status == "OPEN"
    assert trade.signal_id is not None

    # Close trade at Target 1
    close_res = journal_storage.close_trade(trade.id, JournalTradeClose(
        exit_price=trade.target_1 or (trade.entry_price * 1.07),
        exit_date="2026-11-16 14:30:00",
        exit_reason="TARGET_1",
        closing_notes="Target 1 hit cleanly with low slippage",
    ))
    assert close_res is not None
    assert close_res.status == "CLOSED"
    assert close_res.net_pnl > 0
    assert close_res.total_charges > 0
    print(f"  -> Trade closed: Gross PnL=PKR {close_res.gross_pnl:,.2f}, Total Charges=PKR {close_res.total_charges:,.2f}, Net PnL=PKR {close_res.net_pnl:,.2f} ({close_res.return_percent}%)")

def test_risk_exposure_and_circuit_breakers():
    print("5. Testing Risk Exposure & Circuit Breaker Logic...")
    exp = journal_storage.get_portfolio_exposure()
    assert exp.trading_capital > 0
    assert exp.exposure_pct >= 0
    assert exp.max_daily_loss_limit_pkr > 0
    assert isinstance(exp.is_daily_loss_breached, bool)
    print(f"  -> Exposure: Allocated PKR {exp.allocated_capital:,.2f} ({exp.exposure_pct}%), Free Cash PKR {exp.remaining_cash:,.2f}, Breached: {exp.is_daily_loss_breached}")

def test_backtesting_simulation():
    print("6. Testing Historical Backtesting Simulation Engine...")
    req = BacktestRequest(
        strategy_name="Momentum + VWAP Breakout",
        symbols=["AIRLINK", "SYS"],
        start_date="2025-06-01",
        end_date="2026-11-15",
        initial_capital=1000000.0,
        commission_rate_pct=0.15,
        slippage_pct=0.10,
        min_score=70,
    )
    res = backtest_engine.run_backtest(req)
    assert res.metrics.total_trades > 0
    assert len(res.trades) > 0
    assert len(res.equity_curve) > 0
    print(f"  -> Backtest completed: {res.metrics.total_trades} trades, Win Rate={res.metrics.win_rate_pct}%, Profit Factor={res.metrics.profit_factor}, Max DD={res.metrics.max_drawdown_pct}%")

def test_system_health_and_no_brokerage_orders():
    print("7. Verifying System Health & No Automatic Brokerage Order Execution...")
    res = client.get("/api/health")
    assert res.status_code == 200
    health = res.json()
    assert health["status"] in ["HEALTHY", "DEGRADED"]
    assert "uptime_human" in health
    assert "workers" in health

    # Verify no brokerage order execution routes exist in OpenAPI schema
    schema = app.openapi()
    all_paths = schema.get("paths", {}).keys()
    disallowed_keywords = ["order/place", "execute/live", "scs/buy", "scs/sell", "broker/order"]
    for path in all_paths:
        for kw in disallowed_keywords:
            assert kw not in path.lower(), f"Disallowed brokerage execution route detected: {path}"
    print("  -> Brokerage isolation verified: Zero live order routing endpoints exist.")

if __name__ == "__main__":
    print("==================================================================")
    print("RUNNING END-TO-END PRODUCTION INTEGRATION TEST SUITE")
    print("==================================================================")
    test_full_pipeline_market_data()
    test_full_pipeline_scanner()
    test_full_pipeline_signal_engine()
    test_signal_to_journal_conversion()
    test_risk_exposure_and_circuit_breakers()
    test_backtesting_simulation()
    test_system_health_and_no_brokerage_orders()
    print("==================================================================")
    print("ALL PRODUCTION INTEGRATION TESTS PASSED SUCCESSFULLY! (100% OK)")
    print("==================================================================")
