from typing import List, Optional
from pydantic import BaseModel, Field

class Signal(BaseModel):
    id: str
    symbol: str
    company_name: str
    sector: str
    action: str = Field(description="STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL")
    strategy: str = Field(description="e.g. 52W High Breakout, MACD Cross, RSI Reversal, Volume Spike")
    timeframe: str = Field(description="15m, 1h, 4h, 1D")
    confidence_score: int = Field(ge=0, le=100)
    current_price: float
    entry_price: float
    stop_loss: float
    target_1: float
    target_2: float
    target_3: float
    risk_reward_ratio: float
    potential_gain_percent: float
    max_loss_percent: float
    rsi_14: float
    volume_surge_ratio: float
    created_at: str
    valid_until: str
    status: str = Field(default="ACTIVE", description="ACTIVE, TARGET_1_HIT, STOPPED_OUT, EXPIRED")
    catalyst_notes: str
    is_mock: bool = True

class SignalOverviewResponse(BaseModel):
    total_signals: int
    strong_buy_count: int
    buy_count: int
    hold_count: int
    sell_count: int
    signals: List[Signal]
    timestamp: str
    is_mock: bool = True
    disclaimer: str = "SIMULATED / MOCK RESEARCH DATA - NOT LIVE PSX DATA"
