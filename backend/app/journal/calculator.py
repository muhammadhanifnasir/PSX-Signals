import math
from typing import List, Optional

from backend.app.journal.models import (
    RiskCalculationRequest,
    RiskCalculationResult,
    RiskSettings,
)

def calculate_position_size_and_risk(
    req: RiskCalculationRequest,
    settings: RiskSettings
) -> RiskCalculationResult:
    """
    Computes exact mathematical position sizing, stop-loss metrics,
    risk-to-reward ratios, and defensive risk warnings.
    """
    capital = req.capital_override if req.capital_override and req.capital_override > 0 else settings.trading_capital
    risk_pct = req.risk_pct_override if req.risk_pct_override and req.risk_pct_override > 0 else settings.max_risk_per_trade_pct

    entry = float(req.entry_price)
    sl = float(req.stop_loss)

    sl_dist_pkr = round(abs(entry - sl), 2)
    sl_dist_pct = round((sl_dist_pkr / entry) * 100.0, 2) if entry > 0 else 0.0

    risk_amount_pkr = round(capital * (risk_pct / 100.0), 2)

    # Position sizing: Shares = Risk Amount / SL Distance
    if sl_dist_pkr > 0:
        raw_shares = int(risk_amount_pkr // sl_dist_pkr)
    else:
        raw_shares = 0

    # Max single position limit (e.g. 25% of capital)
    max_pos_cap = capital * (settings.max_single_position_pct / 100.0)
    max_shares_by_cap = int(max_pos_cap // entry) if entry > 0 else 0

    warnings: List[str] = []

    if raw_shares > max_shares_by_cap and max_shares_by_cap > 0:
        recommended_shares = max_shares_by_cap
        warnings.append(
            f"Share quantity capped from {raw_shares} to {max_shares_by_cap} to enforce max single position ceiling "
            f"({settings.max_single_position_pct}% = PKR {max_pos_cap:,.0f})."
        )
    else:
        recommended_shares = max(raw_shares, 1)

    rec_pos_val = round(recommended_shares * entry, 2)
    pos_size_pct = round((rec_pos_val / capital) * 100.0, 2) if capital > 0 else 0.0

    # Targets & R:R
    t1_rr: Optional[float] = None
    t1_potential: Optional[float] = None
    if req.target_1 and req.target_1 > entry and sl_dist_pkr > 0:
        gain_1 = req.target_1 - entry
        t1_rr = round(gain_1 / sl_dist_pkr, 2)
        t1_potential = round(recommended_shares * gain_1, 2)
        if t1_rr < 1.5:
            warnings.append(f"Target 1 Risk-to-Reward ratio ({t1_rr}:1) is under the 1.5:1 recommended threshold.")

    t2_rr: Optional[float] = None
    t2_potential: Optional[float] = None
    if req.target_2 and req.target_2 > entry and sl_dist_pkr > 0:
        gain_2 = req.target_2 - entry
        t2_rr = round(gain_2 / sl_dist_pkr, 2)
        t2_potential = round(recommended_shares * gain_2, 2)

    # Estimated round-trip commission
    comm_rate = settings.commission_rate_pct / 100.0
    est_comm = round(rec_pos_val * comm_rate * 2.0, 2)

    # Additional Stop Loss Warnings
    if sl_dist_pct > 8.0:
        warnings.append(f"Wide stop-loss distance ({sl_dist_pct:.1f}%). High capital volatility per share.")
    elif sl_dist_pct < 1.0:
        warnings.append(f"Very tight stop-loss distance ({sl_dist_pct:.1f}%). Vulnerable to normal PSX intraday noise.")

    return RiskCalculationResult(
        symbol=req.symbol.upper(),
        entry_price=entry,
        stop_loss=sl,
        stop_loss_distance_pkr=sl_dist_pkr,
        stop_loss_distance_pct=sl_dist_pct,
        risk_amount_pkr=risk_amount_pkr,
        recommended_shares=recommended_shares,
        recommended_position_value=rec_pos_val,
        position_size_pct_of_capital=pos_size_pct,
        target_1=req.target_1,
        target_1_rr=t1_rr,
        target_1_potential_pkr=t1_potential,
        target_2=req.target_2,
        target_2_rr=t2_rr,
        target_2_potential_pkr=t2_potential,
        estimated_commission_pkr=est_comm,
        warnings=warnings,
    )
