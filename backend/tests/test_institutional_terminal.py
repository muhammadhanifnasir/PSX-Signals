import datetime
from backend.app.market_engine.models import NormalizedQuote, MarketOverview, ProviderType, DataDelayType, MarketStatusEnum
from backend.app.analytics.sector_matrix import (
    compute_sector_rotation,
    compute_macro_regime,
    SectorRotationQuadrant,
    MacroMarketRegime,
)
from backend.app.analytics.slippage_simulator import (
    OrderBracketSimulationRequest,
    simulate_psx_bracket_order,
)
from backend.app.analytics.fix_order_formatter import (
    FastOrderTicketRequest,
    generate_psx_order_ticket,
    compute_fix_checksum,
)

def test_sector_rotation_rrg_quadrants():
    """Verify sector rotation correctly maps into LEADING, WEAKENING, LAGGING, IMPROVING."""
    now_str = datetime.datetime.now().isoformat()

    # Benchmark is +1.0%
    quotes = [
        # Sector 1: Technology (outperforming benchmark +3.0% -> LEADING)
        NormalizedQuote(
            symbol="SYS", price=420.0, change=12.0, change_percent=3.0,
            open_price=410.0, high_price=422.0, low_price=408.0, ldcp=408.0,
            volume=5_000_000, sector="TECHNOLOGY & COMMUNICATION", timestamp=now_str
        ),
        # Sector 2: Fertilizer (underperforming benchmark -1.5% -> LAGGING)
        NormalizedQuote(
            symbol="FFC", price=180.0, change=-2.7, change_percent=-1.5,
            open_price=183.0, high_price=183.0, low_price=179.0, ldcp=182.7,
            volume=3_000_000, sector="FERTILIZER", timestamp=now_str
        ),
        # Sector 3: Cement (RS < 0 vs +1.0% index, but positive absolute change +0.2% -> IMPROVING)
        NormalizedQuote(
            symbol="LUCK", price=850.0, change=1.7, change_percent=0.2,
            open_price=848.0, high_price=855.0, low_price=847.0, ldcp=848.3,
            volume=2_000_000, sector="CEMENT", timestamp=now_str
        ),
    ]

    sectors = compute_sector_rotation(quotes, index_change_pct=1.0)
    assert len(sectors) == 3

    sec_dict = {s.sector: s for s in sectors}

    # SYS outperforming (+3.0% vs +1.0%) -> LEADING
    assert sec_dict["TECHNOLOGY & COMMUNICATION"].quadrant == SectorRotationQuadrant.LEADING
    assert sec_dict["TECHNOLOGY & COMMUNICATION"].relative_strength_vs_kse100 == 2.0

    # FFC underperforming (-1.5% vs +1.0%) -> LAGGING
    assert sec_dict["FERTILIZER"].quadrant == SectorRotationQuadrant.LAGGING
    assert sec_dict["FERTILIZER"].relative_strength_vs_kse100 == -2.5

    # LUCK +0.2% vs +1.0% (RS -0.8% <= 0, but change >= 0) -> IMPROVING
    assert sec_dict["CEMENT"].quadrant == SectorRotationQuadrant.IMPROVING

def test_macro_regime_classification():
    """Verify KSE-100 market regime and institutional risk mode."""
    now_str = datetime.datetime.now().isoformat()
    dummy_quotes = [
        NormalizedQuote(
            symbol="SYS", price=420.0, change=5.0, change_percent=1.2,
            open_price=415.0, high_price=422.0, low_price=414.0, ldcp=415.0,
            volume=1_000_000, sector="TECHNOLOGY", timestamp=now_str
        )
    ]

    # 1. Bull Momentum
    bull_overview = MarketOverview(
        market_status=MarketStatusEnum.OPEN, index_name="KSE-100",
        index_value=179500.0, index_change=1200.0, index_change_percent=1.1,
        total_volume=450000000, total_volume_formatted="450M",
        advances=240, declines=90, unchanged=40, total_traded_companies=370,
        timestamp=now_str, data_delay_type=DataDelayType.REAL_TIME, provider=ProviderType.PSX_PORTAL,
        provider_name="PSX Official Data Portal", disclaimer="Official Feed"
    )
    regime = compute_macro_regime(bull_overview, dummy_quotes)
    assert regime.regime == MacroMarketRegime.BULL_MOMENTUM
    assert regime.market_risk_mode == "AGGRESSIVE_LONGS"
    assert regime.score_threshold_adjustment == 0

    # 2. Correction Risk
    correction_overview = MarketOverview(
        market_status=MarketStatusEnum.OPEN, index_name="KSE-100",
        index_value=176000.0, index_change=-1400.0, index_change_percent=-0.8,
        total_volume=300000000, total_volume_formatted="300M",
        advances=80, declines=260, unchanged=30, total_traded_companies=370,
        timestamp=now_str, data_delay_type=DataDelayType.REAL_TIME, provider=ProviderType.PSX_PORTAL,
        provider_name="PSX Official Data Portal", disclaimer="Official Feed"
    )
    regime_corr = compute_macro_regime(correction_overview, dummy_quotes)
    assert regime_corr.regime == MacroMarketRegime.CORRECTION_RISK
    assert regime_corr.market_risk_mode == "DEFENSIVE_TIGHT_STOPS"
    assert regime_corr.score_threshold_adjustment == 5

def test_psx_bracket_slippage_and_statutory_taxes():
    """Verify volume-weighted slippage and official PSX statutory charges."""
    # Active Filer: Buy 5,000 shares of HUBC @ PKR 120.00
    req = OrderBracketSimulationRequest(
        symbol="HUBC",
        price=120.0,
        quantity=5000,
        stop_loss=115.0,
        target_1=128.0,
        is_filer=True,
        average_daily_volume=2_000_000
    )
    res = simulate_psx_bracket_order(req)

    nominal = 120.0 * 5000 # PKR 600,000
    assert res.nominal_trade_value == nominal

    # 5,000 / 2,000,000 = 0.25% of ADV -> slippage_pct = 0.05%
    assert res.estimated_slippage_pct == 0.05
    assert res.estimated_slippage_pkr == round(nominal * 0.0005, 2)
    assert res.effective_entry_price == round(120.0 * 1.0005, 2)

    # Statutory charges:
    # Brokerage: 0.15% = 900
    assert res.brokerage_commission_pkr == 900.0
    # SECP levy: 0.002% = 12.0
    assert res.secp_turnover_levy_pkr == 12.0
    # CVT: 0.01% = 60.0
    assert res.cvt_pkr == 60.0
    # NCCPL: 5000 * 0.001 = 5.0
    assert res.nccpl_charge_pkr == 5.0
    # WHT Filer: 0.02% = 120.0
    assert res.wht_pkr == 120.0

    one_way_total = 900.0 + 12.0 + 60.0 + 5.0 + 120.0 # 1097.0
    assert res.total_statutory_charges_pkr == one_way_total

    # Breakeven price must be greater than entry price
    assert res.breakeven_price > res.effective_entry_price
    assert res.target1_net_profit_pkr > 0
    assert res.risk_reward_ratio > 0

def test_fast_order_ticket_and_fix_protocol():
    """Verify SCSTrade fast string, FIX 4.2 protocol formatting, and safety checks."""
    req = FastOrderTicketRequest(
        symbol="OGDC",
        action="BUY",
        price=165.25,
        quantity=3000,
        order_type="LIMIT",
        stop_loss=158.0,
        target_1=178.0,
        client_code="SCST-DEMO",
        is_upper_locked=False,
        is_defaulter=False
    )
    ticket = generate_psx_order_ticket(req)

    # SCS Trade quick string
    assert "OGDC,BUY,3000,165.25,LIMIT,DAY,SCST-DEMO" == ticket.scstrade_quick_string

    # FIX 4.2 formatting
    assert ticket.fix_42_message.startswith("8=FIX.4.2|")
    assert "35=D|" in ticket.fix_42_message
    assert "55=OGDC|" in ticket.fix_42_message
    assert "54=1|" in ticket.fix_42_message
    assert "38=3000|" in ticket.fix_42_message
    assert "44=165.25|" in ticket.fix_42_message
    assert "10=" in ticket.fix_42_message

    # Safety checks
    assert ticket.all_safety_checks_passed is True

    # If stock is upper locked, BUY ticket safety check must fail
    locked_req = FastOrderTicketRequest(
        symbol="PRL",
        action="BUY",
        price=32.50,
        quantity=10000,
        is_upper_locked=True
    )
    locked_ticket = generate_psx_order_ticket(locked_req)
    assert locked_ticket.all_safety_checks_passed is False
    lock_chk = [c for c in locked_ticket.safety_checks if "Upper Circuit" in c.rule][0]
    assert lock_chk.passed is False

if __name__ == "__main__":
    test_sector_rotation_rrg_quadrants()
    print("PASS: test_sector_rotation_rrg_quadrants")
    test_macro_regime_classification()
    print("PASS: test_macro_regime_classification")
    test_psx_bracket_slippage_and_statutory_taxes()
    print("PASS: test_psx_bracket_slippage_and_statutory_taxes")
    test_fast_order_ticket_and_fix_protocol()
    print("PASS: test_fast_order_ticket_and_fix_protocol")
    print("SUCCESS: All 4 Institutional Terminal test suites passed successfully!")

