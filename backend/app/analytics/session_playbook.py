import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class SessionPhaseReport(BaseModel):
    session_phase: str
    phase_title: str
    is_market_open: bool
    is_prime_window: bool
    is_friday: bool
    current_time_pkt: str
    window_start: str
    window_end: str
    minutes_remaining_in_phase: int
    score_adjustment: int  # e.g. +3 during prime window, -5 during midday chop
    execution_bias: str    # AGGRESSIVE_EXECUTION, DEFENSIVE_PATIENCE, DO_NOT_TRADE, PROFIT_TAKING
    institutional_playbook: str
    actionable_rule: str

def get_psx_session_phase(override_time: Optional[datetime.time] = None) -> SessionPhaseReport:
    """
    Evaluates current Pakistan Standard Time (PKT) and maps into the institutional
    PSX Intraday Timing Windows playbook.
    """
    now = datetime.datetime.now()
    is_friday = (now.weekday() == 4) # 4 is Friday

    t = override_time if override_time else now.time()
    current_time_str = now.strftime("%H:%M:%S PKT")

    # Time helper
    def time_mins(hour: int, minute: int) -> int:
        return hour * 60 + minute

    curr_mins = t.hour * 60 + t.minute

    # Friday vs Regular Session
    if is_friday:
        # Friday Session 1: 09:15 - 12:00
        # Friday Break (Jummah): 12:00 - 14:30
        # Friday Session 2: 14:30 - 16:30
        if curr_mins < time_mins(9, 15):
            phase = "PRE_MARKET"
            title = "Pre-Market Preparation (Friday)"
            is_open = False
            is_prime = False
            w_start, w_end = "09:00", "09:15"
            mins_rem = max(0, time_mins(9, 15) - curr_mins)
            adj = 0
            bias = "DO_NOT_TRADE"
            playbook = "Review overnight catalysts, KSE-100 technical levels, and morning watchlists."
            rule = "Market closed. No orders can execute."
        elif curr_mins <= time_mins(9, 45):
            phase = "OPENING_AUCTION_TRAP"
            title = "Opening 30m Volatility (Friday)"
            is_open = True
            is_prime = False
            w_start, w_end = "09:15", "09:45"
            mins_rem = time_mins(9, 45) - curr_mins
            adj = -3
            bias = "DEFENSIVE_PATIENCE"
            playbook = "Initial 30-minute opening range forming. Do not chase overnight gap opens."
            rule = "Wait for initial 30m candle close before triggering market orders."
        elif curr_mins <= time_mins(11, 45):
            phase = "PRIME_INSTITUTIONAL_RUN"
            title = "Prime Institutional Morning Run (Friday)"
            is_open = True
            is_prime = True
            w_start, w_end = "09:45", "11:45"
            mins_rem = time_mins(11, 45) - curr_mins
            adj = 3
            bias = "AGGRESSIVE_EXECUTION"
            playbook = "Peak Friday morning volume. Highest win rate for breakout and VWAP reclaim setups."
            rule = "Full position size allowed on high RVOL leaders."
        elif curr_mins < time_mins(14, 30):
            phase = "JUMMAH_PRAYER_BREAK"
            title = "Jummah Intermission (Exchange Suspended)"
            is_open = False
            is_prime = False
            w_start, w_end = "12:00", "14:30"
            mins_rem = max(0, time_mins(14, 30) - curr_mins)
            adj = 0
            bias = "DO_NOT_TRADE"
            playbook = "PSX trading halted for Friday prayers. Review morning executions and prepare for 2:30 PM session."
            rule = "Trading engine paused until 14:30 PKT."
        elif curr_mins <= time_mins(16, 0):
            phase = "AFTERNOON_EXPANSION"
            title = "Friday Afternoon Continuation"
            is_open = True
            is_prime = True
            w_start, w_end = "14:30", "16:00"
            mins_rem = time_mins(16, 0) - curr_mins
            adj = 2
            bias = "AGGRESSIVE_EXECUTION"
            playbook = "Afternoon liquidity return. Institutions repositioning for weekend close."
            rule = "Prioritize confirmed trending stocks holding above VWAP."
        elif curr_mins <= time_mins(16, 30):
            phase = "CLOSING_MARKUP"
            title = "Friday Weekend Settlement"
            is_open = True
            is_prime = False
            w_start, w_end = "16:00", "16:30"
            mins_rem = time_mins(16, 30) - curr_mins
            adj = -3
            bias = "PROFIT_TAKING"
            playbook = "Weekend risk-off squaring. Day traders exiting positions."
            rule = "Lock partial profits. Do not open new leveraged swing exposure."
        else:
            phase = "POST_MARKET"
            title = "Post-Market EOD Close"
            is_open = False
            is_prime = False
            w_start, w_end = "16:30", "00:00"
            mins_rem = 0
            adj = 0
            bias = "DO_NOT_TRADE"
            playbook = "Session closed. Run EOD screening and audit trade journal."
            rule = "Market closed."
    else:
        # Regular Session (Monday - Thursday: 09:15 - 15:30)
        if curr_mins < time_mins(9, 15):
            phase = "PRE_MARKET"
            title = "Pre-Market Preparation"
            is_open = False
            is_prime = False
            w_start, w_end = "09:00", "09:15"
            mins_rem = max(0, time_mins(9, 15) - curr_mins)
            adj = 0
            bias = "DO_NOT_TRADE"
            playbook = "Review regional markets, commodities (Crude, Coal), and pre-market sector sentiment."
            rule = "No order execution. Stand by for 09:15 opening bell."
        elif curr_mins <= time_mins(9, 45):
            phase = "OPENING_AUCTION_TRAP"
            title = "Opening 30m Volatility Trap"
            is_open = True
            is_prime = False
            w_start, w_end = "09:15", "09:45"
            mins_rem = time_mins(9, 45) - curr_mins
            adj = -4
            bias = "DEFENSIVE_PATIENCE"
            playbook = "High false-breakout rate. Retail chasing opening gap-ups into institutional limit asks."
            rule = "Stand aside. Let Initial Balance (IB) high/low establish before buying."
        elif curr_mins <= time_mins(11, 30):
            phase = "PRIME_INSTITUTIONAL_RUN"
            title = "Prime Institutional Morning Trend"
            is_open = True
            is_prime = True
            w_start, w_end = "09:45", "11:30"
            mins_rem = time_mins(11, 30) - curr_mins
            adj = 3
            bias = "AGGRESSIVE_EXECUTION"
            playbook = "Optimal execution window. Broad market participation with confirmed volume expansion."
            rule = "Execute full size on BUY CANDIDATE signals above VWAP with RVOL > 1.5x."
        elif curr_mins <= time_mins(13, 30):
            phase = "MIDDAY_LUNCH_CHOP"
            title = "Midday Liquidity Contraction"
            is_open = True
            is_prime = False
            w_start, w_end = "11:30", "13:30"
            mins_rem = time_mins(13, 30) - curr_mins
            adj = -5
            bias = "DEFENSIVE_PATIENCE"
            playbook = "Volume drops ~60%. Range-bound whipsaws and low-conviction chop dominate."
            rule = "Defer new breakout entries. Hold existing open trades with breakeven stops."
        elif curr_mins <= time_mins(15, 0):
            phase = "AFTERNOON_EXPANSION"
            title = "Afternoon Trend Continuation"
            is_open = True
            is_prime = True
            w_start, w_end = "13:30", "15:00"
            mins_rem = time_mins(15, 0) - curr_mins
            adj = 2
            bias = "AGGRESSIVE_EXECUTION"
            playbook = "Afternoon liquidity re-injection. Follow-through on morning sector leaders."
            rule = "Look for 15m pullback retests into EMA-21 or VWAP."
        elif curr_mins <= time_mins(15, 30):
            phase = "CLOSING_MARKUP"
            title = "Closing MTM Markups & Squaring"
            is_open = True
            is_prime = False
            w_start, w_end = "15:00", "15:30"
            mins_rem = time_mins(15, 30) - curr_mins
            adj = -3
            bias = "PROFIT_TAKING"
            playbook = "Intraday squaring, circuit-lock pinning, and institutional Mark-to-Market fixes."
            rule = "Book profits at Target 1/2. Avoid fresh swing entries in final 30 minutes."
        else:
            phase = "POST_MARKET"
            title = "Post-Market EOD Close"
            is_open = False
            is_prime = False
            w_start, w_end = "15:30", "00:00"
            mins_rem = 0
            adj = 0
            bias = "DO_NOT_TRADE"
            playbook = "Market closed. Analyze daily sector rotation and prepare next-day watchlists."
            rule = "Market closed."

    return SessionPhaseReport(
        session_phase=phase,
        phase_title=title,
        is_market_open=is_open,
        is_prime_window=is_prime,
        is_friday=is_friday,
        current_time_pkt=current_time_str,
        window_start=w_start,
        window_end=w_end,
        minutes_remaining_in_phase=mins_rem,
        score_adjustment=adj,
        execution_bias=bias,
        institutional_playbook=playbook,
        actionable_rule=rule
    )
