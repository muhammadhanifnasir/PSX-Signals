from typing import List, Optional
from pydantic import BaseModel, Field

class MarketBreadth(BaseModel):
    advances: int = Field(description="Number of stocks advancing")
    declines: int = Field(description="Number of stocks declining")
    unchanged: int = Field(description="Number of stocks unchanged")
    total_traded: int = Field(description="Total stocks traded")

class MarketStatusResponse(BaseModel):
    status: str = Field(description="Market state: OPEN, CLOSED, PRE_OPEN")
    index_name: str = "KSE-100"
    current_value: float
    change: float
    change_percent: float
    high: float
    low: float
    volume: int
    volume_formatted: str
    turnover_pkr: float
    turnover_formatted: str
    previous_close: float
    market_breadth: MarketBreadth
    stocks_scanned_count: int
    active_signals_count: int
    strong_opportunities_count: int
    data_freshness_seconds: int
    last_updated: str
    is_mock: bool = True
    disclaimer: str = "SIMULATED / MOCK RESEARCH DATA - NOT LIVE PSX DATA"

class MarketMover(BaseModel):
    symbol: str
    name: str
    sector: str
    price: float
    change: float
    change_percent: float
    volume: int
    volume_formatted: str
    turnover_pkr: float
    high_today: float
    low_today: float

class MarketMoversResponse(BaseModel):
    gainers: List[MarketMover]
    losers: List[MarketMover]
    volume_leaders: List[MarketMover]
    timestamp: str
    is_mock: bool = True
    disclaimer: str = "SIMULATED / MOCK RESEARCH DATA - NOT LIVE PSX DATA"
