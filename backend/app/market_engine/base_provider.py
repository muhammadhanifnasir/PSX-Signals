from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from backend.app.market_engine.models import (
    NormalizedQuote,
    MarketOverview,
    HistoricalBar,
    SymbolUniverseItem,
    ProviderHealth,
    ProviderType,
)

class BaseMarketDataProvider(ABC):
    def __init__(self, provider_type: ProviderType, name: str):
        self.provider_type = provider_type
        self.name = name

    @abstractmethod
    async def get_market_overview(self) -> MarketOverview:
        """Fetch index levels, market status, breadth, and aggregate traded volume."""
        pass

    @abstractmethod
    async def get_symbol_universe(self) -> List[SymbolUniverseItem]:
        """Fetch all listed PSX equities, sectors, and metadata."""
        pass

    @abstractmethod
    async def get_quote(self, symbol: str) -> Optional[NormalizedQuote]:
        """Fetch quote for a specific ticker symbol."""
        pass

    @abstractmethod
    async def get_quotes(self, symbols: Optional[List[str]] = None, force_refresh: bool = False) -> List[NormalizedQuote]:
        """Fetch quotes for multiple tickers or entire market watch."""
        pass

    @abstractmethod
    async def get_historical_prices(self, symbol: str, period: str = "1y") -> List[HistoricalBar]:
        """Fetch historical daily OHLCV bars."""
        pass

    @abstractmethod
    async def get_intraday_data(self, symbol: str) -> List[HistoricalBar]:
        """Fetch intraday bars when available."""
        pass

    @abstractmethod
    def get_health(self) -> ProviderHealth:
        """Return provider connection health, delay, latency, and error metrics."""
        pass
