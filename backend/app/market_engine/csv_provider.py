import os
import glob
import datetime
import logging
from typing import List, Optional, Dict, Any
import pandas as pd

from backend.app.market_engine.base_provider import BaseMarketDataProvider
from backend.app.market_engine.models import (
    ProviderType,
    DataDelayType,
    MarketStatusEnum,
    NormalizedQuote,
    MarketOverview,
    HistoricalBar,
    SymbolUniverseItem,
    ProviderHealth,
)

logger = logging.getLogger("csv_provider")

class CSVImportProvider(BaseMarketDataProvider):
    def __init__(self, imports_dir: str = "backend/data/imports"):
        super().__init__(ProviderType.CSV_IMPORT, "PSX Official CSV Sheet Importer")
        self.imports_dir = imports_dir
        self.last_import_time: Optional[str] = None
        self.last_imported_file: Optional[str] = None
        self.cached_quotes: Dict[str, NormalizedQuote] = {}
        self.cached_history: Dict[str, List[HistoricalBar]] = {}
        self.last_error: Optional[str] = None
        self.error_history: List[str] = []
        os.makedirs(self.imports_dir, exist_ok=True)

    def import_csv_file(self, file_path: str) -> Dict[str, Any]:
        """
        Parse and ingest an official PSX CSV quotation sheet.
        Expected columns (flexible matching):
        ['Symbol'/'Ticker', 'Date'/'Time', 'Open', 'High', 'Low', 'Close'/'Current', 'Volume', 'LDCP']
        """
        try:
            df = pd.read_csv(file_path)
            # Normalize column names
            df.columns = [c.strip().upper() for c in df.columns]

            symbol_col = next((c for c in df.columns if c in ["SYMBOL", "TICKER", "SCRIP", "CODE"]), None)
            if not symbol_col:
                raise ValueError("Missing Symbol/Ticker column in CSV file")

            price_col = next((c for c in df.columns if c in ["CURRENT", "CLOSE", "PRICE", "RATE"]), None)
            vol_col = next((c for c in df.columns if c in ["VOLUME", "VOL", "SHARES"]), None)
            open_col = next((c for c in df.columns if c in ["OPEN", "OPEN_PRICE"]), None)
            high_col = next((c for c in df.columns if c in ["HIGH", "HIGH_PRICE"]), None)
            low_col = next((c for c in df.columns if c in ["LOW", "LOW_PRICE"]), None)
            ldcp_col = next((c for c in df.columns if c in ["LDCP", "PREV_CLOSE", "PREVIOUS_CLOSE"]), None)
            date_col = next((c for c in df.columns if c in ["DATE", "TIMESTAMP", "TIME"]), None)

            count = 0
            now_iso = datetime.datetime.now().isoformat()
            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            for _, row in df.iterrows():
                sym = str(row[symbol_col]).strip().upper()
                if not sym or sym == "NAN":
                    continue

                price = float(row[price_col]) if price_col and pd.notna(row[price_col]) else 0.0
                vol = int(float(row[vol_col])) if vol_col and pd.notna(row[vol_col]) else 0
                op = float(row[open_col]) if open_col and pd.notna(row[open_col]) else price
                hp = float(row[high_col]) if high_col and pd.notna(row[high_col]) else price
                lp = float(row[low_col]) if low_col and pd.notna(row[low_col]) else price
                ldcp = float(row[ldcp_col]) if ldcp_col and pd.notna(row[ldcp_col]) else price
                date_val = str(row[date_col]) if date_col and pd.notna(row[date_col]) else now_str

                change = round(price - ldcp, 2)
                change_pct = round((change / ldcp) * 100, 2) if ldcp > 0 else 0.0

                quote = NormalizedQuote(
                    symbol=sym,
                    sector="CSV Ingested",
                    price=price,
                    change=change,
                    change_percent=change_pct,
                    open_price=op,
                    high_price=hp,
                    low_price=lp,
                    ldcp=ldcp,
                    volume=vol,
                    tags="",
                    timestamp=now_iso,
                    source_timestamp=date_val,
                    delay_type=DataDelayType.END_OF_DAY,
                    provider=self.provider_type,
                    is_valid=(price > 0 and vol >= 0),
                    validation_notes=[] if (price > 0 and vol >= 0) else ["Non-positive price or volume in CSV row"]
                )

                self.cached_quotes[sym] = quote

                # Append to history
                bar = HistoricalBar(
                    time=date_val[:10],
                    open=op,
                    high=hp,
                    low=lp,
                    close=price,
                    volume=vol,
                    data_source="CSV_IMPORT"
                )
                if sym not in self.cached_history:
                    self.cached_history[sym] = []
                self.cached_history[sym].append(bar)
                count += 1

            self.last_import_time = now_str
            self.last_imported_file = os.path.basename(file_path)
            self.last_error = None
            return {
                "status": "success",
                "filename": self.last_imported_file,
                "records_imported": count,
                "symbols_count": len(self.cached_quotes)
            }

        except Exception as e:
            err_msg = f"CSV Import Failed ({os.path.basename(file_path)}): {str(e)}"
            self.last_error = err_msg
            self.error_history.insert(0, err_msg)
            logger.error(err_msg)
            return {"status": "error", "error": err_msg}

    async def get_market_overview(self) -> MarketOverview:
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S PKT")
        advances = sum(1 for q in self.cached_quotes.values() if q.change > 0)
        declines = sum(1 for q in self.cached_quotes.values() if q.change < 0)
        unchanged = sum(1 for q in self.cached_quotes.values() if q.change == 0)
        total_vol = sum(q.volume for q in self.cached_quotes.values())

        return MarketOverview(
            market_status=MarketStatusEnum.CLOSED,
            index_name="KSE-100 (CSV Ingested)",
            index_value=178801.35,
            index_change=0.0,
            index_change_percent=0.0,
            total_volume=total_vol,
            total_volume_formatted=f"{round(total_vol / 1_000_000, 2)}M",
            advances=advances,
            declines=declines,
            unchanged=unchanged,
            total_traded_companies=len(self.cached_quotes),
            timestamp=self.last_import_time or now_str,
            data_delay_type=DataDelayType.HISTORICAL,
            provider=self.provider_type,
            provider_name=self.name,
            is_live_market=False,
            disclaimer="Imported offline from official PSX CSV quotations."
        )

    async def get_symbol_universe(self) -> List[SymbolUniverseItem]:
        universe = []
        for sym, q in self.cached_quotes.items():
            universe.append(SymbolUniverseItem(
                symbol=sym,
                name=f"{sym} Equity",
                sector=q.sector,
                listed_indices=["ALLSHR"],
                is_shariah_compliant=True,
                lot_size=1,
                is_active=True
            ))
        return universe

    async def get_quotes(self, symbols: Optional[List[str]] = None, force_refresh: bool = False) -> List[NormalizedQuote]:
        if symbols:
            return [self.cached_quotes[s.upper()] for s in symbols if s.upper() in self.cached_quotes]
        return list(self.cached_quotes.values())

    async def get_quote(self, symbol: str) -> Optional[NormalizedQuote]:
        return self.cached_quotes.get(symbol.strip().upper())

    async def get_historical_prices(self, symbol: str, period: str = "1y") -> List[HistoricalBar]:
        return self.cached_history.get(symbol.strip().upper(), [])

    async def get_intraday_data(self, symbol: str) -> List[HistoricalBar]:
        return []

    def get_health(self) -> ProviderHealth:
        status = "ONLINE" if len(self.cached_quotes) > 0 else "DEGRADED"
        return ProviderHealth(
            provider_type=self.provider_type,
            name=self.name,
            status=status,
            is_active=False,
            data_delay=DataDelayType.HISTORICAL,
            delay_description="Static historical or end-of-day data from imported PSX CSV sheets.",
            last_successful_sync=self.last_import_time,
            symbols_received=len(self.cached_quotes),
            latency_ms=0.0,
            consecutive_failures=0 if not self.last_error else 1,
            last_error=self.last_error,
            error_history=self.error_history[:5],
            total_sync_runs=1 if self.last_import_time else 0,
            successful_sync_runs=1 if self.last_import_time else 0
        )
