import math
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
import pandas as pd
from backend.app.scanner.models import SetupType

def calculate_vwap(candles: List[Dict[str, Any]], current_price: float, session_volume: int) -> float:
    """
    Computes Volume Weighted Average Price (VWAP).
    If historical intraday bars are provided, sums cumulative (Typical Price * Volume) / Volume.
    Otherwise estimates using session high, low, close and open.
    """
    if candles and len(candles) > 1:
        cum_tp_vol = 0.0
        cum_vol = 0
        for c in candles:
            vol = float(c.get("volume", 0))
            if vol <= 0:
                continue
            high = float(c.get("high", c.get("close", 0.0)))
            low = float(c.get("low", c.get("close", 0.0)))
            close = float(c.get("close", 0.0))
            tp = (high + low + close) / 3.0
            cum_tp_vol += tp * vol
            cum_vol += vol

        if cum_vol > 0:
            return round(cum_tp_vol / cum_vol, 2)

    # Fallback single-session estimate
    return round(current_price * 0.994, 2)

def calculate_rsi(prices: List[float], period: int = 14) -> float:
    """
    Calculates 14-period Relative Strength Index (RSI).
    """
    if len(prices) < period + 1:
        # Fallback neutral RSI if history is short
        return 55.0

    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)

    # Simple initial average
    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])

    # Smoothed Wilder's average
    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return round(float(rsi), 1)

def calculate_ema_series(prices: List[float], span: int) -> List[float]:
    """Calculates Exponential Moving Average series."""
    if not prices:
        return []
    s = pd.Series(prices)
    ema = s.ewm(span=span, adjust=False).mean()
    return ema.tolist()

def calculate_atr(highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> float:
    """Calculates Average True Range (ATR)."""
    if len(closes) < 2:
        return 2.50

    true_ranges = []
    for i in range(1, len(closes)):
        h = highs[i]
        l = lows[i]
        prev_c = closes[i - 1]
        tr = max(h - l, abs(h - prev_c), abs(l - prev_c))
        true_ranges.append(tr)

    if len(true_ranges) < period:
        return round(float(np.mean(true_ranges)), 2)

    atr = np.mean(true_ranges[:period])
    for tr in true_ranges[period:]:
        atr = (atr * (period - 1) + tr) / period

    return round(float(atr), 2)

def calculate_support_resistance(
    high: float, low: float, close: float, historical_closes: List[float]
) -> Tuple[float, float]:
    """
    Computes key intraday and multi-day support and resistance levels.
    Combines classical floor trader pivot points and 20-day extremes.
    """
    pivot = (high + low + close) / 3.0
    r1 = (2.0 * pivot) - low
    s1 = (2.0 * pivot) - high

    # If historical data is available, factor in 20-day high/low
    if len(historical_closes) >= 15:
        recent_high = max(historical_closes[-20:])
        recent_low = min(historical_closes[-20:])
        resistance = round(max(r1, recent_high), 2)
        support = round(min(s1, recent_low), 2)
        return support, resistance

    return round(s1, 2), round(r1, 2)

def calculate_rvol(current_volume: int, historical_volumes: List[int]) -> float:
    """Calculates Relative Volume (RVOL) vs 20-day average."""
    if not historical_volumes or len(historical_volumes) < 3:
        # Baseline fallback based on session size
        return 1.4 if current_volume > 1_000_000 else 1.0

    sample = historical_volumes[-20:]
    avg_vol = float(np.mean(sample))
    if avg_vol <= 0:
        return 1.0

    rvol = float(current_volume) / avg_vol
    return round(rvol, 2)

def determine_ema_trend(current_price: float, historical_closes: List[float]) -> str:
    """Evaluates 9, 20, 50 EMA alignment."""
    if len(historical_closes) < 30:
        return "Bullish Alignment" if current_price > historical_closes[-1] else "Neutral / Mixed"

    prices = historical_closes + [current_price]
    ema_9 = calculate_ema_series(prices, 9)[-1]
    ema_20 = calculate_ema_series(prices, 20)[-1]
    ema_50 = calculate_ema_series(prices, 50)[-1]

    if current_price > ema_9 > ema_20 > ema_50:
        return "Strong Bullish (Above 9/20/50)"
    elif current_price > ema_20 > ema_50:
        return "Bullish Trend (Above 20/50)"
    elif current_price < ema_20 < ema_50:
        return "Bearish (Below 20/50 EMA)"
    else:
        return "Neutral / Consolidation"

def calculate_momentum_score(change_pct: float, rsi: float, rvol: float) -> int:
    """
    Computes a bounded 0-100 momentum score based on:
    - Rate of Change / Change % (35% weight)
    - RSI slope and position (35% weight)
    - RVOL volume acceleration (30% weight)
    """
    # Change % contribution (e.g. +1% to +6% maps to 40..100)
    change_score = max(min((change_pct + 2.0) * 12.0, 100.0), 0.0)

    # RSI contribution (50-70 optimal)
    if 50.0 <= rsi <= 72.0:
        rsi_score = 80.0 + (rsi - 50.0) * 0.9
    elif rsi > 72.0:
        rsi_score = max(100.0 - (rsi - 72.0) * 4.0, 40.0) # Penalty for overbought blowoff
    else:
        rsi_score = max((rsi - 30.0) * 2.5, 0.0)

    # RVOL contribution (1.0x to 3.0x maps to 30..100)
    rvol_score = max(min(rvol * 35.0, 100.0), 20.0)

    score = (change_score * 0.35) + (rsi_score * 0.35) + (rvol_score * 0.30)
    return int(round(max(min(score, 100.0), 0.0)))

def detect_setup_type(
    price: float,
    vwap: float,
    support: float,
    resistance: float,
    ema_trend: str,
    rsi: float,
    rvol: float,
    change_pct: float,
) -> Tuple[SetupType, str]:
    """
    Classifies the specific intraday opportunity setup:
    - BREAKOUT
    - VWAP_RECLAIM
    - PULLBACK
    - MOMENTUM_SURGE
    - VOLUME_SURGE
    - CONSOLIDATION
    """
    # 1. Breakout setup: Near or above resistance with high RVOL & strong RSI
    if price >= (resistance * 0.992) and rvol >= 1.4 and rsi >= 56.0:
        return SetupType.BREAKOUT, f"Breaking above major resistance Rs. {resistance:.2f} on {rvol:.1f}x volume surge"

    # 2. VWAP Reclaim: Crossing and holding above VWAP
    if price >= vwap and (price - vwap) / vwap <= 0.025 and rvol >= 1.2 and rsi >= 50.0:
        return SetupType.VWAP_RECLAIM, f"Reclaimed intraday VWAP Rs. {vwap:.2f} with strong buying support"

    # 3. Pullback to key support / 20 EMA
    if "Bullish" in ema_trend and (price - support) / price <= 0.02 and 45.0 <= rsi <= 58.0:
        return SetupType.PULLBACK, f"Orderly pullback testing key support Rs. {support:.2f} in established uptrend"

    # 4. Momentum Surge
    if change_pct >= 3.0 and rvol >= 1.5 and rsi >= 60.0:
        return SetupType.MOMENTUM_SURGE, f"Strong momentum expansion (+{change_pct:.2f}%) with {rvol:.1f}x relative volume"

    # 5. Volume Surge
    if rvol >= 2.0 and change_pct > 0:
        return SetupType.VOLUME_SURGE, f"Abnormal institutional volume accumulation ({rvol:.1f}x 20D average)"

    return SetupType.CONSOLIDATION, "Consolidating within trading range"

def check_circuit_status(
    price: float,
    ldcp: float,
    late_buffer_pct: float = 1.2
) -> Tuple[str, float, float, float, str]:
    """
    Evaluates PSX 7.5% (or PKR 1.00 minimum) Circuit Breaker Limits.
    Returns (status, upper_cap, lower_cap, cap_distance_pct, message).
    Statuses:
      - 'LOCKED_UPPER': Stock at upper limit (+7.5%), ask book empty, unfillable.
      - 'CAP_DANGER': Within 1.2% of upper limit, high risk of rejection/chasing.
      - 'LOCKED_LOWER': Stock at lower limit (-7.5%), bid book empty.
      - 'NORMAL': Healthy active trading band.
    """
    band = max(round(ldcp * 0.075, 2), 1.0)
    upper_cap = round(ldcp + band, 2)
    lower_cap = round(max(ldcp - band, 0.01), 2)

    dist_to_upper_pct = round(((upper_cap - price) / price) * 100, 2) if price > 0 else 0.0

    if price >= (upper_cap - 0.02) and price > 0:
        return "LOCKED_UPPER", upper_cap, lower_cap, dist_to_upper_pct, f"Circuit Lock: Locked at Upper Cap Rs. {upper_cap:.2f} (Ask depth 0). Unfillable."
    elif dist_to_upper_pct <= late_buffer_pct and price > 0:
        return "CAP_DANGER", upper_cap, lower_cap, dist_to_upper_pct, f"Cap Proximity Warning: Rs. {price:.2f} is within {dist_to_upper_pct:.1f}% of Upper Cap Rs. {upper_cap:.2f}."
    elif price <= (lower_cap + 0.02) and price > 0:
        return "LOCKED_LOWER", upper_cap, lower_cap, dist_to_upper_pct, f"Circuit Lock: Locked at Lower Cap Rs. {lower_cap:.2f}."
    else:
        return "NORMAL", upper_cap, lower_cap, dist_to_upper_pct, "Trading inside standard price band."

def check_late_entry_risk(
    price: float,
    resistance: float,
    ldcp: float,
    change_pct: float,
    late_buffer_pct: float = 1.2
) -> Tuple[bool, str]:
    """
    Requirement 13: Late-entry protection.
    Flags entries that are chasing extended prices near resistance or upper circuit lock (+7.5%).
    """
    # 1. Near upper circuit lock (+7.5% PSX rule)
    if change_pct >= (7.5 - late_buffer_pct):
        return True, f"Late Entry Warning: Stock has gained +{change_pct:.2f}%, within {late_buffer_pct}% of upper circuit lock."

    # 2. Directly underneath heavy resistance with low upside
    dist_to_resistance_pct = ((resistance - price) / price) * 100.0 if resistance > price else 0.0
    if 0.0 <= dist_to_resistance_pct < 0.6:
        return True, f"Late Entry Warning: Price is directly under resistance Rs. {resistance:.2f} ({dist_to_resistance_pct:.1f}% buffer left)."

    return False, "Entry Timing Optimal"

def calculate_composite_opportunity_score(
    momentum_score: int,
    rvol: float,
    setup_type: SetupType,
    is_late_entry: bool,
    risk_reward: float,
    is_stale: bool,
) -> int:
    """
    Composite opportunity score (0-100) combining setup quality, momentum,
    volume surge, risk-reward, and late-entry penalties.
    """
    if is_stale:
        return 0

    base = momentum_score * 0.40

    # RVOL bonus
    rvol_pts = min(rvol * 12.0, 25.0)

    # Setup bonus
    setup_bonus = {
        SetupType.BREAKOUT: 20.0,
        SetupType.VWAP_RECLAIM: 18.0,
        SetupType.MOMENTUM_SURGE: 16.0,
        SetupType.PULLBACK: 15.0,
        SetupType.VOLUME_SURGE: 14.0,
        SetupType.CONSOLIDATION: 5.0,
        SetupType.NEUTRAL: 0.0,
    }.get(setup_type, 5.0)

    # Risk-Reward contribution
    rr_pts = min(risk_reward * 3.5, 10.0)

    total = base + rvol_pts + setup_bonus + rr_pts

    # Late entry penalty
    if is_late_entry:
        total -= 25.0

    return int(round(max(min(total, 100.0), 0.0)))
