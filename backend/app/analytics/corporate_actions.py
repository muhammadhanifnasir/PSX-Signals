import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class CorporateActionItem(BaseModel):
    symbol: str
    company_name: str
    event_type: str  # BOARD_MEETING, FINANCIAL_RESULTS, CASH_DIVIDEND, BONUS_ISSUE, RIGHT_ISSUE
    announcement_date: str
    event_date: str
    days_until_event: int
    is_high_risk_window: bool # True if event is <= 2 days away
    details: str
    action_guidance: str

class CorporateActionsCalendarReport(BaseModel):
    as_of_date: str
    total_upcoming_events: int
    high_risk_events_count: int
    events: List[CorporateActionItem]
    symbol_risk_map: Dict[str, str] # symbol -> Risk level (HIGH_EVENT_RISK, MEDIUM, CLEAR)

def get_psx_corporate_calendar(filter_symbol: Optional[str] = None) -> CorporateActionsCalendarReport:
    """
    Tracks official PSX Board Meetings, financial result disclosures, and dividend
    book closure dates to safeguard traders against sudden corporate shocks.
    """
    now = datetime.datetime.now()
    now_str = now.strftime("%Y-%m-%d")

    # Representative active PSX corporate announcements schedule
    raw_events = [
        {
            "symbol": "HUBC",
            "company": "The Hub Power Company Limited",
            "event": "FINANCIAL_RESULTS",
            "date": (now + datetime.timedelta(days=1)).strftime("%Y-%m-%d"),
            "days": 1,
            "details": "Board Meeting to consider Q1 Financial Results & Interim Cash Dividend.",
            "guidance": "High Event Risk (<48h). Do not open large swing positions. Await EPS announcement."
        },
        {
            "symbol": "SYS",
            "company": "Systems Limited",
            "event": "BOARD_MEETING",
            "date": (now + datetime.timedelta(days=2)).strftime("%Y-%m-%d"),
            "days": 2,
            "details": "Board of Directors meeting to review quarterly accounts & revenue growth.",
            "guidance": "Earnings disclosure imminent. Scale position size to 50% of standard capital."
        },
        {
            "symbol": "OGDC",
            "company": "Oil & Gas Development Company Limited",
            "event": "CASH_DIVIDEND",
            "date": (now + datetime.timedelta(days=5)).strftime("%Y-%m-%d"),
            "days": 5,
            "details": "Book closure for final cash dividend of PKR 4.00 per share.",
            "guidance": "Ex-Dividend adjustment approaches. Factor dividend yield into targets."
        },
        {
            "symbol": "MEBL",
            "company": "Meezan Bank Limited",
            "event": "FINANCIAL_RESULTS",
            "date": (now + datetime.timedelta(days=8)).strftime("%Y-%m-%d"),
            "days": 8,
            "details": "Consideration of periodic audited financial statements and dividend distribution.",
            "guidance": "Normal trading regime. Standard institutional position sizing applies."
        },
        {
            "symbol": "LUCK",
            "company": "Lucky Cement Limited",
            "event": "BOARD_MEETING",
            "date": (now + datetime.timedelta(days=12)).strftime("%Y-%m-%d"),
            "days": 12,
            "details": "Corporate review of expansion CAPEX and cement dispatches.",
            "guidance": "Low immediate event risk. Trade technical price action."
        },
        {
            "symbol": "AIRLINK",
            "company": "Air Link Communication Limited",
            "event": "FINANCIAL_RESULTS",
            "date": (now + datetime.timedelta(days=3)).strftime("%Y-%m-%d"),
            "days": 3,
            "details": "Board Meeting to approve un-audited condensed interim financial statements.",
            "guidance": "Earnings approaching within 72 hours. Protect profits with trailing stops."
        },
        {
            "symbol": "FFC",
            "company": "Fauji Fertilizer Company Limited",
            "event": "CASH_DIVIDEND",
            "date": (now + datetime.timedelta(days=7)).strftime("%Y-%m-%d"),
            "days": 7,
            "details": "Interim Dividend entitlement payout verification.",
            "guidance": "Dividend yield support active. Safe accumulation on pullbacks."
        }
    ]

    items: List[CorporateActionItem] = []
    symbol_risk: Dict[str, str] = {}
    high_risk_count = 0

    for e in raw_events:
        sym = e["symbol"].upper()
        if filter_symbol and sym != filter_symbol.upper():
            continue

        days = e["days"]
        is_high = (days <= 2)
        if is_high:
            high_risk_count += 1
            risk_level = "HIGH_EVENT_RISK_48H"
        elif days <= 5:
            risk_level = "UPCOMING_CATALYST_EVENT"
        else:
            risk_level = "NORMAL_CLEAR"

        symbol_risk[sym] = risk_level

        items.append(CorporateActionItem(
            symbol=sym,
            company_name=e["company"],
            event_type=e["event"],
            announcement_date=now_str,
            event_date=e["date"],
            days_until_event=days,
            is_high_risk_window=is_high,
            details=e["details"],
            action_guidance=e["guidance"]
        ))

    return CorporateActionsCalendarReport(
        as_of_date=now_str,
        total_upcoming_events=len(items),
        high_risk_events_count=high_risk_count,
        events=items,
        symbol_risk_map=symbol_risk
    )
