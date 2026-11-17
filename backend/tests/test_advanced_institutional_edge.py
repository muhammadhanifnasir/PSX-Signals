import datetime
from backend.app.analytics.smart_money_flow import (
    compute_smart_money_flows,
    SmartMoneyFlowReport,
)
from backend.app.analytics.profit_locker import (
    ProfitLockerPlanRequest,
    compute_profit_locker_plan,
)
from backend.app.analytics.session_playbook import (
    get_psx_session_phase,
    SessionPhaseReport,
)
from backend.app.analytics.volume_profile import (
    calculate_volume_profile,
    VolumeProfileReport,
)
from backend.app.analytics.corporate_actions import (
    get_psx_corporate_calendar,
    CorporateActionsCalendarReport,
)

def test_smart_money_flow_and_retail_trap():
    """Verify FIPI/LIPI calculation and retail trap distribution alert."""
    report = compute_smart_money_flows()
    assert report.market_fipi_net_usd_millions != 0
    assert len(report.sector_flows) > 0

    # Oil & Gas Exploration should be in accumulation (Mutual Funds + Foreigners)
    og_sec = [s for s in report.sector_flows if "OIL & GAS" in s.sector.upper()][0]
    assert og_sec.smart_money_net_pkr_millions > 0
    assert "OGDC" in og_sec.top_institutional_targets

    # Check retail trap sectors
    assert len(report.retail_trap_sectors) >= 1
    # Cement or Textile should be flagged where retail is buying and smart money is selling
    trap_sec = [s for s in report.sector_flows if s.retail_trap_detected][0]
    assert trap_sec.smart_money_net_pkr_millions < 0
    assert trap_sec.retail_individuals_net_pkr_millions > 0

def test_profit_locker_and_scale_out():
    """Verify dynamic breakeven ratcheting, 50/50 scale-out, and ATR trailing stop."""
    # Case 1: Entry at PKR 100, price moves to Target 1 (PKR 105)
    req = ProfitLockerPlanRequest(
        symbol="AIRLINK",
        entry_price=100.0,
        current_price=105.0,
        highest_price_reached=105.5,
        quantity=2000,
        stop_loss=96.0,
        target_1=105.0,
        target_2=112.0,
        atr_14=2.0,
        is_filer=True
    )
    plan = compute_profit_locker_plan(req)

    # Breakeven stop should be around 100.35 - 100.50 (covering round-trip friction)
    assert plan.breakeven_price > 100.0
    assert plan.is_breakeven_locked is True
    assert plan.trade_risk_status == "PROFIT_LOCKED"
    assert plan.active_trailing_stop >= plan.breakeven_price
    assert len(plan.scale_out_legs) == 2
    assert plan.scale_out_legs[0].quantity == 1000
    assert plan.scale_out_legs[1].quantity == 1000
    assert plan.scale_out_legs[0].execution_status == "EXECUTED"
    assert plan.scale_out_legs[1].execution_status == "ACTIVE_RUNNER"
    assert plan.blended_target_profit_pkr > 0

    # Case 2: In pre-target phase (price moved only +1%), risk is active
    req_early = ProfitLockerPlanRequest(
        symbol="AIRLINK",
        entry_price=100.0,
        current_price=101.0,
        quantity=2000,
        stop_loss=96.0,
        target_1=105.0,
        target_2=112.0
    )
    plan_early = compute_profit_locker_plan(req_early)
    assert plan_early.trade_risk_status == "RISK_ACTIVE"
    assert plan_early.active_trailing_stop == 96.0
    assert plan_early.scale_out_legs[0].execution_status == "PENDING"

def test_session_phase_playbook():
    """Verify PSX session phase clock and rule adjustments."""
    # 10:15 AM -> Prime Institutional Morning Run
    t_prime = datetime.time(10, 15)
    rep_prime = get_psx_session_phase(override_time=t_prime)
    assert rep_prime.session_phase == "PRIME_INSTITUTIONAL_RUN"
    assert rep_prime.is_prime_window is True
    assert rep_prime.score_adjustment > 0

    # 12:30 PM (Regular session) -> Midday Lunch Chop
    t_midday = datetime.time(12, 30)
    rep_midday = get_psx_session_phase(override_time=t_midday)
    # On regular days, 12:30 is MIDDAY_LUNCH_CHOP; on Friday it's JUMMAH_PRAYER_BREAK
    assert rep_midday.session_phase in ["MIDDAY_LUNCH_CHOP", "JUMMAH_PRAYER_BREAK"]
    assert rep_midday.is_prime_window is False

def test_volume_profile_and_value_area():
    """Verify horizontal volume profile, POC, and 70% Value Area (VAH/VAL)."""
    bars = [
        {"high": 102.0, "low": 98.0, "close": 100.0, "volume": 500_000},
        {"high": 101.0, "low": 99.0, "close": 100.5, "volume": 1_200_000}, # Heavy volume around 100
        {"high": 104.0, "low": 100.0, "close": 103.0, "volume": 300_000},
        {"high": 99.0, "low": 96.0, "close": 98.0, "volume": 200_000},
    ]
    vp = calculate_volume_profile(symbol="SYS", bars=bars, current_price=101.0, num_bins=12)
    assert vp.symbol == "SYS"
    assert vp.value_area_low_val <= vp.point_of_control_poc <= vp.value_area_high_vah
    assert vp.value_area_low_val < vp.value_area_high_vah
    assert vp.total_volume_profiled == 2_200_000
    assert len(vp.bins) == 12

    # Exactly 1 bin must be marked as POC
    poc_bins = [b for b in vp.bins if b.is_poc]
    assert len(poc_bins) == 1

def test_corporate_actions_calendar():
    """Verify PSX corporate announcements, dividend payouts, and earnings catalyst risk."""
    cal = get_psx_corporate_calendar()
    assert cal.total_upcoming_events > 0
    assert "HUBC" in cal.symbol_risk_map
    assert cal.symbol_risk_map["HUBC"] in ["HIGH_EVENT_RISK_48H", "UPCOMING_CATALYST_EVENT"]

    # Filtered by symbol
    hubc_cal = get_psx_corporate_calendar(filter_symbol="HUBC")
    assert len(hubc_cal.events) == 1
    assert hubc_cal.events[0].symbol == "HUBC"

if __name__ == "__main__":
    test_smart_money_flow_and_retail_trap()
    print("PASS: test_smart_money_flow_and_retail_trap")
    test_profit_locker_and_scale_out()
    print("PASS: test_profit_locker_and_scale_out")
    test_session_phase_playbook()
    print("PASS: test_session_phase_playbook")
    test_volume_profile_and_value_area()
    print("PASS: test_volume_profile_and_value_area")
    test_corporate_actions_calendar()
    print("PASS: test_corporate_actions_calendar")
    print("ALL 5 ADVANCED INSTITUTIONAL TESTS PASSED SUCCESSFULLY!")
