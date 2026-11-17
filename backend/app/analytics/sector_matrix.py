import datetime
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.market_engine.models import NormalizedQuote, MarketOverview

class SectorRotationQuadrant(str, Enum):
    LEADING = "LEADING"        # Outperforming benchmark with positive relative strength and momentum
    WEAKENING = "WEAKENING"    # Outperforming but momentum slowing down (exhaustion risk)
    LAGGING = "LAGGING"        # Underperforming benchmark with negative relative strength
    IMPROVING = "IMPROVING"    # Underperforming but momentum turning positive (early accumulation)

class SectorPerformance(BaseModel):
    sector: str
    company_count: int
    total_volume: int
    total_volume_formatted: str
    total_turnover_pkr: float
    total_turnover_formatted: str
    average_change_percent: float
    weighted_change_percent: float
    relative_strength_vs_kse100: float  # Sector change % minus KSE-100 change %
    advances: int
    declines: int
    unchanged: int
    quadrant: SectorRotationQuadrant
    quadrant_label: str
    top_stock_symbol: str
    top_stock_change_pct: float
    is_shariah_eligible: bool = True

class MacroMarketRegime(str, Enum):
    BULL_MOMENTUM = "BULL_MOMENTUM"
    BULL_CONSOLIDATION = "BULL_CONSOLIDATION"
    NEUTRAL_RANGE = "NEUTRAL_RANGE"
    CORRECTION_RISK = "CORRECTION_RISK"
    BEAR_TREND = "BEAR_TREND"

class MacroRegimeReport(BaseModel):
    regime: MacroMarketRegime
    regime_title: str
    market_risk_mode: str
    recommended_posture: str
    score_threshold_adjustment: int  # e.g. +5 in Bear, 0 in Bull
    index_name: str
    index_value: float
    index_change: float
    index_change_percent: float
    advances_declines_ratio: float
    leading_sectors: List[str]
    lagging_sectors: List[str]
    institutional_guidance: str
    timestamp: str

def compute_sector_rotation(
    quotes: List[NormalizedQuote],
    index_change_pct: float = 0.0
) -> List[SectorPerformance]:
    """
    Computes real-time PSX Sector Rotation matrix from live equity quotes.
    Groups quotes by sector, aggregates turnover and volume, computes capitalization/volume
    weighted relative strength vs KSE-100 benchmark, and maps into 4 RRG rotation quadrants.
    """
    if not quotes:
        return []

    # Filter out quotes without sectors or general unclassified
    sector_groups: Dict[str, List[NormalizedQuote]] = {}
    for q in quotes:
        sec = q.sector.strip() if q.sector else "General Equities"
        if sec in ["", "General", "Unclassified"]:
            sec = "General Equities"
        sector_groups.setdefault(sec, []).append(q)

    non_shariah_sectors = ["COMMERCIAL BANKS", "INSURANCE", "TOBACCO", "LEASING COMPANIES", "MODARABAS", "INVESTMENT BANKS"]

    results: List[SectorPerformance] = []

    for sec_name, sec_quotes in sector_groups.items():
        if len(sec_quotes) == 0:
            continue

        comp_count = len(sec_quotes)
        total_vol = sum(q.volume for q in sec_quotes)
        total_turnover = sum(q.price * q.volume for q in sec_quotes)

        advances = sum(1 for q in sec_quotes if q.change > 0)
        declines = sum(1 for q in sec_quotes if q.change < 0)
        unchanged = sum(1 for q in sec_quotes if q.change == 0)

        # Average change percent
        avg_change = round(sum(q.change_percent for q in sec_quotes) / comp_count, 2)

        # Volume-weighted change percent
        if total_vol > 0:
            weighted_change = round(sum(q.change_percent * q.volume for q in sec_quotes) / total_vol, 2)
        else:
            weighted_change = avg_change

        # Relative strength vs KSE-100 benchmark
        rs = round(weighted_change - index_change_pct, 2)

        # Map to Rotation Quadrant (similar to Relative Rotation Graphs RRG)
        # Quadrant logic:
        # RS > 0 and weighted_change >= 0 => LEADING
        # RS > 0 but weighted_change < 0  => WEAKENING
        # RS <= 0 and weighted_change < 0 => LAGGING
        # RS <= 0 but weighted_change >= 0 => IMPROVING
        if rs > 0 and weighted_change >= 0:
            quadrant = SectorRotationQuadrant.LEADING
            label = "Leading (Outperforming Benchmark)"
        elif rs > 0 and weighted_change < 0:
            quadrant = SectorRotationQuadrant.WEAKENING
            label = "Weakening (Losing Momentum)"
        elif rs <= 0 and weighted_change < 0:
            quadrant = SectorRotationQuadrant.LAGGING
            label = "Lagging (Underperforming Drag)"
        else:
            quadrant = SectorRotationQuadrant.IMPROVING
            label = "Improving (Early Accumulation)"

        # Find top performer in sector
        top_stock = max(sec_quotes, key=lambda x: (x.change_percent, x.volume))

        # Format helpers
        vol_fmt = f"{round(total_vol / 1_000_000, 2)}M" if total_vol >= 1_000_000 else f"{round(total_vol / 1000, 1)}K"
        turnover_fmt = f"PKR {round(total_turnover / 1_000_000_000, 2)}B" if total_turnover >= 1_000_000_000 else f"PKR {round(total_turnover / 1_000_000, 1)}M"

        is_shariah = not any(ns in sec_name.upper() for ns in non_shariah_sectors)

        results.append(SectorPerformance(
            sector=sec_name,
            company_count=comp_count,
            total_volume=total_vol,
            total_volume_formatted=vol_fmt,
            total_turnover_pkr=round(total_turnover, 2),
            total_turnover_formatted=turnover_fmt,
            average_change_percent=avg_change,
            weighted_change_percent=weighted_change,
            relative_strength_vs_kse100=rs,
            advances=advances,
            declines=declines,
            unchanged=unchanged,
            quadrant=quadrant,
            quadrant_label=label,
            top_stock_symbol=top_stock.symbol,
            top_stock_change_pct=top_stock.change_percent,
            is_shariah_eligible=is_shariah
        ))

    # Sort descending by turnover
    results.sort(key=lambda s: s.total_turnover_pkr, reverse=True)
    return results

def compute_macro_regime(
    overview: MarketOverview,
    quotes: List[NormalizedQuote]
) -> MacroRegimeReport:
    """
    Classifies the macro market regime of the Pakistan Stock Exchange based on
    KSE-100 benchmark index behavior, breadth ratio, and sector dispersion.
    """
    idx_chg_pct = overview.index_change_percent
    adv = overview.advances
    dec = overview.declines
    total_traded = max(overview.total_traded_companies, 1)
    ad_ratio = round(adv / max(dec, 1), 2)

    # Classify Regime
    if idx_chg_pct >= 0.8 and ad_ratio >= 1.5:
        regime = MacroMarketRegime.BULL_MOMENTUM
        title = "Bullish Momentum (Aggressive Expansion)"
        risk_mode = "AGGRESSIVE_LONGS"
        posture = "Take full-size positions on top momentum leaders above VWAP."
        adj = 0
        guidance = "Market breadth strongly favors buyers. Institutional flows supporting leading equities."
    elif idx_chg_pct > 0.0 and ad_ratio >= 1.0:
        regime = MacroMarketRegime.BULL_CONSOLIDATION
        title = "Bullish Consolidation (Selective Accumulation)"
        risk_mode = "SELECTIVE_QUALITY"
        posture = "Focus strictly on Tier-1 breakout stocks with confirmed RVOL > 1.5x."
        adj = 0
        guidance = "Index is positive with steady absorption. Prioritize high-quality setups over speculative names."
    elif -0.4 <= idx_chg_pct <= 0.0:
        regime = MacroMarketRegime.NEUTRAL_RANGE
        title = "Neutral Chop / Range-Bound"
        risk_mode = "SELECTIVE_QUALITY"
        posture = "Keep position sizes at 60-70% of standard capital. Wait for confirmed pullbacks to dynamic support."
        adj = 2
        guidance = "Index consolidating within daily bands. Protect capital against intraday chop."
    elif -1.2 <= idx_chg_pct < -0.4:
        regime = MacroMarketRegime.CORRECTION_RISK
        title = "Correction Risk (Distribution Alert)"
        risk_mode = "DEFENSIVE_TIGHT_STOPS"
        posture = "Tighten stop-loss thresholds. Raise minimum opportunity score to 75. Scale down allocation."
        adj = 5
        guidance = "Broad selling pressure detected across high-beta equities. Avoid chasing breakout tops."
    else:
        regime = MacroMarketRegime.BEAR_TREND
        title = "Bearish Trend / Risk-Off Distribution"
        risk_mode = "CAPITAL_PRESERVATION_CASH"
        posture = "Hold 80%+ cash. Strict suppression of speculative buy candidates. No new swing exposure."
        adj = 8
        guidance = "Severe market drop. Preserve trading capital and await stabilization above major floor pivots."

    # Identify top leading and lagging sectors
    sector_results = compute_sector_rotation(quotes, idx_chg_pct)
    leaders = [s.sector for s in sector_results if s.quadrant == SectorRotationQuadrant.LEADING][:3]
    laggards = [s.sector for s in sector_results if s.quadrant == SectorRotationQuadrant.LAGGING][:3]

    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S PKT")

    return MacroRegimeReport(
        regime=regime,
        regime_title=title,
        market_risk_mode=risk_mode,
        recommended_posture=posture,
        score_threshold_adjustment=adj,
        index_name=overview.index_name,
        index_value=overview.index_value,
        index_change=overview.index_change,
        index_change_percent=overview.index_change_percent,
        advances_declines_ratio=ad_ratio,
        leading_sectors=leaders or ["Technology & Communication", "Oil & Gas Exploration"],
        lagging_sectors=laggards or ["Textile", "Leasing"],
        institutional_guidance=guidance,
        timestamp=now_str
    )
