from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SignalState(str, Enum):
    BUY_CANDIDATE = "BUY_CANDIDATE"
    WATCH = "WATCH"
    WAIT = "WAIT"
    EXIT = "EXIT"
    NO_TRADE = "NO_TRADE"

class SignalStatus(str, Enum):
    ACTIVE = "ACTIVE"
    TARGET_1_HIT = "TARGET_1_HIT"
    TARGET_2_HIT = "TARGET_2_HIT"
    STOPPED_OUT = "STOPPED_OUT"
    EXPIRED = "EXPIRED"
    INVALIDATED = "INVALIDATED"

class StrategyConfig(BaseModel):
    strategy_name: str = "Momentum + Volume + VWAP + Breakout"
    strategy_version: str = "1.0.0"
    min_score: int = Field(default=70, description="Minimum weighted score for BUY CANDIDATE (0-100)")
    watch_min_score: int = Field(default=55, description="Minimum weighted score for WATCH list (0-100)")
    min_volume: int = Field(default=100_000, description="Minimum shares traded today")
    min_turnover_pkr: float = Field(default=2_000_000.0, description="Minimum traded value in PKR")
    min_rvol: float = Field(default=1.3, description="Minimum relative volume vs 20-day average")
    min_rsi: float = Field(default=48.0, description="Minimum RSI(14) for bullish momentum")
    max_rsi: float = Field(default=75.0, description="Maximum RSI(14) to prevent buying extreme overbought tops")
    max_vwap_distance_pct: float = Field(default=3.5, description="Maximum % distance above VWAP before triggering WAIT state")
    min_risk_reward: float = Field(default=1.8, description="Minimum acceptable Target 1 risk-to-reward ratio")
    atr_stop_multiplier: float = Field(default=1.5, description="ATR multiplier for dynamic stop-loss buffer")
    target_1_multiplier: float = Field(default=1.8, description="Target 1 multiple of initial risk")
    target_2_multiplier: float = Field(default=2.8, description="Target 2 multiple of initial risk")
    max_stale_seconds: int = Field(default=1800, description="Maximum observation age in seconds (30m)")
    expiry_hours: int = Field(default=24, description="Signal validity window in trading hours")

class ScoreBreakdown(BaseModel):
    momentum_score: int = Field(ge=0, le=25, description="RSI momentum and day change contribution (max 25)")
    volume_score: int = Field(ge=0, le=25, description="Volume and RVOL surge contribution (max 25)")
    vwap_ema_score: int = Field(ge=0, le=25, description="Price > VWAP and EMA 9 > 21 alignment contribution (max 25)")
    setup_rr_score: int = Field(ge=0, le=25, description="Breakout/Pullback pattern & Risk:Reward ratio contribution (max 25)")
    penalty_deduction: int = Field(default=0, description="Deductions for late entry or proximity to circuit lock")
    total_score: int = Field(ge=0, le=100, description="Composite weighted opportunity score")

class ConditionsMet(BaseModel):
    price_above_vwap: bool = Field(description="Current price is strictly above intraday VWAP")
    ema_alignment: bool = Field(description="EMA 9 is strictly above EMA 21 (uptrend confirmation)")
    breakout_or_pullback: bool = Field(description="Confirmed horizontal breakout or valid pullback to dynamic support")
    rvol_confirmation: bool = Field(description="Relative volume >= min_rvol vs 20-day session average")
    rsi_momentum: bool = Field(description="RSI(14) is between min_rsi and max_rsi")
    adequate_liquidity: bool = Field(description="Daily traded volume and PKR turnover exceed minimum liquidity thresholds")
    acceptable_vwap_distance: bool = Field(description="Price is within acceptable distance from VWAP (not overextended)")
    acceptable_risk_reward: bool = Field(description="Risk-to-reward ratio for Target 1 >= min_risk_reward")
    fresh_and_validated_data: bool = Field(description="Observation is recent, non-stale, and structurally validated")

class SignalLifecycleEvent(BaseModel):
    id: str
    signal_id: str
    timestamp: str
    previous_status: str
    new_status: str
    price_at_event: float
    note: str

class TradingSignal(BaseModel):
    id: str = Field(description="Unique signal ID e.g. SIG-PSX-AIRLINK-20261116-01")
    symbol: str
    company_name: str
    sector: str
    strategy_name: str
    strategy_version: str
    signal_type: SignalState = Field(description="BUY_CANDIDATE, WATCH, WAIT, EXIT, NO_TRADE")
    action: str = Field(description="UI legacy action compatibility: BUY, WATCH, WAIT, EXIT, HOLD")
    status: SignalStatus = Field(default=SignalStatus.ACTIVE)
    current_price: float
    entry_zone_low: float
    entry_zone_high: float
    entry_price: float = Field(description="Recommended entry price (midpoint of entry zone or market)")
    stop_loss: float = Field(description="Calculated stop-loss based on ATR and technical structure")
    target_1: float = Field(description="Conservative Target 1 based on 1.5x risk")
    target_2: float = Field(description="Extended Target 2 based on 2.5x risk")
    target_3: Optional[float] = None
    risk_reward_ratio: float = Field(description="Calculated Risk:Reward ratio based on Target 1")
    potential_gain_target_1_pct: float
    potential_gain_target_2_pct: float
    max_risk_pct: float
    opportunity_score: int = Field(ge=0, le=100, description="Weighted quantitative opportunity ranking. NOT a guaranteed profit probability.")
    score_breakdown: ScoreBreakdown
    conditions_met: ConditionsMet
    vwap: float
    vwap_distance_pct: float
    ema_9: float
    ema_21: float
    ema_trend: str
    rsi_14: float
    relative_volume: float
    atr_14: float
    circuit_breaker_upper: float = 0.0
    circuit_breaker_lower: float = 0.0
    circuit_status: str = "NORMAL"
    cap_distance_pct: float = 0.0
    is_shariah_compliant: bool = True
    is_defaulter: bool = False
    is_non_compliant: bool = False
    regulatory_category: str = "MAINBOARD"
    sector_quadrant: Optional[str] = "LEADING"
    macro_regime: Optional[str] = "BULL_CONSOLIDATION"
    invalidation_reason: Optional[str] = None
    exit_reason: Optional[str] = None
    catalyst_notes: str = ""
    timeframe: str = "1D / Intraday"
    data_freshness_seconds: int
    data_delay_type: str
    is_stale: bool
    created_at: str
    updated_at: str
    valid_until: str
    is_mock: bool = False
    disclaimer: str = (
        "Opportunity score is a quantitative algorithmic ranking of technical confluence. "
        "It is NEVER a guaranteed probability of profit. All trades carry risk. Execute manually on SCSTrade with strict risk management."
    )

class SignalEngineSummary(BaseModel):
    strategy_name: str
    strategy_version: str
    last_generation_timestamp: str
    total_evaluated: int
    buy_candidates_count: int
    watch_count: int
    wait_count: int
    exit_count: int
    no_trade_count: int
    stale_data_rejected_count: int
    active_signals: List[TradingSignal]
    config: StrategyConfig
    is_mock: bool = False
    disclaimer: str
