from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from typing import List, Optional
import os

from backend.app.market_engine.models import (
    MarketOverview,
    SymbolUniverseItem,
    NormalizedQuote,
    HistoricalBar,
    FreshnessMetric,
    ProviderType,
)
from backend.app.market_engine.engine import market_data_engine

router = APIRouter(prefix="/market-data", tags=["Market Data Engine"])

@router.get("/overview", response_model=MarketOverview)
async def get_market_overview():
    """
    Fetch normalized market overview, index values, volume, and market status
    directly from the active market-data provider.
    """
    try:
        return await market_data_engine.get_market_overview()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Market data provider error: {str(e)}")

@router.get("/universe", response_model=List[SymbolUniverseItem])
async def get_stock_universe():
    """
    Fetch the complete configurable PSX stock universe with sectors,
    listed indices, Shariah compliance, and circuit breaker bounds.
    """
    return await market_data_engine.get_symbol_universe()

@router.get("/quotes", response_model=List[NormalizedQuote])
async def get_quotes(
    symbols: Optional[str] = Query(None, description="Comma-separated symbols e.g. OGDC,LUCK,HUBC")
):
    """
    Fetch normalized quotes for multiple symbols or the full PSX board.
    Includes validation status, LDCP, and transparent data delay tags.
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",")] if symbols else None
    try:
        return await market_data_engine.get_quotes(symbol_list)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Market data quote error: {str(e)}")

@router.get("/quote/{symbol}", response_model=NormalizedQuote)
async def get_single_quote(symbol: str):
    """
    Fetch validated quote and freshness metadata for a single PSX scrip.
    """
    quote = await market_data_engine.get_quote(symbol)
    if not quote:
        raise HTTPException(status_code=404, detail=f"Quote for symbol '{symbol.upper()}' not found")
    return quote

@router.get("/history/{symbol}", response_model=List[HistoricalBar])
async def get_historical_prices(
    symbol: str,
    period: str = Query("1y", description="Time period e.g. 1m, 3m, 6m, 1y, 2y")
):
    """
    Fetch historical daily OHLCV candlestick bars for a PSX symbol.
    """
    bars = await market_data_engine.get_historical_prices(symbol, period=period)
    return bars

@router.get("/intraday/{symbol}", response_model=List[HistoricalBar])
async def get_intraday_data(symbol: str):
    """
    Fetch intraday transaction ticks / bars when available.
    """
    bars = await market_data_engine.get_intraday_data(symbol)
    return bars

@router.get("/status")
async def get_data_sources_status():
    """
    Requirement 15: Retrieve comprehensive status of all data providers:
    - Provider name and type
    - Live connection health (ONLINE, DEGRADED, OFFLINE)
    - Last successful update timestamp
    - Data delay description (Never presents delayed as real-time)
    - Symbols received count
    - Real collection error log
    """
    return market_data_engine.get_data_sources_status()

@router.get("/freshness/{symbol}", response_model=FreshnessMetric)
async def check_freshness(symbol: str):
    """
    Check data age, staleness threshold, and signal generation eligibility.
    Rejects invalid, missing, or stale market quotes.
    """
    quote = await market_data_engine.get_quote(symbol)
    if not quote:
        raise HTTPException(status_code=404, detail=f"Symbol '{symbol.upper()}' not found in active feed")
    return market_data_engine.check_quote_freshness(quote)

@router.post("/collect")
async def trigger_manual_collection():
    """
    Manually trigger an immediate market data collection cycle.
    """
    res = await market_data_engine.collect_market_data_now()
    return res

@router.post("/switch-provider")
async def switch_provider(provider_type: ProviderType):
    """
    Switch active market data provider: PSX_PORTAL, CSV_IMPORT, LICENSED_API.
    """
    try:
        market_data_engine.set_active_provider(provider_type)
        return {"status": "success", "active_provider": provider_type.value}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/import-csv")
async def import_csv_file(file: UploadFile = File(...)):
    """
    Upload and parse an official PSX daily quotation sheet CSV.
    """
    imports_dir = "backend/data/imports"
    os.makedirs(imports_dir, exist_ok=True)
    file_path = os.path.join(imports_dir, file.filename)

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    res = market_data_engine.csv_provider.import_csv_file(file_path)
    return res
