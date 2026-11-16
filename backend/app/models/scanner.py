from typing import List, Optional
from pydantic import BaseModel, Field

class ScannerItem(BaseModel):
    symbol: str
    company_name: str
    sector: str
    price: float
    change_percent: float
    volume: int
    rel_volume: float
    rsi_14: float
    macd_signal: str
    ema_trend: str
    detected_pattern: str
    signal_trigger: str
    confidence_score: int
    is_shariah_compliant: bool = True

class ScannerResponse(BaseModel):
    total_scanned: int
    matches_count: int
    scan_timestamp: str
    filters_applied: dict
    results: List[ScannerItem]
    is_mock: bool = True
    disclaimer: str = "SIMULATED / MOCK RESEARCH DATA - NOT LIVE PSX DATA"

class OpportunityItem(BaseModel):
    id: str
    symbol: str
    company_name: str
    action: str
    score: int
    expected_return_pct: float
    risk_level: str
    timeframe: str
    entry_range: str
    stop_loss: float
    target_1: float
    catalyst: str
    volume_surge: str

class OpportunitiesResponse(BaseModel):
    top_opportunities: List[OpportunityItem]
    timestamp: str
    is_mock: bool = True
    disclaimer: str = "SIMULATED / MOCK RESEARCH DATA - NOT LIVE PSX DATA"
