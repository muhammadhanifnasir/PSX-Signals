import math
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class OrderBracketSimulationRequest(BaseModel):
    symbol: str
    price: float
    quantity: int
    stop_loss: Optional[float] = None
    target_1: Optional[float] = None
    target_2: Optional[float] = None
    is_filer: bool = True
    is_day_trade: bool = False
    average_daily_volume: Optional[int] = None

class OrderBracketSimulationResponse(BaseModel):
    symbol: str
    nominal_price: float
    quantity: int
    nominal_trade_value: float
    estimated_slippage_pct: float
    estimated_slippage_pkr: float
    effective_entry_price: float
    effective_capital_required: float
    brokerage_commission_pkr: float
    secp_turnover_levy_pkr: float
    cvt_pkr: float
    nccpl_charge_pkr: float
    wht_pkr: float
    total_statutory_charges_pkr: float
    breakeven_price: float
    breakeven_buffer_pct: float
    target1_gross_profit_pkr: float
    target1_net_profit_pkr: float
    target1_net_return_pct: float
    risk_pkr: float
    risk_reward_ratio: float
    tax_filer_status: str

def simulate_psx_bracket_order(req: OrderBracketSimulationRequest) -> OrderBracketSimulationResponse:
    """
    Computes institutional execution cost basis for Pakistan Stock Exchange:
    1. Slippage impact based on order size vs volume depth.
    2. Official PSX statutory costs:
       - Brokerage Commission (0.15%)
       - SECP Turnover Levy (0.002%)
       - Capital Value Tax (CVT) (0.01%)
       - NCCPL Settlement Charges (PKR 0.001 per share, minimum PKR 5)
       - Advance Withholding Tax (WHT): 0.02% (Active Filer) vs 0.04% (Non-Filer)
    3. Net effective cost basis, breakeven price, and net risk-reward.
    """
    price = max(req.price, 0.01)
    qty = max(req.quantity, 1)
    nominal_val = price * qty

    # 1. Slippage Model
    # Determine base slippage from order size and ADV
    if req.average_daily_volume and req.average_daily_volume > 0:
        pct_of_adv = (qty / req.average_daily_volume) * 100.0
        if pct_of_adv <= 0.5:
            slippage_pct = 0.05
        elif pct_of_adv <= 2.0:
            slippage_pct = 0.12
        elif pct_of_adv <= 5.0:
            slippage_pct = 0.35
        else:
            slippage_pct = min(0.35 + (pct_of_adv - 5.0) * 0.15, 1.50)
    else:
        # Default heuristic based on trade size
        if nominal_val < 250_000:
            slippage_pct = 0.08
        elif nominal_val < 1_000_000:
            slippage_pct = 0.15
        elif nominal_val < 5_000_000:
            slippage_pct = 0.30
        else:
            slippage_pct = 0.65

    slippage_pkr = round(nominal_val * (slippage_pct / 100.0), 2)
    effective_entry = round(price * (1.0 + (slippage_pct / 100.0)), 2)

    # 2. Statutory PSX Transaction Costs
    # Brokerage: 0.15% of trade value (or PKR 0.03/share min, whichever is higher)
    brokerage = max(nominal_val * 0.0015, qty * 0.03)

    # SECP Turnover Levy: 0.002% of trade value
    secp_levy = nominal_val * 0.00002

    # Capital Value Tax (CVT): 0.01%
    cvt = nominal_val * 0.00010

    # NCCPL Settlement Charges: PKR 0.001 per share (Min PKR 5.00)
    nccpl = max(qty * 0.001, 5.0)

    # Withholding Tax (WHT): 0.02% (Filer) or 0.04% (Non-Filer)
    wht_rate = 0.0002 if req.is_filer else 0.0004
    wht = nominal_val * wht_rate

    # One-way total charges
    one_way_charges = brokerage + secp_levy + cvt + nccpl + wht

    # Round trip charges (buying + selling)
    round_trip_charges = one_way_charges * 2.0

    # Total capital required to enter position safely
    effective_capital = round(nominal_val + slippage_pkr + one_way_charges, 2)

    # Breakeven price (needs to cover entry slippage + round-trip commissions & taxes)
    breakeven_price = round(effective_entry + (round_trip_charges / qty), 2)
    breakeven_buffer = round(((breakeven_price - price) / price) * 100.0, 2)

    # Target 1 calculations
    t1 = req.target_1 if req.target_1 and req.target_1 > 0 else round(price * 1.05, 2)
    t1_gross = round((t1 - effective_entry) * qty, 2)
    t1_net = round(t1_gross - round_trip_charges, 2)
    t1_net_pct = round((t1_net / nominal_val) * 100.0, 2)

    # Stop Loss & Risk calculations
    sl = req.stop_loss if req.stop_loss and req.stop_loss > 0 else round(price * 0.96, 2)
    risk_gross = (effective_entry - sl) * qty
    risk_net = round(risk_gross + round_trip_charges, 2)

    rr_ratio = round(t1_net / max(risk_net, 1.0), 2) if risk_net > 0 else 2.5

    filer_label = "Active Filer (0.02% WHT Rate)" if req.is_filer else "Non-Filer (0.04% WHT Rate Penalty)"

    return OrderBracketSimulationResponse(
        symbol=req.symbol.upper(),
        nominal_price=round(price, 2),
        quantity=qty,
        nominal_trade_value=round(nominal_val, 2),
        estimated_slippage_pct=round(slippage_pct, 2),
        estimated_slippage_pkr=slippage_pkr,
        effective_entry_price=effective_entry,
        effective_capital_required=effective_capital,
        brokerage_commission_pkr=round(brokerage, 2),
        secp_turnover_levy_pkr=round(secp_levy, 2),
        cvt_pkr=round(cvt, 2),
        nccpl_charge_pkr=round(nccpl, 2),
        wht_pkr=round(wht, 2),
        total_statutory_charges_pkr=round(one_way_charges, 2),
        breakeven_price=breakeven_price,
        breakeven_buffer_pct=breakeven_buffer,
        target1_gross_profit_pkr=t1_gross,
        target1_net_profit_pkr=t1_net,
        target1_net_return_pct=t1_net_pct,
        risk_pkr=max(risk_net, 0.0),
        risk_reward_ratio=rr_ratio,
        tax_filer_status=filer_label,
    )
