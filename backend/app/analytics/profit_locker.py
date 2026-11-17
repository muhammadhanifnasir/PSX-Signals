from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class ProfitLockerPlanRequest(BaseModel):
    symbol: str
    entry_price: float
    current_price: float
    highest_price_reached: Optional[float] = None
    quantity: int = 1000
    stop_loss: float
    target_1: float
    target_2: float
    atr_14: Optional[float] = None
    is_filer: bool = True

class PartialScaleOutLeg(BaseModel):
    leg_name: str
    quantity: int
    exit_price: float
    gross_pnl_pkr: float
    net_pnl_pkr: float
    net_return_pct: float
    execution_status: str  # PENDING, EXECUTED, ACTIVE_RUNNER

class ProfitLockerPlanResponse(BaseModel):
    symbol: str
    entry_price: float
    current_price: float
    unrealized_gain_pct: float
    initial_stop_loss: float
    active_trailing_stop: float
    breakeven_price: float
    is_breakeven_locked: bool
    scale_out_phase: str  # PRE_TARGET_1, TARGET_1_LOCKED, FULL_RUNNER
    recommended_action: str
    trade_risk_status: str  # RISK_ACTIVE, RISK_FREE_BREAKEVEN, PROFIT_LOCKED
    scale_out_legs: List[PartialScaleOutLeg]
    blended_target_profit_pkr: float
    blended_target_return_pct: float
    total_statutory_fees_pkr: float
    guidance: str

def compute_profit_locker_plan(req: ProfitLockerPlanRequest) -> ProfitLockerPlanResponse:
    """
    Computes institutional profit-locking and dynamic trade management for PSX equities:
    1. Ratchets stop-loss to Breakeven (+0.35% round-trip friction) once Target 1 is approached.
    2. Models 50/50 scale-out (take 50% profit at T1, let 50% run to T2 with trailing ATR stop).
    3. Prevents winning trades from decaying into net losses.
    """
    entry = max(req.entry_price, 0.01)
    curr = max(req.current_price, 0.01)
    highest = max(req.highest_price_reached or curr, curr)
    qty = max(req.quantity, 1)

    # Round trip friction rate (0.15% broker + taxes on buy + sell = ~0.35%)
    wht_rate = 0.0002 if req.is_filer else 0.0004
    friction_rate = 0.0015 * 2 + 0.00002 * 2 + 0.0001 * 2 + wht_rate * 2
    round_trip_cost_per_share = round(entry * friction_rate + (5.0 / qty), 2)
    breakeven_stop = round(entry + round_trip_cost_per_share, 2)

    unrealized_pct = round(((curr - entry) / entry) * 100.0, 2)
    gain_from_entry = curr - entry

    # Determine scale-out phase and trailing stop
    t1 = req.target_1
    t2 = req.target_2
    initial_sl = req.stop_loss
    atr = req.atr_14 if req.atr_14 and req.atr_14 > 0 else round(entry * 0.025, 2)

    # Trailing ATR stop from highest high
    atr_trail = round(highest - (1.5 * atr), 2)

    half_qty = qty // 2
    rem_qty = qty - half_qty

    total_nominal = entry * qty
    total_fees = round(total_nominal * friction_rate, 2)

    # Leg 1: 50% booked at Target 1
    leg1_gross = (t1 - entry) * half_qty
    leg1_fees = total_fees * (half_qty / qty)
    leg1_net = round(leg1_gross - leg1_fees, 2)
    leg1_ret_pct = round((leg1_net / (entry * half_qty)) * 100.0, 2)

    # Leg 2: 50% runner to Target 2
    leg2_gross = (t2 - entry) * rem_qty
    leg2_fees = total_fees * (rem_qty / qty)
    leg2_net = round(leg2_gross - leg2_fees, 2)
    leg2_ret_pct = round((leg2_net / (entry * rem_qty)) * 100.0, 2)

    blended_net = round(leg1_net + leg2_net, 2)
    blended_pct = round((blended_net / total_nominal) * 100.0, 2)

    # Check phase
    is_t1_hit = curr >= t1 or (unrealized_pct >= 4.0)
    is_breakeven_eligible = curr >= (entry + (t1 - entry) * 0.6) or (unrealized_pct >= 2.5)

    if is_t1_hit:
        phase = "TARGET_1_LOCKED"
        risk_status = "PROFIT_LOCKED"
        # When T1 is hit, trailing stop is at least Breakeven or ATR trail, whichever is higher
        active_stop = max(breakeven_stop, atr_trail)
        rec_action = f"Scale out 50% ({half_qty:,} shares) at Target 1. Ratchet stop on remaining {rem_qty:,} shares to PKR {active_stop:.2f}."
        guidance = "Target 1 achieved! 50% capital locked in profit. The remaining position is 100% risk-free targeting T2."
        leg1_status = "EXECUTED"
        leg2_status = "ACTIVE_RUNNER"
    elif is_breakeven_eligible:
        phase = "BREAKEVEN_RATCHETED"
        risk_status = "RISK_FREE_BREAKEVEN"
        active_stop = max(breakeven_stop, initial_sl)
        rec_action = f"Move stop-loss up to Breakeven (PKR {breakeven_stop:.2f}). Initial trade risk fully eliminated."
        guidance = "Position gained >2.5%. Breakeven Stop active. Downside risk is 0."
        leg1_status = "PENDING"
        leg2_status = "PENDING"
    else:
        phase = "PRE_TARGET_1"
        risk_status = "RISK_ACTIVE"
        active_stop = initial_sl
        rec_action = f"Maintain original structural stop-loss at PKR {initial_sl:.2f}. Awaiting initial momentum push."
        guidance = "Trade in progress. Enforce hard stop at invalidation level."
        leg1_status = "PENDING"
        leg2_status = "PENDING"

    legs = [
        PartialScaleOutLeg(
            leg_name="Leg 1: Initial Target Scale-Out (50%)",
            quantity=half_qty,
            exit_price=round(t1, 2),
            gross_pnl_pkr=round(leg1_gross, 2),
            net_pnl_pkr=leg1_net,
            net_return_pct=leg1_ret_pct,
            execution_status=leg1_status,
        ),
        PartialScaleOutLeg(
            leg_name="Leg 2: Extended Runner Scale-Out (50%)",
            quantity=rem_qty,
            exit_price=round(t2, 2),
            gross_pnl_pkr=round(leg2_gross, 2),
            net_pnl_pkr=leg2_net,
            net_return_pct=leg2_ret_pct,
            execution_status=leg2_status,
        ),
    ]

    return ProfitLockerPlanResponse(
        symbol=req.symbol.upper(),
        entry_price=round(entry, 2),
        current_price=round(curr, 2),
        unrealized_gain_pct=unrealized_pct,
        initial_stop_loss=round(initial_sl, 2),
        active_trailing_stop=round(active_stop, 2),
        breakeven_price=round(breakeven_stop, 2),
        is_breakeven_locked=is_breakeven_eligible or is_t1_hit,
        scale_out_phase=phase,
        recommended_action=rec_action,
        trade_risk_status=risk_status,
        scale_out_legs=legs,
        blended_target_profit_pkr=blended_net,
        blended_target_return_pct=blended_pct,
        total_statutory_fees_pkr=total_fees,
        guidance=guidance,
    )
