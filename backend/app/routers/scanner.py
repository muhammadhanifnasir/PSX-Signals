from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any

from backend.app.scanner.models import (
    StockOpportunity,
    ScanRunSummary,
    ScannerThresholds,
    SetupType,
)
from backend.app.scanner.scanner_engine import scanner_engine

router = APIRouter(prefix="/scanner", tags=["Automated Market Scanner"])

@router.get("/opportunities", response_model=List[StockOpportunity])
async def get_opportunities(
    setup_type: Optional[str] = Query(None, description="Filter by setup: BREAKOUT, PULLBACK, VWAP_RECLAIM, MOMENTUM_SURGE, VOLUME_SURGE"),
    min_score: int = Query(60, ge=0, le=100, description="Minimum composite opportunity score"),
    min_momentum: int = Query(50, ge=0, le=100, description="Minimum momentum score"),
    min_rvol: float = Query(1.0, ge=0.5, le=10.0, description="Minimum relative volume"),
    high_liquidity: bool = Query(False, description="Filter only high liquidity stocks (>1M volume)"),
    watchlist_only: bool = Query(False, description="Filter only watchlist stocks"),
    exclude_defaulters: bool = Query(True, description="Filter out PSX Defaulters' Segment & Non-Compliant stocks"),
    shariah_only: bool = Query(False, description="Filter only KMI Shariah-compliant equities"),
    min_price: float = Query(0.0, ge=0.0, description="Minimum traded share price to exclude penny stocks")
):
    """
    Retrieve ranked list of scanned PSX trading opportunities.
    Each opportunity contains VWAP, RVOL, EMA trend, RSI, Momentum Score,
    Opportunity Score, and setup classification.
    """
    opportunities = scanner_engine.last_opportunities

    if not opportunities:
        # Run scan if empty
        opportunities = await scanner_engine.scan_market()

    results = opportunities

    if setup_type and setup_type.upper() != "ALL":
        results = [o for o in results if o.setup_type.value.upper() == setup_type.upper()]

    if min_score > 0:
        results = [o for o in results if o.opportunity_score >= min_score]

    if min_momentum > 0:
        results = [o for o in results if o.momentum_score >= min_momentum]

    if min_rvol > 1.0:
        results = [o for o in results if o.relative_volume >= min_rvol]

    if high_liquidity:
        results = [o for o in results if o.volume >= 1_000_000]

    if exclude_defaulters:
        results = [o for o in results if not o.is_defaulter and not o.is_non_compliant]

    if shariah_only:
        results = [o for o in results if o.is_shariah_compliant]

    if min_price > 0.0:
        results = [o for o in results if o.last_price >= min_price]

    return results

@router.get("/summary", response_model=ScanRunSummary)
async def get_scan_summary():
    """
    Retrieve execution summary of the latest PSX market scan,
    including provider used, latency, stocks eligible, and stale-data rejections.
    """
    if not scanner_engine.last_summary:
        await scanner_engine.scan_market()
    return scanner_engine.last_summary

@router.post("/run", response_model=List[StockOpportunity])
async def trigger_instant_scan(force_refresh: bool = Query(True, description="Force fresh fetch from provider")):
    """
    Trigger an immediate, on-demand scan across all eligible PSX stocks.
    """
    opportunities = await scanner_engine.scan_market(force_refresh_quotes=force_refresh)
    return opportunities

@router.get("/thresholds", response_model=ScannerThresholds)
async def get_thresholds():
    """
    Retrieve current configurable scanner filter thresholds.
    """
    return scanner_engine.thresholds

@router.post("/thresholds", response_model=ScannerThresholds)
async def update_thresholds(new_thresholds: Dict[str, Any]):
    """
    Update scanner thresholds dynamically.
    """
    try:
        updated = scanner_engine.update_thresholds(new_thresholds)
        return updated
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid threshold configuration: {str(e)}")
