import datetime
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from backend.app.models.signal import SignalOverviewResponse, Signal
from backend.app.signals.models import (
    TradingSignal,
    SignalEngineSummary,
    StrategyConfig,
    SignalLifecycleEvent,
    SignalState,
)
from backend.app.signals.engine import signal_engine
from backend.app.signals.storage import signal_storage
from backend.app.services.alerts import alerts_service
from pydantic import BaseModel

class SignalStatusUpdateRequest(BaseModel):
    status: str
    note: Optional[str] = ""
    price: Optional[float] = None

router = APIRouter(prefix="/signals", tags=["Trading Signals Engine"])

def _to_legacy_signal(ts: TradingSignal) -> Signal:
    return Signal(
        id=ts.id,
        symbol=ts.symbol,
        company_name=ts.company_name,
        sector=ts.sector,
        action=ts.action,
        signal_type=ts.signal_type.value,
        strategy=ts.strategy_name,
        strategy_version=ts.strategy_version,
        timeframe=ts.timeframe,
        confidence_score=ts.opportunity_score,
        opportunity_score=ts.opportunity_score,
        current_price=ts.current_price,
        entry_price=ts.entry_price,
        entry_zone_low=ts.entry_zone_low,
        entry_zone_high=ts.entry_zone_high,
        stop_loss=ts.stop_loss,
        target_1=ts.target_1,
        target_2=ts.target_2,
        target_3=ts.target_3,
        risk_reward_ratio=ts.risk_reward_ratio,
        potential_gain_percent=ts.potential_gain_target_1_pct,
        max_loss_percent=ts.max_risk_pct,
        vwap=ts.vwap,
        vwap_distance_pct=ts.vwap_distance_pct,
        ema_9=ts.ema_9,
        ema_21=ts.ema_21,
        ema_trend=ts.ema_trend,
        rsi_14=ts.rsi_14,
        volume_surge_ratio=ts.relative_volume,
        relative_volume=ts.relative_volume,
        atr_14=ts.atr_14,
        circuit_breaker_upper=getattr(ts, "circuit_breaker_upper", 0.0),
        circuit_breaker_lower=getattr(ts, "circuit_breaker_lower", 0.0),
        circuit_status=getattr(ts, "circuit_status", "NORMAL"),
        cap_distance_pct=getattr(ts, "cap_distance_pct", 0.0),
        is_shariah_compliant=getattr(ts, "is_shariah_compliant", True),
        is_defaulter=getattr(ts, "is_defaulter", False),
        is_non_compliant=getattr(ts, "is_non_compliant", False),
        regulatory_category=getattr(ts, "regulatory_category", "MAINBOARD"),
        sector_quadrant=getattr(ts, "sector_quadrant", "LEADING"),
        macro_regime=getattr(ts, "macro_regime", "BULL_CONSOLIDATION"),
        score_breakdown=ts.score_breakdown.model_dump() if ts.score_breakdown else None,
        conditions_met=ts.conditions_met.model_dump() if ts.conditions_met else None,
        created_at=ts.created_at,
        valid_until=ts.valid_until,
        status=ts.status.value,
        catalyst_notes=ts.catalyst_notes,
        invalidation_reason=ts.invalidation_reason,
        exit_reason=ts.exit_reason,
        data_freshness_seconds=ts.data_freshness_seconds,
        data_delay_type=ts.data_delay_type,
        is_stale=ts.is_stale,
        is_mock=ts.is_mock,
        disclaimer=ts.disclaimer,
    )

@router.get("", response_model=SignalOverviewResponse)
async def get_signals(
    signal_type: Optional[str] = Query(None, description="BUY_CANDIDATE, WATCH, WAIT, EXIT, NO_TRADE"),
    action: Optional[str] = Query(None, description="STRONG_BUY, BUY, HOLD, SELL, WATCH, WAIT"),
    status: Optional[str] = Query(None, description="ACTIVE, TARGET_1_HIT, STOPPED_OUT, EXPIRED"),
    min_score: int = Query(0, ge=0, le=100),
    timeframe: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    exclude_defaulters: bool = Query(True, description="Filter out PSX Defaulters' Segment & Non-Compliant stocks"),
    shariah_only: bool = Query(False, description="Filter only KMI Shariah-compliant equities")
):
    """
    Retrieve active systematic trading signals from the Momentum + Volume + VWAP + Breakout strategy.
    """
    # 1. Fetch from signal storage / engine
    stored_signals = signal_storage.get_signals(
        signal_type=signal_type,
        status=status,
        min_score=min_score,
        limit=100
    )

    if not stored_signals and not signal_engine.last_summary:
        # Trigger initial generation run
        summary = await signal_engine.generate_signals()
        stored_signals = summary.active_signals

    if stored_signals:
        legacy_list = [_to_legacy_signal(s) for s in stored_signals]
        
        if action and action.upper() != "ALL":
            legacy_list = [s for s in legacy_list if s.action.upper() == action.upper()]
        if timeframe and timeframe.upper() != "ALL":
            legacy_list = [s for s in legacy_list if timeframe.lower() in s.timeframe.lower()]
        if sector and sector.upper() != "ALL":
            legacy_list = [s for s in legacy_list if sector.lower() in s.sector.lower()]
        if exclude_defaulters:
            legacy_list = [s for s in legacy_list if not s.is_defaulter and not s.is_non_compliant]
        if shariah_only:
            legacy_list = [s for s in legacy_list if s.is_shariah_compliant]

        ts = signal_engine.last_summary.last_generation_timestamp if signal_engine.last_summary else datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S PKT")
        
        return SignalOverviewResponse(
            total_signals=len(legacy_list),
            strong_buy_count=sum(1 for s in legacy_list if s.action == "STRONG_BUY" or s.signal_type == "BUY_CANDIDATE"),
            buy_count=sum(1 for s in legacy_list if s.action == "BUY"),
            hold_count=sum(1 for s in legacy_list if s.action == "HOLD"),
            sell_count=sum(1 for s in legacy_list if s.action in ["SELL", "STRONG_SELL", "EXIT"]),
            watch_count=sum(1 for s in legacy_list if s.signal_type == "WATCH" or s.action == "WATCH"),
            wait_count=sum(1 for s in legacy_list if s.signal_type == "WAIT" or s.action == "WAIT"),
            exit_count=sum(1 for s in legacy_list if s.signal_type == "EXIT" or s.action == "EXIT"),
            signals=legacy_list,
            timestamp=ts,
            is_mock=False,
            disclaimer="REAL PSX SIGNALS. Opportunity Score is an algorithmic ranking of technical confluence, NOT a guarantee of profit."
        )

    # If no stored signals, return clean real empty response
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S PKT")
    return SignalOverviewResponse(
        total_signals=0,
        strong_buy_count=0,
        buy_count=0,
        hold_count=0,
        sell_count=0,
        watch_count=0,
        wait_count=0,
        exit_count=0,
        signals=[],
        timestamp=ts,
        is_mock=False,
        disclaimer="REAL PSX SIGNALS. Systematic technical confluence ranking."
    )

@router.get("/engine", response_model=SignalEngineSummary)
async def get_signal_engine_summary():
    """Retrieve full diagnostic summary of the signal generation engine and active signals."""
    if not signal_engine.last_summary:
        await signal_engine.generate_signals()
    return signal_engine.last_summary

@router.post("/generate", response_model=SignalEngineSummary)
async def trigger_signal_generation(force_refresh: bool = Query(True)):
    """Trigger an immediate, on-demand evaluation of all PSX equities."""
    summary = await signal_engine.generate_signals(force_refresh_quotes=force_refresh)
    return summary

@router.get("/config", response_model=StrategyConfig)
async def get_strategy_config():
    """Retrieve current Strategy configuration and version parameters."""
    return signal_engine.config

@router.post("/config", response_model=StrategyConfig)
async def update_strategy_config(new_config: Dict[str, Any]):
    """Update strategy thresholds dynamically (min score, RVOL, vwap distance, etc.)."""
    try:
        updated = signal_engine.update_config(new_config)
        return updated
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid configuration parameters: {str(e)}")

@router.get("/history", response_model=List[TradingSignal])
async def get_signal_history(
    signal_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200)
):
    """Retrieve historical and archived trading signals."""
    return signal_storage.get_signals(signal_type=signal_type, status=status, limit=limit)

@router.get("/{signal_id}", response_model=TradingSignal)
async def get_signal_by_id(signal_id: str):
    """Retrieve full details of a specific signal including all 9 condition flags and breakdown."""
    sig = signal_storage.get_signal_by_id(signal_id)
    if sig:
        return sig
    raise HTTPException(status_code=404, detail=f"Trading signal '{signal_id}' not found")

@router.get("/{signal_id}/lifecycle", response_model=List[SignalLifecycleEvent])
async def get_signal_lifecycle(signal_id: str):
    """Retrieve complete lifecycle audit trail of state transitions for a signal."""
    events = signal_storage.get_lifecycle_events(signal_id)
    return events

@router.post("/{signal_id}/status")
async def update_signal_status(signal_id: str, req: SignalStatusUpdateRequest):
    """
    Update signal status (e.g. TARGET_1_HIT, TARGET_2_HIT, STOPPED_OUT, EXPIRED, INVALIDATED, ACTIVE)
    with audit log and automatic notification dispatch.
    """
    updated_sig = signal_storage.update_signal_status(
        signal_id=signal_id,
        new_status=req.status,
        note=req.note or "",
        price=req.price
    )
    if not updated_sig:
        raise HTTPException(status_code=404, detail=f"Trading signal '{signal_id}' not found")

    # If target hit or stopped out, dispatch broadcast notification
    if req.status.upper() in ["TARGET_1_HIT", "TARGET_2_HIT", "STOPPED_OUT"]:
        try:
            await alerts_service.broadcast_trade_signal(
                symbol=updated_sig.symbol,
                action=f"{req.status.upper()} ({updated_sig.action})",
                price=updated_sig.current_price,
                score=updated_sig.opportunity_score,
                entry=updated_sig.entry_price,
                stop_loss=updated_sig.stop_loss,
                target_1=updated_sig.target_1,
                target_2=updated_sig.target_2,
                risk_reward=updated_sig.risk_reward_ratio,
                signal_id=updated_sig.id,
            )
        except Exception:
            pass

    return {
        "status": "success",
        "signal_id": signal_id,
        "new_status": updated_sig.status.value,
        "updated_at": updated_sig.updated_at
    }
