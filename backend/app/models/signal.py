from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class Signal(BaseModel):
    id: str
    symbol: str
    company_name: str
    sector: str
    action: str = Field(description="STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL, WATCH, WAIT, EXIT")
    signal_type: Optional[str] = Field(default="BUY_CANDIDATE", description="BUY_CANDIDATE, WATCH, WAIT, EXIT, NO_TRADE")
    strategy: str = Field(description="e.g. Momentum + Volume + VWAP + Breakout")
    strategy_version: Optional[str] = "1.0.0"
    timeframe: str = Field(default="1D / Intraday")
    confidence_score: int = Field(ge=0, le=100)
    opportunity_score: Optional[int] = Field(default=0, ge=0, le=100)
    current_price: float
    entry_price: float
    entry_zone_low: Optional[float] = None
    entry_zone_high: Optional[float] = None
    stop_loss: float
    target_1: float
    target_2: float
    target_3: Optional[float] = None
    risk_reward_ratio: float
    potential_gain_percent: float
    max_loss_percent: float
    vwap: Optional[float] = None
    vwap_distance_pct: Optional[float] = None
    ema_9: Optional[float] = None
    ema_21: Optional[float] = None
    ema_trend: Optional[str] = None
    rsi_14: float
    volume_surge_ratio: float
    relative_volume: Optional[float] = None
    atr_14: Optional[float] = None
    circuit_breaker_upper: Optional[float] = None
    circuit_breaker_lower: Optional[float] = None
    circuit_status: Optional[str] = "NORMAL"
    cap_distance_pct: Optional[float] = 0.0
    is_shariah_compliant: Optional[bool] = True
    is_defaulter: Optional[bool] = False
    is_non_compliant: Optional[bool] = False
    regulatory_category: Optional[str] = "MAINBOARD"
    sector_quadrant: Optional[str] = "LEADING"
    macro_regime: Optional[str] = "BULL_CONSOLIDATION"
    created_at: str
    valid_until: str
    status: str = Field(default="ACTIVE", description="ACTIVE, TARGET_1_HIT, TARGET_2_HIT, STOPPED_OUT, EXPIRED, INVALIDATED")
    catalyst_notes: str
    invalidation_reason: Optional[str] = None
    exit_reason: Optional[str] = None
    score_breakdown: Optional[Dict[str, Any]] = None
    conditions_met: Optional[Dict[str, Any]] = None
    data_freshness_seconds: Optional[int] = 0
    data_delay_type: Optional[str] = "DELAYED_15MIN"
    is_stale: Optional[bool] = False
    is_mock: bool = False
    disclaimer: Optional[str] = "REAL PSX SIGNALS. Systematic technical confluence ranking."

class SignalOverviewResponse(BaseModel):
    total_signals: int
    strong_buy_count: int
    buy_count: int
    hold_count: int
    sell_count: int
    watch_count: Optional[int] = 0
    wait_count: Optional[int] = 0
    exit_count: Optional[int] = 0
    signals: List[Signal]
    timestamp: str
    is_mock: bool = False
    disclaimer: str = "REAL PSX SIGNALS. Systematic technical confluence ranking."
