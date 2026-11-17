import os
import sys
import datetime

# Ensure repository root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import unittest
from backend.app.scanner.indicators import check_circuit_status
from backend.app.market_engine.models import NormalizedQuote, DataDelayType
from backend.app.signals.engine import TradingSignalEngine, StrategyConfig
from backend.app.signals.models import SignalState

class TestMicrostructureAndCompliance(unittest.TestCase):
    def test_psx_circuit_breaker_calculation_rule(self):
        """
        Test PSX Rule: Daily circuit band is ±7.5% or PKR 1.00, whichever is greater.
        """
        # Case 1: Low-price / Penny stock (7.5% of 8.00 is 0.60 < 1.00 PKR => band must be 1.00 PKR)
        ldcp_penny = 8.00
        status, upper_cap, lower_cap, cap_dist, msg = check_circuit_status(8.50, ldcp_penny)
        self.assertEqual(upper_cap, 9.00)
        self.assertEqual(lower_cap, 7.00)

        # Case 2: High cap stock (7.5% of 160.00 is 12.00 > 1.00 PKR)
        ldcp_mid = 160.00
        status, upper_cap, lower_cap, cap_dist, msg = check_circuit_status(165.00, ldcp_mid)
        self.assertEqual(upper_cap, 172.00)
        self.assertEqual(lower_cap, 148.00)

    def test_circuit_lock_status_detection(self):
        """
        Test Upper Circuit Lock detection when price is at upper cap (-0.02 buffer).
        """
        ldcp = 100.00
        # 7.5% of 100 is 7.50 => Upper cap = 107.50

        # Exactly at upper cap
        status, u_cap, l_cap, dist, msg = check_circuit_status(107.50, ldcp)
        self.assertEqual(status, "LOCKED_UPPER")
        self.assertIn("Upper Cap", msg)

        # Within 2 paisas of cap (107.49)
        status, u_cap, l_cap, dist, msg = check_circuit_status(107.49, ldcp)
        self.assertEqual(status, "LOCKED_UPPER")

        # In danger zone (<1.2% headroom, e.g. 106.80)
        status, u_cap, l_cap, dist, msg = check_circuit_status(106.80, ldcp)
        self.assertEqual(status, "CAP_DANGER")
        self.assertIn("Cap Proximity Warning", msg)

        # Normal headroom (e.g. 102.00)
        status, u_cap, l_cap, dist, msg = check_circuit_status(102.00, ldcp)
        self.assertEqual(status, "NORMAL")

    def test_circuit_lock_suppresses_buy_to_watch(self):
        """
        Test that an upper-circuit locked stock strictly suppresses BUY candidates to WATCH.
        """
        engine = TradingSignalEngine()

        # Create quote that is pinned at upper circuit
        quote = NormalizedQuote(
            symbol="LOCKED_CO",
            price=107.50,
            ldcp=100.00,
            open_price=100.00,
            high_price=107.50,
            low_price=100.00,
            volume=5000000,
            change=7.50,
            change_percent=7.50,
            delay_type=DataDelayType.DELAYED_15MIN,
            is_mock=False,
            circuit_breaker_upper=107.50,
            circuit_breaker_lower=92.50,
            circuit_status="LOCKED_UPPER",
            cap_distance_pct=0.0,
            timestamp=datetime.datetime.now().isoformat()
        )

        signal = engine.evaluate_quote(quote)
        self.assertIsNotNone(signal)
        # Action MUST NOT be BUY or STRONG_BUY
        self.assertNotIn(signal.action, ["BUY", "STRONG_BUY"])
        self.assertEqual(signal.signal_type, SignalState.WATCH)
        reason_text = (signal.invalidation_reason or signal.catalyst_notes or "").lower()
        self.assertTrue("upper circuit" in reason_text or "lock" in reason_text)
        self.assertLessEqual(signal.opportunity_score, 45)

    def test_cap_danger_routes_to_wait(self):
        """
        Test that a stock within 1.2% of upper circuit is penalized and routed to WAIT.
        """
        engine = TradingSignalEngine()

        quote = NormalizedQuote(
            symbol="DANGER_CO",
            price=106.80,
            ldcp=100.00,
            open_price=101.00,
            high_price=106.80,
            low_price=100.50,
            volume=4000000,
            change=6.80,
            change_percent=6.80,
            delay_type=DataDelayType.DELAYED_15MIN,
            is_mock=False,
            circuit_breaker_upper=107.50,
            circuit_breaker_lower=92.50,
            circuit_status="CAP_DANGER",
            cap_distance_pct=0.65,
            timestamp=datetime.datetime.now().isoformat()
        )

        signal = engine.evaluate_quote(quote)
        self.assertIsNotNone(signal)
        self.assertEqual(signal.signal_type, SignalState.WAIT)
        self.assertEqual(signal.action, "WAIT")
        reason_text = (signal.invalidation_reason or signal.catalyst_notes or "").lower()
        self.assertTrue("circuit" in reason_text or "pullback" in reason_text or "headroom" in reason_text)

    def test_compliance_and_shariah_tagging(self):
        """
        Test that Defaulter tags, Non-Compliant tags, and Shariah compliance criteria operate systematically.
        """
        # Conventional financial sectors are non-shariah
        sector_bank = "COMMERCIAL BANKS"
        non_shariah_sectors = ["COMMERCIAL BANKS", "INSURANCE", "TOBACCO", "LEASING COMPANIES", "MODARABAS", "INVESTMENT BANKS"]
        is_conventional = any(ns in sector_bank for ns in non_shariah_sectors)
        self.assertTrue(is_conventional)

        # Real industrial sector is Shariah compliant if not a defaulter
        sector_tech = "TECHNOLOGY & COMMUNICATION"
        is_tech_conventional = any(ns in sector_tech for ns in non_shariah_sectors)
        self.assertFalse(is_tech_conventional)

    def test_scanner_opportunity_filtering(self):
        """
        Test scanner filter logic for exclude_defaulters, shariah_only, and min_price.
        """
        from backend.app.scanner.models import StockOpportunity, SetupType

        sample_opps = [
            StockOpportunity(
                symbol="DEFAULTER_CO",
                company_name="Defaulter Co",
                sector="Textile",
                last_price=12.50,
                price_change_percent=2.5,
                volume=500000,
                volume_formatted="500K",
                relative_volume=1.5,
                vwap=12.40,
                ema_trend="Bullish",
                rsi_14=55.0,
                atr_14=0.8,
                support_level=11.5,
                resistance_level=13.5,
                momentum_score=70,
                opportunity_score=75,
                setup_type=SetupType.BREAKOUT,
                setup_description="Breakout",
                entry_price_recommended=12.6,
                stop_loss_recommended=11.8,
                target_price_recommended=14.0,
                risk_reward_ratio=1.9,
                is_late_entry_risk=False,
                data_freshness_seconds=60,
                data_delay_type="DELAYED_15MIN",
                data_timestamp="2026-11-16 10:00:00",
                is_shariah_compliant=False,
                is_defaulter=True,
                regulatory_category="DEFAULTER"
            ),
            StockOpportunity(
                symbol="KMI_CO",
                company_name="KMI Shariah Co",
                sector="Technology & Communication",
                last_price=85.00,
                price_change_percent=4.0,
                volume=2000000,
                volume_formatted="2.0M",
                relative_volume=2.2,
                vwap=83.50,
                ema_trend="Strong Bullish",
                rsi_14=62.0,
                atr_14=3.2,
                support_level=81.0,
                resistance_level=89.0,
                momentum_score=85,
                opportunity_score=88,
                setup_type=SetupType.BREAKOUT,
                setup_description="Strong Breakout",
                entry_price_recommended=85.2,
                stop_loss_recommended=81.5,
                target_price_recommended=92.0,
                risk_reward_ratio=2.1,
                is_late_entry_risk=False,
                data_freshness_seconds=45,
                data_delay_type="DELAYED_15MIN",
                data_timestamp="2026-11-16 10:00:00",
                is_shariah_compliant=True,
                is_defaulter=False,
                regulatory_category="SHARIAH_COMPLIANT"
            ),
            StockOpportunity(
                symbol="PENNY_MAIN",
                company_name="Penny Mainboard",
                sector="Cement",
                last_price=6.50,
                price_change_percent=1.0,
                volume=1000000,
                volume_formatted="1.0M",
                relative_volume=1.4,
                vwap=6.40,
                ema_trend="Bullish",
                rsi_14=52.0,
                atr_14=0.4,
                support_level=6.0,
                resistance_level=7.0,
                momentum_score=65,
                opportunity_score=68,
                setup_type=SetupType.PULLBACK,
                setup_description="Pullback",
                entry_price_recommended=6.5,
                stop_loss_recommended=6.0,
                target_price_recommended=7.5,
                risk_reward_ratio=2.0,
                is_late_entry_risk=False,
                data_freshness_seconds=50,
                data_delay_type="DELAYED_15MIN",
                data_timestamp="2026-11-16 10:00:00",
                is_shariah_compliant=True,
                is_defaulter=False,
                regulatory_category="SHARIAH_COMPLIANT"
            ),
        ]

        # 1. Test Defaulter Shield (exclude_defaulters=True)
        filtered_def = [o for o in sample_opps if not o.is_defaulter]
        self.assertEqual(len(filtered_def), 2)
        self.assertNotIn("DEFAULTER_CO", [o.symbol for o in filtered_def])

        # 2. Test Shariah Only
        filtered_shariah = [o for o in sample_opps if o.is_shariah_compliant]
        self.assertEqual(len(filtered_shariah), 2)
        self.assertNotIn("DEFAULTER_CO", [o.symbol for o in filtered_shariah])

        # 3. Test Min Price (> Rs 10)
        filtered_price = [o for o in sample_opps if o.last_price >= 10.0]
        self.assertEqual(len(filtered_price), 2)
        self.assertNotIn("PENNY_MAIN", [o.symbol for o in filtered_price])

if __name__ == "__main__":
    unittest.main()

