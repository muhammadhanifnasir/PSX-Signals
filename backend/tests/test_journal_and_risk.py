import os
import sys
import tempfile
import shutil

# Ensure repository root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.journal.models import (
    JournalTradeCreate,
    JournalTradeClose,
    JournalTradeUpdate,
    RiskSettings,
    RiskCalculationRequest,
)
from backend.app.journal.storage import JournalStorage
from backend.app.journal.calculator import calculate_position_size_and_risk
from backend.app.journal.analytics import calculate_performance_analytics
from backend.app.journal.export import generate_journal_csv

client = TestClient(app)

def test_trade_creation_and_retrieval():
    print("Testing Manual Trade Creation, Validation & Retrieval...")
    temp_dir = tempfile.mkdtemp()
    try:
        storage = JournalStorage(db_path=os.path.join(temp_dir, "test.db"))
        trade_in = JournalTradeCreate(
            symbol="ENGRO",
            direction="BUY",
            quantity=500,
            entry_price=320.00,
            entry_date="2026-11-15 10:00:00",
            stop_loss=304.00,
            target_1=352.00,
            target_2=370.00,
            strategy="Momentum + VWAP Breakout",
            setup_type="BREAKOUT",
            brokerage_commission_rate=0.15,
            notes="Fertilizer demand expansion thesis",
        )
        trade = storage.create_trade(trade_in)
        assert trade.id.startswith("TJ-"), f"Expected ID starting with TJ-, got {trade.id}"
        assert trade.symbol == "ENGRO"
        assert trade.quantity == 500
        assert trade.entry_price == 320.00
        assert trade.status == "OPEN"
        assert trade.position_value == 160000.00
        assert trade.total_charges == round(160000.00 * 0.0015, 2)  # 240.0

        retrieved = storage.get_trade(trade.id)
        assert retrieved is not None
        assert retrieved.symbol == "ENGRO"
        print("  -> Trade creation, fees initialization, and retrieval: PASSED")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def test_trade_pnl_calculation_and_closing():
    print("Testing Trade Closing & Exact Realized PnL Mathematics...")
    temp_dir = tempfile.mkdtemp()
    try:
        storage = JournalStorage(db_path=os.path.join(temp_dir, "test.db"))
        trade_in = JournalTradeCreate(
            symbol="HUBC",
            direction="BUY",
            quantity=1000,
            entry_price=120.00,
            entry_date="2026-11-12 09:30:00",
            stop_loss=114.00,
            target_1=132.00,
            brokerage_commission_rate=0.15,
        )
        trade = storage.create_trade(trade_in)
        assert trade.position_value == 120000.00

        close_data = JournalTradeClose(
            exit_price=132.00,
            exit_date="2026-11-16 11:00:00",
            exit_reason="TARGET_1",
            closing_notes="Hit Target 1 smoothly",
        )
        closed = storage.close_trade(trade.id, close_data)
        assert closed is not None
        assert closed.status == "CLOSED"
        assert closed.exit_price == 132.00

        # Exact Math verification:
        # Gross PnL = 1000 * (132.00 - 120.00) = 12,000.00
        assert closed.gross_pnl == 12000.00, f"Expected 12000.0, got {closed.gross_pnl}"
        # Entry fee = 1000 * 120 * 0.0015 = 180.00
        # Exit fee = 1000 * 132 * 0.0015 = 198.00
        # Total charges = 378.00
        assert closed.total_charges == 378.00, f"Expected 378.0, got {closed.total_charges}"
        # Net PnL = 12000 - 378 = 11,622.00
        assert closed.net_pnl == 11622.00, f"Expected 11622.0, got {closed.net_pnl}"
        # Return % = 11,622 / 120,000 * 100 = 9.685% -> 9.69%
        assert closed.return_percent == 9.69, f"Expected 9.69%, got {closed.return_percent}%"
        print("  -> Trade closure, commission accounting, and return % math: PASSED")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def test_position_sizing_calculator():
    print("Testing Position Sizing Engine & Defensive Risk Warnings...")
    settings = RiskSettings(
        trading_capital=1000000.0,
        max_risk_per_trade_pct=1.5,
        max_single_position_pct=25.0,
        commission_rate_pct=0.15,
    )

    req = RiskCalculationRequest(
        symbol="AIRLINK",
        entry_price=100.00,
        stop_loss=95.00,
        target_1=110.00,
        target_2=120.00,
    )

    result = calculate_position_size_and_risk(req, settings)
    # SL distance = 5.0 PKR (5.0%)
    assert result.stop_loss_distance_pkr == 5.00
    assert result.stop_loss_distance_pct == 5.00
    # Risk amount = 1,000,000 * 1.5% = 15,000 PKR
    assert result.risk_amount_pkr == 15000.00
    # Raw shares = 15,000 / 5 = 3,000 shares
    # Max single pos limit = 25% of 1,000,000 = 250,000 PKR -> 2,500 shares max
    # Recommended shares should be capped at 2,500!
    assert result.recommended_shares == 2500, f"Expected 2500, got {result.recommended_shares}"
    assert result.recommended_position_value == 250000.00
    assert result.position_size_pct_of_capital == 25.00
    # Target 1 R:R = (110 - 100) / 5 = 2.0:1
    assert result.target_1_rr == 2.0
    # Target 2 R:R = (120 - 100) / 5 = 4.0:1
    assert result.target_2_rr == 4.0
    # Cap warning should be triggered
    assert any("capped from 3000 to 2500" in w for w in result.warnings)
    print("  -> Position sizing, 25% single-allocation cap, and R:R ratios: PASSED")

def test_portfolio_exposure_and_warnings():
    print("Testing Portfolio Exposure, Sector Ceilings & Concurrency Limits...")
    temp_dir = tempfile.mkdtemp()
    try:
        storage = JournalStorage(db_path=os.path.join(temp_dir, "test.db"))
        exposure = storage.get_portfolio_exposure()
        assert exposure.trading_capital == 1000000.0
        assert exposure.open_positions_count >= 1
        assert exposure.remaining_cash > 0
        assert isinstance(exposure.sector_exposure, dict)
        print(f"  -> Exposure calculated: PKR {exposure.allocated_capital:,.2f} allocated ({exposure.exposure_pct}%), {exposure.open_positions_count} open trades: PASSED")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def test_performance_analytics_calculation():
    print("Testing Performance Analytics Mathematical Aggregation...")
    temp_dir = tempfile.mkdtemp()
    try:
        storage = JournalStorage(db_path=os.path.join(temp_dir, "test.db"))
        trades = storage.get_trades()
        report = calculate_performance_analytics(trades, initial_capital=1000000.0)

        assert report.total_trades >= 4
        assert report.closed_trades_count >= 3
        assert report.winning_trades >= 2
        assert report.win_rate_pct > 0
        assert report.profit_factor > 0
        assert report.expectancy_pkr > 0
        assert len(report.strategy_breakdown) >= 1
        assert len(report.monthly_performance) >= 1
        print(f"  -> Analytics verified: Win Rate={report.win_rate_pct}%, PF={report.profit_factor}, Expectancy=PKR {report.expectancy_pkr}: PASSED")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def test_journal_csv_export():
    print("Testing Trade Journal RFC 4180 CSV Export...")
    temp_dir = tempfile.mkdtemp()
    try:
        storage = JournalStorage(db_path=os.path.join(temp_dir, "test.db"))
        trades = storage.get_trades()
        csv_str = generate_journal_csv(trades)
        lines = csv_str.strip().split("\n")
        assert len(lines) >= 5
        assert "Trade ID" in lines[0]
        assert "Net PnL (PKR)" in lines[0]
        assert "Return %" in lines[0]
        print(f"  -> Journal CSV export valid with {len(lines)} lines: PASSED")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def test_fastapi_journal_routes():
    print("Testing FastAPI Trade Journal & Risk Management REST Endpoints...")
    # 1. Get trades
    res = client.get("/api/journal/trades")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    trades = res.json()
    assert isinstance(trades, list)

    # 2. Get risk settings
    res = client.get("/api/journal/risk/settings")
    assert res.status_code == 200
    settings = res.json()
    assert settings["trading_capital"] == 1000000.0

    # 3. Calculate risk
    res = client.post("/api/journal/risk/calculate", json={
        "symbol": "SYS",
        "entry_price": 500.0,
        "stop_loss": 480.0,
        "target_1": 540.0,
        "target_2": 570.0
    })
    assert res.status_code == 200
    calc = res.json()
    assert calc["stop_loss_distance_pkr"] == 20.0
    assert calc["target_1_rr"] == 2.0

    # 4. Get portfolio exposure
    res = client.get("/api/journal/risk/exposure")
    assert res.status_code == 200
    exp = res.json()
    assert "exposure_pct" in exp

    # 5. Get performance analytics
    res = client.get("/api/journal/analytics")
    assert res.status_code == 200
    analytics = res.json()
    assert "win_rate_pct" in analytics
    assert "profit_factor" in analytics

    # 6. CSV download
    res = client.get("/api/journal/export.csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")
    assert "Trade ID" in res.text
    print("  -> FastAPI Trade Journal & Risk Management REST endpoints: ALL PASSED")

if __name__ == "__main__":
    print("==================================================================")
    print("RUNNING TRADE JOURNAL, RISK CENTER & PERFORMANCE ANALYTICS TESTS")
    print("==================================================================")
    test_trade_creation_and_retrieval()
    test_trade_pnl_calculation_and_closing()
    test_position_sizing_calculator()
    test_portfolio_exposure_and_warnings()
    test_performance_analytics_calculation()
    test_journal_csv_export()
    test_fastapi_journal_routes()
    print("==================================================================")
    print("ALL TRADE JOURNAL & RISK CENTER TESTS PASSED SUCCESSFULLY! (100% OK)")
    print("==================================================================")
