from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from backend.app.models.signal import SignalOverviewResponse, Signal
from backend.app.services.mock_data import mock_service

router = APIRouter(prefix="/signals", tags=["Signals"])

@router.get("", response_model=SignalOverviewResponse)
async def get_signals(
    action: Optional[str] = Query(None, description="Filter by action: STRONG_BUY, BUY, HOLD, SELL"),
    timeframe: Optional[str] = Query(None, description="Filter by timeframe: 15m, 1h, 4h, 1D"),
    sector: Optional[str] = Query(None, description="Filter by sector")
):
    """Retrieve active automated trading signals."""
    overview = mock_service.get_signals()
    signals = overview.signals

    if action:
        signals = [s for s in signals if s.action.upper() == action.upper()]
    if timeframe:
        signals = [s for s in signals if s.timeframe.upper() == timeframe.upper()]
    if sector:
        signals = [s for s in signals if sector.lower() in s.sector.lower()]

    return SignalOverviewResponse(
        total_signals=len(signals),
        strong_buy_count=sum(1 for s in signals if s.action == "STRONG_BUY"),
        buy_count=sum(1 for s in signals if s.action == "BUY"),
        hold_count=sum(1 for s in signals if s.action == "HOLD"),
        sell_count=sum(1 for s in signals if s.action in ["SELL", "STRONG_SELL"]),
        signals=signals,
        timestamp=overview.timestamp,
        is_mock=True
    )

@router.get("/{signal_id}", response_model=Signal)
async def get_signal_by_id(signal_id: str):
    """Retrieve detailed signal by ID."""
    overview = mock_service.get_signals()
    for s in overview.signals:
        if s.id.lower() == signal_id.lower():
            return s
    raise HTTPException(status_code=404, detail=f"Signal {signal_id} not found")
