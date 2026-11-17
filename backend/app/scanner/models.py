from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SetupType(str, Enum):
    BREAKOUT = "BREAKOUT"
    PULLBACK = "PULLBACK"
    VWAP_RECLAIM = "VWAP_RECLAIM"
    MOMENTUM_SURGE = "MOMENTUM_SURGE"
    VOLUME_SURGE = "VOLUME_SURGE"
    CONSOLIDATION = "CONSOLIDATION"
    NEUTRAL = "NEUTRAL"

class ScannerThresholds(BaseModel):
    min_volume: int = Field(default=100_000, description="Minimum traded volume shares")
    min_turnover_pkr: float = Field(default=2_000_000.0, description="Minimum traded value in PKR")
    min_price: float = Field(default=2.0, description="Minimum stock price in PKR")
    max_price: float = Field(default=5000.0, description="Maximum stock price in PKR")
    min_change_percent: float = Field(default=-3.0, description="Minimum daily price change %")
    max_change_percent: float = Field(default=7.5, description="Maximum daily price change % (circuit breaker limit)")
    min_relative_volume: float = Field(default=1.2, description="Minimum RVOL vs 20-day average")
    min_rsi: float = Field(default=40.0, description="Minimum RSI(14)")
    max_rsi: float = Field(default=78.0, description="Maximum RSI(14) to prevent overbought blowoffs")
    min_momentum_score: int = Field(default=55, description="Minimum momentum score (0-100)")
    min_opportunity_score: int = Field(default=60, description="Minimum composite opportunity score (0-100)")
    late_entry_buffer_pct: float = Field(default=1.2, description="Distance threshold to upper circuit/resistance for late entry penalty")
    max_stale_data_seconds: int = Field(default=1800, description="Maximum age of market observation (30m)")

class StockOpportunity(BaseModel):
    symbol: str
    company_name: str
    sector: str
    last_price: float
    price_change_percent: float
    volume: int
    volume_formatted: str
    relative_volume: float
    vwap: float
    ema_trend: str = Field(description="Bullish (9>20>50), Neutral, or Bearish")
    rsi_14: float
    atr_14: float
    support_level: float
    resistance_level: float
    momentum_score: int = Field(ge=0, le=100)
    opportunity_score: int = Field(ge=0, le=100)
    setup_type: SetupType
    setup_description: str
    entry_price_recommended: float
    stop_loss_recommended: float
    target_price_recommended: float
    risk_reward_ratio: float
    is_late_entry_risk: bool = False
    data_freshness_seconds: int
    data_delay_type: str
    data_timestamp: str
    is_shariah_compliant: bool = True
    is_defaulter: bool = False
    is_non_compliant: bool = False
    regulatory_category: str = "MAINBOARD"
    sector_quadrant: Optional[str] = "LEADING"
    circuit_breaker_upper: float = 0.0
    circuit_breaker_lower: float = 0.0
    circuit_status: str = "NORMAL"
    cap_distance_pct: float = 0.0
    in_watchlist: bool = False

class ScanRunSummary(BaseModel):
    id: str
    scan_timestamp: str
    total_universe_count: int
    eligible_stocks_scanned: int
    stale_stocks_rejected: int
    invalid_data_rejected: int
    opportunities_found: int
    active_filters: Dict[str, Any]
    provider_used: str
    data_delay: str
    execution_time_ms: float
    status: str = "COMPLETED"
    error_message: Optional[str] = None
