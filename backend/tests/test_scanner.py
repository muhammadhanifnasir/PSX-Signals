# Standalone test runner for market scanner indicators and logic
import os
import sys

# Ensure repository root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import datetime
from backend.app.scanner.models import SetupType, ScannerThresholds, StockOpportunity
from backend.app.scanner.indicators import (
    calculate_vwap,
    calculate_rsi,
    calculate_ema_series,
    calculate_atr,
    calculate_support_resistance,
    calculate_rvol,
    determine_ema_trend,
    calculate_momentum_score,
    detect_setup_type,
    check_late_entry_risk,
    calculate_composite_opportunity_score,
)
from backend.app.market_engine.models import NormalizedQuote, DataDelayType, ProviderType

def test_vwap_calculation():
    # Sample candles
    candles = [
        {"high": 105.0, "low": 98.0, "close": 102.0, "volume": 1000},  # TP = (105+98+102)/3 = 101.67, TP*Vol = 101666.67
        {"high": 110.0, "low": 101.0, "close": 108.0, "volume": 2000}, # TP = (110+101+108)/3 = 106.33, TP*Vol = 212666.67
    ]
    # Sum TP*Vol = 314333.34, Sum Vol = 3000 -> VWAP = 104.78
    vwap = calculate_vwap(candles, 108.0, 3000)
    assert 104.0 <= vwap <= 106.0
    print("test_vwap_calculation passed:", vwap)

def test_rsi_calculation():
    # Monotonically increasing prices -> RSI should be high
    uptrend_prices = [100.0 + i * 2.0 for i in range(25)]
    rsi_up = calculate_rsi(uptrend_prices, 14)
    assert rsi_up > 80.0

    # Monotonically decreasing prices -> RSI should be low
    downtrend_prices = [150.0 - i * 2.0 for i in range(25)]
    rsi_down = calculate_rsi(downtrend_prices, 14)
    assert rsi_down < 20.0
    print("test_rsi_calculation passed:", rsi_up, rsi_down)

def test_ema_trend_determination():
    # Strong upward trend
    prices = [100.0 + (i * 1.5) for i in range(40)]
    trend = determine_ema_trend(162.0, prices)
    assert "Bullish" in trend
    print("test_ema_trend_determination passed:", trend)

def test_atr_volatility_calculation():
    highs = [105.0, 108.0, 112.0, 110.0, 115.0] * 3
    lows = [98.0, 101.0, 105.0, 104.0, 107.0] * 3
    closes = [102.0, 106.0, 109.0, 108.0, 114.0] * 3
    atr = calculate_atr(highs, lows, closes, 14)
    assert atr > 0.0
    assert 5.0 <= atr <= 10.0
    print("test_atr_volatility_calculation passed:", atr)

def test_rvol_calculation():
    hist_vols = [100_000, 120_000, 95_000, 110_000, 105_000] * 4
    # Current volume 250,000 -> RVOL ~ 2.36x
    rvol = calculate_rvol(250_000, hist_vols)
    assert 2.0 <= rvol <= 2.6
    print("test_rvol_calculation passed:", rvol)

def test_support_and_resistance():
    high = 150.0
    low = 140.0
    close = 148.0
    support, resistance = calculate_support_resistance(high, low, close, [])
    # Pivot = (150+140+148)/3 = 146.0
    # R1 = 2*146 - 140 = 152.0
    # S1 = 2*146 - 150 = 142.0
    assert support == 142.0
    assert resistance == 152.0
    print("test_support_and_resistance passed:", support, resistance)

def test_momentum_score():
    score_high = calculate_momentum_score(change_pct=5.5, rsi=65.0, rvol=2.5)
    score_low = calculate_momentum_score(change_pct=-3.0, rsi=35.0, rvol=0.8)
    assert score_high > 75
    assert score_low < 45
    print("test_momentum_score passed:", score_high, score_low)

def test_setup_detection():
    # Breakout setup
    setup_bo, desc_bo = detect_setup_type(
        price=151.8, vwap=147.0, support=142.0, resistance=152.0,
        ema_trend="Strong Bullish", rsi=66.0, rvol=2.1, change_pct=4.2
    )
    assert setup_bo == SetupType.BREAKOUT

    # VWAP Reclaim setup
    setup_vwap, desc_vwap = detect_setup_type(
        price=147.2, vwap=147.0, support=142.0, resistance=155.0,
        ema_trend="Bullish", rsi=54.0, rvol=1.5, change_pct=1.8
    )
    assert setup_vwap == SetupType.VWAP_RECLAIM
    print("test_setup_detection passed:", setup_bo, setup_vwap)

def test_late_entry_protection():
    # Stock up +7.1% near +7.5% upper lock -> Late entry risk
    is_late_1, msg_1 = check_late_entry_risk(
        price=107.1, resistance=107.5, ldcp=100.0, change_pct=7.1, late_buffer_pct=1.2
    )
    assert is_late_1 is True
    assert "circuit lock" in msg_1.lower()

    # Stock up +2.5% with plenty of room to resistance -> Optimal entry
    is_late_2, msg_2 = check_late_entry_risk(
        price=102.5, resistance=115.0, ldcp=100.0, change_pct=2.5, late_buffer_pct=1.2
    )
    assert is_late_2 is False
    print("test_late_entry_protection passed:", msg_1, msg_2)

def test_composite_opportunity_scoring_and_ranking():
    score_breakout = calculate_composite_opportunity_score(
        momentum_score=85, rvol=2.5, setup_type=SetupType.BREAKOUT,
        is_late_entry=False, risk_reward=2.8, is_stale=False
    )
    score_late = calculate_composite_opportunity_score(
        momentum_score=85, rvol=2.5, setup_type=SetupType.BREAKOUT,
        is_late_entry=True, risk_reward=2.8, is_stale=False
    )
    score_stale = calculate_composite_opportunity_score(
        momentum_score=85, rvol=2.5, setup_type=SetupType.BREAKOUT,
        is_late_entry=False, risk_reward=2.8, is_stale=True
    )

    assert score_breakout > 85
    assert score_late < score_breakout # Late entry penalized
    assert score_stale == 0            # Stale data completely rejected (0 score)
    print("test_composite_opportunity_scoring_and_ranking passed:", score_breakout, score_late, score_stale)

if __name__ == "__main__":
    test_vwap_calculation()
    test_rsi_calculation()
    test_ema_trend_determination()
    test_atr_volatility_calculation()
    test_rvol_calculation()
    test_support_and_resistance()
    test_momentum_score()
    test_setup_detection()
    test_late_entry_protection()
    test_composite_opportunity_scoring_and_ranking()
    print("\nALL SCANNER TESTS PASSED SUCCESSFULLY!")
