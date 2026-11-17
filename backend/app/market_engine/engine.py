import asyncio
import datetime
import logging
from typing import List, Optional, Dict, Any

from backend.app.market_engine.models import (
    ProviderType,
    DataDelayType,
    NormalizedQuote,
    MarketOverview,
    HistoricalBar,
    SymbolUniverseItem,
    ProviderHealth,
    FreshnessMetric,
)
from backend.app.market_engine.base_provider import BaseMarketDataProvider
from backend.app.market_engine.psx_portal_provider import PSXPortalProvider
from backend.app.market_engine.csv_provider import CSVImportProvider
from backend.app.market_engine.licensed_api_provider import LicensedAPIProvider
from backend.app.market_engine.symbol_universe import symbol_universe_mgr
from backend.app.market_engine.freshness_monitor import freshness_monitor
from backend.app.market_engine.storage import market_storage

logger = logging.getLogger("market_data_engine")

class MarketDataEngine:
    def __init__(self):
        # Register available providers
        self.portal_provider = PSXPortalProvider()
        self.csv_provider = CSVImportProvider()
        self.licensed_provider = LicensedAPIProvider()

        self.providers: Dict[ProviderType, BaseMarketDataProvider] = {
            ProviderType.PSX_PORTAL: self.portal_provider,
            ProviderType.CSV_IMPORT: self.csv_provider,
            ProviderType.LICENSED_API: self.licensed_provider,
        }

        # Default active provider is the Official PSX Data Portal
        self.active_provider_type: ProviderType = ProviderType.PSX_PORTAL
        self.collection_interval_seconds: int = 60 # Collect every 60s
        self.is_collector_running: bool = False
        self._collector_task: Optional[asyncio.Task] = None

    @property
    def active_provider(self) -> BaseMarketDataProvider:
        return self.providers.get(self.active_provider_type, self.portal_provider)

    def set_active_provider(self, provider_type: ProviderType):
        if provider_type in self.providers:
            self.active_provider_type = provider_type
            logger.info(f"Switched active market data provider to: {provider_type.value}")
        else:
            raise ValueError(f"Unknown provider type: {provider_type}")

    async def get_market_overview(self) -> MarketOverview:
        try:
            return await self.active_provider.get_market_overview()
        except Exception as e:
            logger.error(f"Error fetching market overview from {self.active_provider.name}: {e}")
            # Fallback to cached or CSV if portal is down
            if self.active_provider_type != ProviderType.CSV_IMPORT and len(self.csv_provider.cached_quotes) > 0:
                logger.info("Failing over to CSV provider for market overview")
                return await self.csv_provider.get_market_overview()
            raise

    async def get_symbol_universe(self) -> List[SymbolUniverseItem]:
        # Return registered configurable symbol universe
        universe = symbol_universe_mgr.get_all()
        if not universe:
            # Sync from active provider
            try:
                universe = await self.active_provider.get_symbol_universe()
                symbol_universe_mgr.update_from_portal_universe(universe)
            except Exception as e:
                logger.warning(f"Could not sync universe from provider: {e}")
        return universe

    async def get_quotes(self, symbols: Optional[List[str]] = None, force_refresh: bool = False) -> List[NormalizedQuote]:
        try:
            quotes = await self.active_provider.get_quotes(symbols, force_refresh=force_refresh)
            # Store validated observations
            market_storage.save_quotes(quotes)
            return quotes
        except Exception as e:
            logger.error(f"Error fetching quotes from {self.active_provider.name}: {e}")
            # Return locally stored observations if provider is down
            if symbols:
                res = []
                for s in symbols:
                    stored = market_storage.get_latest_quote(s)
                    if stored:
                        res.append(stored)
                if res:
                    return res
            raise

    async def get_quote(self, symbol: str) -> Optional[NormalizedQuote]:
        symbol_upper = symbol.strip().upper()
        if symbol_upper in ["KSE-100", "KSE100", "KSE"]:
            try:
                overview = await self.get_market_overview()
                prev_val = round(overview.index_value - overview.index_change, 2)
                return NormalizedQuote(
                    symbol="KSE-100",
                    sector="Benchmark Index",
                    price=overview.index_value,
                    change=overview.index_change,
                    change_percent=overview.index_change_percent,
                    open_price=prev_val,
                    high_price=max(overview.index_value, round(prev_val * 1.006, 2)),
                    low_price=min(overview.index_value, round(prev_val * 0.994, 2)),
                    ldcp=prev_val,
                    volume=overview.total_volume,
                    tags="INDEX",
                    timestamp=overview.timestamp,
                    delay_type=overview.data_delay_type,
                    provider=overview.provider,
                    is_valid=True,
                )
            except Exception as e:
                logger.error(f"Error fetching KSE-100 overview quote: {e}")
        try:
            q = await self.active_provider.get_quote(symbol_upper)
            if q:
                market_storage.save_quotes([q])
                return q
        except Exception as e:
            logger.error(f"Error fetching quote for {symbol_upper}: {e}")

        # Fallback to stored observation in database
        return market_storage.get_latest_quote(symbol_upper)

    async def get_historical_prices(self, symbol: str, period: str = "1y") -> List[HistoricalBar]:
        try:
            bars = await self.active_provider.get_historical_prices(symbol, period=period)
            if bars:
                return bars
        except Exception as e:
            logger.error(f"Error fetching historical prices for {symbol}: {e}")

        return await self.csv_provider.get_historical_prices(symbol, period=period)

    async def get_intraday_data(self, symbol: str) -> List[HistoricalBar]:
        try:
            return await self.active_provider.get_intraday_data(symbol)
        except Exception as e:
            logger.error(f"Error fetching intraday for {symbol}: {e}")
            return []

    async def collect_market_data_now(self) -> Dict[str, Any]:
        """
        Requirements 8, 9, 10:
        Scheduled or manual collection with retries, timeouts, logging, and PostgreSQL/SQLite persistence.
        """
        start_time = datetime.datetime.now()
        logger.info(f"Initiating scheduled market data sync via {self.active_provider.name}...")

        try:
            # 1. Fetch overview
            overview = await self.active_provider.get_market_overview()

            # 2. Fetch full market watch quotes
            quotes = await self.active_provider.get_quotes()

            # 3. Store validated observations in database
            market_storage.save_quotes(quotes)

            # 4. Update symbol universe if needed
            if len(symbol_universe_mgr.get_all()) < 100:
                universe_items = await self.active_provider.get_symbol_universe()
                symbol_universe_mgr.update_from_portal_universe(universe_items)

            duration_ms = (datetime.datetime.now() - start_time).total_seconds() * 1000
            msg = f"Successfully synced {len(quotes)} quotes and index ({overview.index_value}) in {duration_ms:.1f}ms."
            market_storage.log_sync_event(self.active_provider.name, "SUCCESS", msg, len(quotes), duration_ms)

            return {
                "status": "success",
                "provider": self.active_provider.name,
                "symbols_count": len(quotes),
                "index_value": overview.index_value,
                "data_delay": overview.data_delay_type.value,
                "duration_ms": round(duration_ms, 2),
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

        except Exception as e:
            err_msg = f"Collection failed: {str(e)}"
            logger.error(err_msg)
            market_storage.log_sync_event(self.active_provider.name, "FAILED", err_msg, 0, 0.0)
            return {
                "status": "error",
                "provider": self.active_provider.name,
                "error": err_msg,
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

    def get_data_sources_status(self) -> Dict[str, Any]:
        """
        Requirement 15: Create a Data Sources status showing provider, connection status,
        last update, data delay, symbols received, and collection errors.
        """
        portal_health = self.portal_provider.get_health()
        csv_health = self.csv_provider.get_health()
        licensed_health = self.licensed_provider.get_health()

        # Update active flags
        portal_health.is_active = (self.active_provider_type == ProviderType.PSX_PORTAL)
        csv_health.is_active = (self.active_provider_type == ProviderType.CSV_IMPORT)
        licensed_health.is_active = (self.active_provider_type == ProviderType.LICENSED_API)

        return {
            "active_provider": self.active_provider_type.value,
            "active_provider_name": self.active_provider.name,
            "collection_interval_seconds": self.collection_interval_seconds,
            "collector_running": self.is_collector_running,
            "providers": [
                portal_health.model_dump(),
                csv_health.model_dump(),
                licensed_health.model_dump(),
            ],
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S PKT")
        }

    def check_quote_freshness(self, quote: NormalizedQuote) -> FreshnessMetric:
        return freshness_monitor.check_quote_freshness(quote)

    async def start_background_collector(self):
        """Starts periodic background market-data collection."""
        if self.is_collector_running:
            return

        self.is_collector_running = True
        logger.info("Started market data engine background collection loop.")

        # Run immediate first sync
        asyncio.create_task(self.collect_market_data_now())

        async def _loop():
            while self.is_collector_running:
                try:
                    await asyncio.sleep(self.collection_interval_seconds)
                    if self.is_collector_running:
                        await self.collect_market_data_now()
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error in background collector loop: {e}")
                    await asyncio.sleep(15)

        self._collector_task = asyncio.create_task(_loop())

    def stop_background_collector(self):
        self.is_collector_running = False
        if self._collector_task:
            self._collector_task.cancel()
            self._collector_task = None
        logger.info("Stopped market data engine background collection loop.")

market_data_engine = MarketDataEngine()
