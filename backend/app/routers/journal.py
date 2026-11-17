from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import PlainTextResponse

from backend.app.journal.models import (
    JournalTrade,
    JournalTradeCreate,
    JournalTradeClose,
    JournalTradeUpdate,
    RiskSettings,
    RiskCalculationRequest,
    RiskCalculationResult,
    PortfolioExposure,
    PerformanceAnalyticsReport,
)
from backend.app.journal.storage import journal_storage
from backend.app.journal.calculator import calculate_position_size_and_risk
from backend.app.journal.analytics import calculate_performance_analytics
from backend.app.journal.export import generate_journal_csv
from backend.app.analytics.slippage_simulator import (
    OrderBracketSimulationRequest,
    OrderBracketSimulationResponse,
    simulate_psx_bracket_order,
)
from backend.app.analytics.fix_order_formatter import (
    FastOrderTicketRequest,
    FastOrderTicketResponse,
    generate_psx_order_ticket,
)
from backend.app.analytics.profit_locker import (
    ProfitLockerPlanRequest,
    ProfitLockerPlanResponse,
    compute_profit_locker_plan,
)

router = APIRouter(prefix="/journal", tags=["Trade Journal & Risk Management"])

@router.get("/trades", response_model=List[JournalTrade])
def get_trades(
    status: Optional[str] = Query(None, description="Filter by status: OPEN, CLOSED, or ALL"),
    symbol: Optional[str] = Query(None, description="Filter by PSX stock symbol e.g. AIRLINK"),
):
    """Retrieve trades with optional status and symbol filtering."""
    return journal_storage.get_trades(status=status, symbol=symbol)

@router.post("/trades", response_model=JournalTrade)
def create_trade(trade_in: JournalTradeCreate):
    """Log a new manual trade in the trade journal."""
    try:
        return journal_storage.create_trade(trade_in)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create trade: {str(e)}")

@router.get("/trades/{trade_id}", response_model=JournalTrade)
def get_trade(trade_id: str):
    """Get single trade by ID."""
    trade = journal_storage.get_trade(trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail=f"Trade {trade_id} not found")
    return trade

@router.put("/trades/{trade_id}", response_model=JournalTrade)
def update_trade(trade_id: str, update_in: JournalTradeUpdate):
    """Update stop-loss, targets, strategy, or notes of a journal trade."""
    updated = journal_storage.update_trade(trade_id, update_in)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Trade {trade_id} not found")
    return updated

@router.post("/trades/{trade_id}/close", response_model=JournalTrade)
def close_trade(trade_id: str, close_in: JournalTradeClose):
    """Close an open trade with realized exit price, exit date, and reason."""
    closed = journal_storage.close_trade(trade_id, close_in)
    if not closed:
        raise HTTPException(status_code=404, detail=f"Trade {trade_id} not found or could not be closed")
    return closed

@router.delete("/trades/{trade_id}")
def delete_trade(trade_id: str):
    """Remove a trade from the journal."""
    deleted = journal_storage.delete_trade(trade_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Trade {trade_id} not found")
    return {"status": "success", "message": f"Trade {trade_id} deleted successfully"}

@router.get("/export.csv")
def export_journal_csv():
    """Export complete trade journal history to a formatted CSV."""
    trades = journal_storage.get_trades()
    csv_content = generate_journal_csv(trades)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=psx_trade_journal.csv"}
    )

# --- Risk Management Endpoints ---

@router.get("/risk/settings", response_model=RiskSettings)
def get_risk_settings():
    """Retrieve active risk management settings and capital thresholds."""
    return journal_storage.get_risk_settings()

@router.post("/risk/settings", response_model=RiskSettings)
def update_risk_settings(settings: RiskSettings):
    """Update risk management capital parameters and position limits."""
    return journal_storage.update_risk_settings(settings)

@router.post("/risk/calculate", response_model=RiskCalculationResult)
def calculate_risk(req: RiskCalculationRequest):
    """
    Calculate mathematical position sizing, stop-loss distance,
    target risk-reward ratios, and defensive risk warnings.
    """
    settings = journal_storage.get_risk_settings()
    return calculate_position_size_and_risk(req, settings)

@router.get("/risk/exposure", response_model=PortfolioExposure)
def get_portfolio_exposure():
    """Get active portfolio exposure, sector concentration, and risk warnings."""
    return journal_storage.get_portfolio_exposure()

# --- Performance Analytics Endpoints ---

@router.get("/analytics", response_model=PerformanceAnalyticsReport)
def get_performance_analytics():
    """
    Get comprehensive performance analytics: win rate, profit factor,
    expectancy, max drawdown, strategy comparison, monthly performance,
    and signal-to-trade conversion.
    """
    trades = journal_storage.get_trades()
    settings = journal_storage.get_risk_settings()
    return calculate_performance_analytics(trades, initial_capital=settings.trading_capital)

# --- Phase 3 & 4: Institutional Bracket Simulator & SCSTrade/FIX Execution ---

@router.post("/simulate-order", response_model=OrderBracketSimulationResponse)
def simulate_order(req: OrderBracketSimulationRequest):
    """
    Simulate institutional execution costs on PSX:
    Volume-weighted slippage + official PSX fees (Brokerage, SECP, CVT, NCCPL, WHT)
    and net breakeven & risk-reward ratio.
    """
    return simulate_psx_bracket_order(req)

@router.post("/fast-order-ticket", response_model=FastOrderTicketResponse)
def get_fast_order_ticket(req: FastOrderTicketRequest):
    """
    Generate an institutional execution ticket formatted for SCS Trade quick paste
    and standard FIX 4.2 protocol messaging, complete with pre-trade safety checks.
    """
    return generate_psx_order_ticket(req)

@router.post("/export-batch-csv")
def export_batch_csv(orders: List[FastOrderTicketRequest]):
    """
    Generate downloadable batch CSV file compatible with SCS Trade Desktop batch order import.
    """
    lines = ["Symbol,Side,OrderType,Qty,Price,DisclosedQty,Validity,ClientCode,TriggerPrice"]
    for order in orders:
        ticket = generate_psx_order_ticket(order)
        lines.append(ticket.batch_csv_row)
    csv_content = "\n".join(lines)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=scstrade_psx_batch_orders.csv"}
    )

@router.post("/profit-locker", response_model=ProfitLockerPlanResponse)
def get_profit_locker_plan(req: ProfitLockerPlanRequest):
    """
    Compute dynamic profit-locking rules:
    Auto-breakeven ratchet (+0.35% friction buffer), 50/50 scale-out execution,
    and 1.5x ATR trailing stop.
    """
    return compute_profit_locker_plan(req)

