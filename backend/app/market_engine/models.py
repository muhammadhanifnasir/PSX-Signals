from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class DataDelayType(str, Enum):
    REAL_TIME = "REAL_TIME"
    DELAYED_15MIN = "DELAYED_15MIN"
    END_OF_DAY = "END_OF_DAY"
    HISTORICAL = "HISTORICAL"

class ProviderType(str, Enum):
    PSX_PORTAL = "PSX_PORTAL"
    CSV_IMPORT = "CSV_IMPORT"
    LICENSED_API = "LICENSED_API"

class MarketStatusEnum(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    PRE_OPEN = "PRE_OPEN"
    BREAK = "BREAK"
    UNKNOWN = "UNKNOWN"

class NormalizedQuote(BaseModel):
    symbol: str = Field(description="Normalized uppercase ticker e.g. OGDC")
    sector: str = Field(default="Unclassified", description="Industry classification")
    price: float = Field(description="Current / settlement traded price")
    change: float = Field(default=0.0, description="Absolute change vs LDCP")
    change_percent: float = Field(default=0.0, description="Percentage change vs LDCP")
    open_price: float = Field(default=0.0, description="Session open price")
    high_price: float = Field(default=0.0, description="Session high price")
    low_price: float = Field(default=0.0, description="Session low price")
    ldcp: float = Field(default=0.0, description="Last day close price")
    volume: int = Field(default=0, description="Traded volume shares")
    tags: str = Field(default="", description="e.g. NC (Non-Compliant), DEF (Defaulters)")
    circuit_breaker_upper: float = Field(default=0.0, description="PSX 7.5% daily upper circuit lock price")
    circuit_breaker_lower: float = Field(default=0.0, description="PSX 7.5% daily lower circuit lock price")
    circuit_status: str = Field(default="NORMAL", description="NORMAL, CAP_DANGER, LOCKED_UPPER, LOCKED_LOWER")
    cap_distance_pct: float = Field(default=0.0, description="Percentage distance from current price to upper cap")
    is_defaulter: bool = Field(default=False, description="Belongs to PSX Defaulters' Segment")
    is_non_compliant: bool = Field(default=False, description="Flagged as Non-Compliant by SECP/PSX")
    is_shariah_compliant: bool = Field(default=False, description="KMI Shariah-screened compliant company")
    regulatory_category: str = Field(default="MAINBOARD", description="MAINBOARD, SHARIAH_COMPLIANT, DEFAULTER, NON_COMPLIANT")
    timestamp: str = Field(description="Normalized ingestion timestamp (ISO 8601)")
    source_timestamp: Optional[str] = Field(default=None, description="Actual exchange or quotation timestamp")
    delay_type: DataDelayType = Field(default=DataDelayType.DELAYED_15MIN)
    provider: ProviderType = Field(default=ProviderType.PSX_PORTAL)
    is_valid: bool = Field(default=True, description="Passed sanity & range validations")
    validation_notes: List[str] = Field(default_factory=list)

class HistoricalBar(BaseModel):
    time: str = Field(description="Date or timestamp string YYYY-MM-DD or ISO")
    open: float
    high: float
    low: float
    close: float
    volume: int
    data_source: str = "PSX_DATA_PORTAL"

class SymbolUniverseItem(BaseModel):
    symbol: str
    name: str
    sector: str
    listed_indices: List[str] = Field(default_factory=list)
    is_shariah_compliant: bool = True
    lot_size: int = 1
    circuit_breaker_upper: Optional[float] = None
    circuit_breaker_lower: Optional[float] = None
    is_active: bool = True
    last_updated: Optional[str] = None

class MarketOverview(BaseModel):
    market_status: MarketStatusEnum
    index_name: str = "KSE-100"
    index_value: float
    index_change: float
    index_change_percent: float
    total_volume: int
    total_volume_formatted: str
    advances: int
    declines: int
    unchanged: int
    total_traded_companies: int
    timestamp: str
    data_delay_type: DataDelayType
    provider: ProviderType
    provider_name: str
    is_live_market: bool = False
    disclaimer: str

class ProviderHealth(BaseModel):
    provider_type: ProviderType
    name: str
    status: str = Field(description="ONLINE, DEGRADED, OFFLINE")
    is_active: bool
    data_delay: DataDelayType
    delay_description: str
    last_successful_sync: Optional[str]
    symbols_received: int
    latency_ms: float
    consecutive_failures: int
    last_error: Optional[str] = None
    error_history: List[str] = Field(default_factory=list)
    total_sync_runs: int = 0
    successful_sync_runs: int = 0

class FreshnessMetric(BaseModel):
    symbol: str
    last_updated: str
    age_seconds: int
    is_stale: bool
    threshold_seconds: int
    eligible_for_signals: bool
    reason: Optional[str] = None
