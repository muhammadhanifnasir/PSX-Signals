from typing import List, Optional
from pydantic import BaseModel, Field

class Candle(BaseModel):
    time: str  # YYYY-MM-DD or unix timestamp string
    open: float
    high: float
    low: float
    close: float
    volume: int

class TechnicalIndicators(BaseModel):
    rsi_14: float
    macd_line: float
    macd_signal: float
    macd_hist: float
    sma_20: float
    sma_50: float
    sma_200: float
    atr_14: float
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
    volume: int
    volume_formatted: str
    pe_ratio: float
    dividend_yield_pct: float
    high_52w: float
    low_52w: float
    technicals: TechnicalIndicators
    candles: List[Candle]
    is_mock: bool = True
    disclaimer: str = "SIMULATED / MOCK RESEARCH DATA - NOT LIVE PSX DATA"
