from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class Candle(BaseModel):
    time: str  # YYYY-MM-DD
    open: float
    high: float
    low: float
    close: float
    volume: int

class OverlayPoint(BaseModel):
    time: str
    value: float

class SignalMarker(BaseModel):
    time: str
    position: str = "belowBar"  # belowBar or aboveBar
    color: str = "#10B981"
    shape: str = "arrowUp"      # arrowUp, arrowDown, circle
    text: str = "BUY"

class SupportResistanceLevels(BaseModel):
    pivot: float
    r1: float
    r2: float
    s1: float
    s2: float

class TechnicalIndicators(BaseModel):
    rsi_14: float
    atr_14: float
    vwap: float
    ema_9: float
    ema_21: float
    macd_line: float
    macd_signal: float
    macd_hist: float
    sma_20: float
    sma_50: float
    sma_200: float
    trend: str

class StockDetail(BaseModel):
    symbol: str
    company_name: str
    sector: str
    price: float
    change: float
    change_percent: float
    open: float
    high: float
    low: float
    ldcp: Optional[float] = None
    volume: int
    volume_formatted: str
    pe_ratio: float = 12.5
    dividend_yield_pct: float = 4.2
    high_52w: float
    low_52w: float
    technicals: TechnicalIndicators
    candles: List[Candle]
    ema_9_series: List[OverlayPoint] = []
    ema_21_series: List[OverlayPoint] = []
    vwap_series: List[OverlayPoint] = []
    support_resistance: Optional[SupportResistanceLevels] = None
    historical_markers: List[SignalMarker] = []
    current_signal: Optional[Dict[str, Any]] = None
    entry_price: Optional[float] = None
    entry_zone_low: Optional[float] = None
    entry_zone_high: Optional[float] = None
    stop_loss: Optional[float] = None
    target_1: Optional[float] = None
    target_2: Optional[float] = None
    risk_reward_ratio: Optional[float] = None
    opportunity_score: Optional[int] = None
    circuit_breaker_upper: float = 0.0
    circuit_breaker_lower: float = 0.0
    circuit_status: str = "NORMAL"
    cap_distance_pct: float = 0.0
    is_shariah_compliant: bool = True
    is_defaulter: bool = False
    is_non_compliant: bool = False
    regulatory_category: str = "MAINBOARD"
    data_delay_type: str = "DELAYED_15MIN"
    data_timestamp: str = ""
    is_mock: bool = False
    disclaimer: str = "PSX Official Data Portal (DPS) ~15m delayed. Technical levels computed systematically."
