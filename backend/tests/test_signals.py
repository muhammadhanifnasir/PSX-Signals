# Standalone automated test suite for Trading Signal Engine
import os
import sys

# Ensure repository root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import datetime
from backend.app.market_engine.models import NormalizedQuote, DataDelayType, ProviderType
from backend.app.signals.models import (
    SignalState,
    SignalStatus,
    StrategyConfig,
    TradingSignal,
    ScoreBreakdown,
    ConditionsMet,
)
from backend.app.signals.engine import signal_engine
from backend.app.signals.storage import signal_storage

def create_sample_quote(
    symbol: str = "AIRLINK",
    price: float = 142.0,
    change_pct: float = 4.5,
    volume: int = 5_000_000,
    high: float = 144.0,
    low: float = 138.0,
    ldcp: float = 136.0,
    is_valid: bool = True,
    age_seconds: int = 120
) -> NormalizedQuote:
    now = datetime.datetime.now()
    quote_time = now - datetime.timedelta(seconds=age_seconds)
    return NormalizedQuote(
        symbol=symbol,
        sector="Technology & Comm.",
        price=price,
        change=price - ldcp,
        change_percent=change_pct,
        open_price=138.5,
        high_price=high,
        low_price=low,
        ldcp=ldcp,
        volume=volume,
        tags="KMI30, KSE100",
        timestamp=quote_time.isoformat(),
        source_timestamp=quote_time.strftime("%Y-%m-%d %H:%M:%S"),
        delay_type=DataDelayType.DELAYED_15MIN,
        provider=ProviderType.PSX_PORTAL,
        is_valid=is_valid,
        validation_notes=[]
    )

def test_strategy_configuration_and_versioning():
    print("Testing Strategy Configuration & Versioning...")
    config = signal_engine.config
    assert config.strategy_name == "Momentum + Volume + VWAP + Breakout"
    assert config.strategy_version == "1.0.0"
    assert config.min_score >= 60
    assert config.min_rvol >= 1.0
    print("  -> Passed: Strategy configuration & version verified.")

def test_buy_candidate_conditions_evaluation():
    print("Testing BUY CANDIDATE Condition Evaluation...")
    # Perfect bullish candidate: +4.5%, heavy volume, good range, fresh data
    quote = create_sample_quote(
        symbol="OGDC",
        price=165.0,
        change_pct=4.2,
        volume=12_000_000,
        high=166.0,
        low=159.0,
        ldcp=158.35,
        age_seconds=60
    )

    signal = signal_engine.evaluate_quote(quote)

    # Validate all 9 conditions
    conds = signal.conditions_met
    assert conds.price_above_vwap is True
    assert conds.ema_alignment is True
    assert conds.breakout_or_pullback is True
    assert conds.rvol_confirmation is True
    assert conds.rsi_momentum is True
    assert conds.adequate_liquidity is True
    assert conds.acceptable_vwap_distance is True
    assert conds.acceptable_risk_reward is True
    assert conds.fresh_and_validated_data is True

    # Validate state and score
    assert signal.signal_type == SignalState.BUY_CANDIDATE
    assert signal.opportunity_score >= signal_engine.config.min_score
    assert signal.action in ["BUY", "STRONG_BUY"]
    print(f"  -> Passed: Evaluated BUY_CANDIDATE (Score: {signal.opportunity_score}/100, Action: {signal.action}).")

def test_stale_data_rejection_no_buy_signals():
    print("Testing Stale Data Rejection (Strict Rule)...")
    # Quote is 45 minutes old (2700s > 1800s threshold)
    stale_quote = create_sample_quote(
        symbol="LUCK",
        price=950.0,
        change_pct=5.2,
        volume=8_000_000,
        high=955.0,
        low=900.0,
        ldcp=903.0,
        age_seconds=2700 # Stale!
    )

    signal = signal_engine.evaluate_quote(stale_quote)

    assert signal.is_stale is True
    assert signal.conditions_met.fresh_and_validated_data is False
    assert signal.signal_type == SignalState.NO_TRADE # Never generate BUY from stale data
    assert signal.opportunity_score == 0             # Score strictly zeroed
    assert "stale" in signal.invalidation_reason.lower()
    print("  -> Passed: Stale quote strictly rejected from BUY signal generation (Score = 0, State = NO_TRADE).")

def test_vwap_and_ema_rejection():
    print("Testing VWAP and EMA Rejection...")
    # Bearish stock: price falling (-3.0%), under VWAP and EMA 9 < 21
    quote = create_sample_quote(
        symbol="TELE",
        price=8.5,
        change_pct=-3.2,
        volume=3_000_000,
        high=9.2,
        low=8.4,
        ldcp=8.78
    )

    signal = signal_engine.evaluate_quote(quote)

    assert signal.conditions_met.ema_alignment is False
    assert signal.signal_type != SignalState.BUY_CANDIDATE
    print(f"  -> Passed: Bearish stock rejected from Buy candidate (State: {signal.signal_type.value}).")

def test_wait_state_on_overextended_vwap_distance():
    print("Testing WAIT State on Overextended VWAP Distance...")
    # Stock up +7.2% near circuit lock with large gap above VWAP
    quote = create_sample_quote(
        symbol="ATRL",
        price=415.0,
        change_pct=7.2, # Near upper circuit
        volume=15_000_000,
        high=416.0,
        low=385.0,
        ldcp=387.1
    )

    signal = signal_engine.evaluate_quote(quote)

    # Should trigger WAIT state for pullback rather than chasing top
    assert signal.signal_type == SignalState.WAIT
    assert signal.action == "WAIT"
    assert "wait" in signal.catalyst_notes.lower()
    print("  -> Passed: Overextended entry properly mapped to WAIT state.")

def test_entry_zone_stop_loss_and_target_calculations():
    print("Testing Entry Zone, Stop-Loss, and Target Calculations...")
    quote = create_sample_quote(
        symbol="SYS",
        price=480.0,
        change_pct=3.5,
        volume=7_000_000,
        high=485.0,
        low=465.0,
        ldcp=463.76
    )

    signal = signal_engine.evaluate_quote(quote)

    # Check Entry Zone
    assert signal.entry_zone_low <= signal.entry_price
    assert signal.entry_zone_high >= signal.entry_price

    # Check Stop Loss strictly below entry
    assert signal.stop_loss < signal.entry_price
    initial_risk = signal.entry_price - signal.stop_loss
    assert initial_risk > 0.5

    # Check Targets
    assert signal.target_1 > signal.entry_price
    assert signal.target_2 > signal.target_1
    assert signal.target_1 >= round(signal.entry_price + (initial_risk * 1.4), 2)
    assert signal.target_2 >= round(signal.entry_price + (initial_risk * 2.4), 2)

    # Check Risk:Reward
    assert signal.risk_reward_ratio >= 1.5
    print(f"  -> Passed: Entry Rs. {signal.entry_price}, SL Rs. {signal.stop_loss}, T1 Rs. {signal.target_1}, T2 Rs. {signal.target_2}, R:R {signal.risk_reward_ratio}.")

def test_weighted_opportunity_scoring_breakdown():
    print("Testing Weighted Opportunity Scoring Breakdown (0-100)...")
    quote = create_sample_quote(
        symbol="MEBL",
        price=238.0,
        change_pct=2.8,
        volume=4_500_000,
        high=240.0,
        low=232.0,
        ldcp=231.5
    )

    signal = signal_engine.evaluate_quote(quote)
    bd = signal.score_breakdown

    assert 0 <= bd.momentum_score <= 25
    assert 0 <= bd.volume_score <= 25
    assert 0 <= bd.vwap_ema_score <= 25
    assert 0 <= bd.setup_rr_score <= 25
    assert bd.total_score == signal.opportunity_score
    assert 0 <= signal.opportunity_score <= 100
    print(f"  -> Passed: Score Breakdown (M:{bd.momentum_score}, V:{bd.volume_score}, VWAP:{bd.vwap_ema_score}, Setup:{bd.setup_rr_score} -> Total: {bd.total_score}/100).")

def test_duplicate_signal_prevention():
    print("Testing Duplicate Signal Prevention...")
    # Save a signal
    quote = create_sample_quote(symbol="TESTDUPL", price=100.0, change_pct=3.0)
    sig1 = signal_engine.evaluate_quote(quote)
    signal_storage.save_signal(sig1)

    existing = signal_storage.get_active_signal_for_symbol("TESTDUPL")
    assert existing is not None
    assert existing.id == sig1.id
    print("  -> Passed: Existing active signal correctly identified by symbol.")

def test_signal_invalidation_and_lifecycle():
    print("Testing Signal Invalidation and Lifecycle...")
    quote = create_sample_quote(symbol="TESTEXIT", price=50.0, change_pct=-5.5, low=45.0)
    sig = signal_engine.evaluate_quote(quote)

    assert sig.signal_type == SignalState.EXIT
    assert sig.action == "EXIT"
    assert sig.exit_reason is not None
    print(f"  -> Passed: Breakdown triggers EXIT (Reason: {sig.exit_reason}).")

def test_never_present_score_as_guaranteed_profit():
    print("Testing Disclaimer & Profit Guarantee Guard...")
    quote = create_sample_quote(symbol="GUARD", price=100.0)
    sig = signal_engine.evaluate_quote(quote)

    assert "NEVER a guaranteed probability of profit" in sig.disclaimer
    print("  -> Passed: Non-guarantee compliance disclaimer verified.")

if __name__ == "__main__":
    test_strategy_configuration_and_versioning()
    test_buy_candidate_conditions_evaluation()
    test_stale_data_rejection_no_buy_signals()
    test_vwap_and_ema_rejection()
    test_wait_state_on_overextended_vwap_distance()
    test_entry_zone_stop_loss_and_target_calculations()
    test_weighted_opportunity_scoring_breakdown()
    test_duplicate_signal_prevention()
    test_signal_invalidation_and_lifecycle()
    test_never_present_score_as_guaranteed_profit()
    print("\nALL 10 TRADING SIGNAL ENGINE UNIT TESTS PASSED SUCCESSFULLY!")
