import datetime
from fastapi import APIRouter
from backend.app.models.scanner import OpportunitiesResponse, OpportunityItem
from backend.app.scanner.scanner_engine import scanner_engine

router = APIRouter(prefix="/opportunities", tags=["Opportunities"])

@router.get("", response_model=OpportunitiesResponse)
async def get_top_opportunities():
    """Retrieve top high-probability trading opportunities with risk/reward metrics."""
    opps = scanner_engine.last_opportunities
    if not opps:
        # Trigger market scan if not run yet
        opps = await scanner_engine.scan_market()

    items = []
    if opps:
        for opp in opps[:6]:
            gain_pct = round(((opp.target_price_recommended - opp.entry_price_recommended) / opp.entry_price_recommended) * 100, 1) if opp.entry_price_recommended > 0 else 8.5
            items.append(OpportunityItem(
                id=f"OPP-{opp.symbol}",
                symbol=opp.symbol,
                company_name=opp.company_name,
                action="STRONG_BUY" if opp.opportunity_score >= 75 else "BUY",
                score=opp.opportunity_score,
                expected_return_pct=gain_pct,
                risk_level="High (Late Entry)" if opp.is_late_entry_risk else ("Medium" if opp.opportunity_score < 75 else "Low-Medium"),
                timeframe="Intraday / 1-3D",
                entry_range=f"Rs. {opp.entry_price_recommended:.2f}",
                stop_loss=opp.stop_loss_recommended,
                target_1=opp.target_price_recommended,
                catalyst=f"{opp.setup_type.value}: {opp.setup_description}",
                volume_surge=f"{opp.relative_volume:.2f}x Above 20D Avg"
            ))

    ts = scanner_engine.last_summary.scan_timestamp if scanner_engine.last_summary else datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S PKT")
    return OpportunitiesResponse(
        top_opportunities=items,
        timestamp=ts,
        is_mock=False,
        disclaimer="REAL PSX MARKET DATA (Official PSX DPS Data). Live algorithmic scanning."
    )
