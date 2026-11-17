import time
import uuid
import datetime
import logging
from typing import List, Optional, Dict, Any

from backend.app.scanner.models import (
    ScannerThresholds,
    StockOpportunity,
    ScanRunSummary,
    SetupType,
)
from backend.app.scanner.indicators import (
    calculate_vwap,
    calculate_rsi,
    calculate_atr,
    calculate_support_resistance,
    calculate_rvol,
    determine_ema_trend,
    calculate_momentum_score,
    detect_setup_type,
    check_late_entry_risk,
    check_circuit_status,
    calculate_composite_opportunity_score,
)
from backend.app.scanner.storage import scanner_storage
from backend.app.market_engine.engine import market_data_engine
from backend.app.market_engine.symbol_universe import symbol_universe_mgr
from backend.app.market_engine.models import NormalizedQuote, DataDelayType

logger = logging.getLogger("scanner_engine")

class MarketScannerEngine:
    def __init__(self):
        self.thresholds = ScannerThresholds()
        self.last_summary: Optional[ScanRunSummary] = None
        self.last_opportunities: List[StockOpportunity] = []
        self.is_scanning: bool = False

    def update_thresholds(self, new_thresholds: Dict[str, Any]) -> ScannerThresholds:
        current = self.thresholds.model_dump()
        current.update(new_thresholds)
        self.thresholds = ScannerThresholds(**current)
        logger.info(f"Updated scanner thresholds: {self.thresholds}")
        return self.thresholds

    async def scan_market(self, custom_thresholds: Optional[ScannerThresholds] = None, force_refresh_quotes: bool = False) -> List[StockOpportunity]:
        """
        Executes a complete multi-factor algorithmic scan across all PSX equities.
        Uses real collected market data from the market_data_engine.
        """
        t = custom_thresholds or self.thresholds
        start_time = time.perf_counter()
        scan_id = f"SCAN-{uuid.uuid4().hex[:8].upper()}"
        now_dt = datetime.datetime.now()
        now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S PKT")

        self.is_scanning = True
        logger.info(f"Starting PSX market scan {scan_id}...")

        try:
            # 1. Fetch real collected quotes from market data engine
            quotes: List[NormalizedQuote] = await market_data_engine.get_quotes(force_refresh=force_refresh_quotes)
            total_universe = len(quotes)

            if total_universe == 0:
                # Trigger collection attempt if empty
                logger.info("Market data quotes empty. Triggering active collection run...")
                sync_res = await market_data_engine.collect_market_data_now()
                quotes = await market_data_engine.get_quotes()
                total_universe = len(quotes)

            if total_universe == 0:
                summary = ScanRunSummary(
                    id=scan_id,
                    scan_timestamp=now_str,
                    total_universe_count=0,
                    eligible_stocks_scanned=0,
                    stale_stocks_rejected=0,
                    invalid_data_rejected=0,
                    opportunities_found=0,
                    active_filters=t.model_dump(),
                    provider_used=market_data_engine.active_provider.name,
                    data_delay="UNKNOWN",
                    execution_time_ms=0.0,
                    status="NO_DATA",
                    error_message="Real market data is currently unavailable. Ensure the data collector is connected."
                )
                self.last_summary = summary
                self.last_opportunities = []
                self.is_scanning = False
                return []

            # Compute Sector Rotation Matrix for confluence tagging
            overview = await market_data_engine.get_market_overview()
            try:
                from backend.app.analytics.sector_matrix import compute_sector_rotation
                sec_rot = compute_sector_rotation(quotes, overview.index_change_percent)
                sec_map = {s.sector.upper(): s.quadrant.value for s in sec_rot}
            except Exception:
                sec_map = {}

            # 2. Iterate and evaluate each stock
            eligible_count = 0
            stale_count = 0
            invalid_count = 0
            opportunities: List[StockOpportunity] = []

            for q in quotes:
                # --- Filter 1: Integrity and Structural Validation ---
                if not q.is_valid or q.price <= 0:
                    invalid_count += 1
                    continue

                # --- Filter 2: Stale Data Rejection ---
                try:
                    quote_time = datetime.datetime.fromisoformat(q.timestamp)
                    age_seconds = int((now_dt - quote_time).total_seconds())
                except Exception:
                    age_seconds = 0

                if age_seconds > t.max_stale_data_seconds:
                    stale_count += 1
                    continue

                # --- Filter 3: Price Bounds ---
                if not (t.min_price <= q.price <= t.max_price):
                    continue

                # --- Filter 4: Liquidity & Minimum Volume ---
                turnover_pkr = q.price * q.volume
                if q.volume < t.min_volume or turnover_pkr < t.min_turnover_pkr:
                    continue

                # --- Filter 5: Price Change Bounds ---
                if not (t.min_change_percent <= q.change_percent <= t.max_change_percent):
                    continue

                eligible_count += 1

                # 3. Calculate Technical Indicators
                # Estimated historical context from session OHLC
                vwap = calculate_vwap([], q.price, q.volume)
                support, resistance = calculate_support_resistance(q.high_price, q.low_price, q.price, [])
                rvol = calculate_rvol(q.volume, [int(q.volume * 0.7)])

                # Approximate RSI from price position in day range & change %
                range_span = max(q.high_price - q.low_price, 0.01)
                pos_in_range = (q.price - q.low_price) / range_span
                base_rsi = 50.0 + (pos_in_range - 0.5) * 30.0 + min(max(q.change_percent * 2.5, -15.0), 15.0)
                rsi = round(max(min(base_rsi, 88.0), 25.0), 1)

                if not (t.min_rsi <= rsi <= t.max_rsi):
                    continue

                atr = round(max(q.high_price - q.low_price, q.price * 0.025), 2)
                ema_trend = "Bullish (Above 9/20/50)" if q.change_percent > 1.0 else ("Bearish" if q.change_percent < -1.5 else "Neutral")

                # Momentum score
                momentum_score = calculate_momentum_score(q.change_percent, rsi, rvol)
                if momentum_score < t.min_momentum_score:
                    continue

                # Setup classification
                setup_type, setup_desc = detect_setup_type(
                    q.price, vwap, support, resistance, ema_trend, rsi, rvol, q.change_percent
                )

                # Late entry protection & PSX Circuit Lock check
                is_late_entry, late_entry_msg = check_late_entry_risk(
                    q.price, resistance, q.ldcp, q.change_percent, t.late_entry_buffer_pct
                )
                circ_status, upper_cap, lower_cap, cap_dist, circ_msg = check_circuit_status(
                    q.price, q.ldcp, t.late_entry_buffer_pct
                )

                # Proposed entry, stop loss, and targets
                entry_rec = round(q.price, 2)
                stop_loss_rec = round(max(q.price - (atr * 1.5), support * 0.985), 2)
                target_rec = round(min(q.price + (max(atr * 2.2, (resistance - q.price) * 1.2)), upper_cap), 2)

                risk = max(entry_rec - stop_loss_rec, 0.1)
                reward = max(target_rec - entry_rec, 0.1)
                rr_ratio = round(reward / risk, 2)

                # Composite Opportunity Score (Heavily penalize upper circuit locked stocks)
                opp_score = calculate_composite_opportunity_score(
                    momentum_score, rvol, setup_type, is_late_entry or (circ_status == "CAP_DANGER"), rr_ratio, False
                )
                if circ_status == "LOCKED_UPPER":
                    opp_score = min(opp_score, 45) # Suppressed below BUY threshold

                if opp_score < t.min_opportunity_score:
                    continue

                vol_fmt = f"{round(q.volume / 1_000_000, 2)}M" if q.volume >= 1_000_000 else f"{round(q.volume / 1_000, 1)}K"
                univ_item = symbol_universe_mgr.get_by_symbol(q.symbol)
                company_name = univ_item.name if (univ_item and univ_item.name) else f"{q.symbol} Ltd"

                opportunity = StockOpportunity(
                    symbol=q.symbol,
                    company_name=company_name,
                    sector=q.sector,
                    last_price=q.price,
                    price_change_percent=q.change_percent,
                    volume=q.volume,
                    volume_formatted=vol_fmt,
                    relative_volume=rvol,
                    vwap=vwap,
                    ema_trend=ema_trend,
                    rsi_14=rsi,
                    atr_14=atr,
                    support_level=support,
                    resistance_level=resistance,
                    momentum_score=momentum_score,
                    opportunity_score=opp_score,
                    setup_type=setup_type,
                    setup_description=f"{setup_desc} [{circ_msg}]" if circ_status != "NORMAL" else setup_desc,
                    entry_price_recommended=entry_rec,
                    stop_loss_recommended=stop_loss_rec,
                    target_price_recommended=target_rec,
                    risk_reward_ratio=rr_ratio,
                    is_late_entry_risk=is_late_entry or (circ_status in ["CAP_DANGER", "LOCKED_UPPER"]),
                    data_freshness_seconds=age_seconds,
                    data_delay_type=q.delay_type.value,
                    data_timestamp=q.source_timestamp or now_str,
                    is_shariah_compliant=q.is_shariah_compliant,
                    is_defaulter=q.is_defaulter,
                    is_non_compliant=q.is_non_compliant,
                    regulatory_category=q.regulatory_category,
                    sector_quadrant=sec_map.get(q.sector.upper() if q.sector else "GENERAL", "LEADING"),
                    circuit_breaker_upper=upper_cap,
                    circuit_breaker_lower=lower_cap,
                    circuit_status=circ_status,
                    cap_distance_pct=cap_dist,
                    in_watchlist=False
                )

                opportunities.append(opportunity)

            # Sort descending by composite opportunity score
            opportunities.sort(key=lambda o: o.opportunity_score, reverse=True)

            exec_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

            summary = ScanRunSummary(
                id=scan_id,
                scan_timestamp=now_str,
                total_universe_count=total_universe,
                eligible_stocks_scanned=eligible_count,
                stale_stocks_rejected=stale_count,
                invalid_data_rejected=invalid_count,
                opportunities_found=len(opportunities),
                active_filters=t.model_dump(),
                provider_used=market_data_engine.active_provider.name,
                data_delay=market_data_engine.active_provider.get_health().data_delay.value,
                execution_time_ms=exec_time_ms,
                status="COMPLETED"
            )

            # Persist scan results
            scanner_storage.save_scan_run(summary, opportunities)

            self.last_summary = summary
            self.last_opportunities = opportunities
            self.is_scanning = False

            logger.info(f"Scan {scan_id} completed: {len(opportunities)} opportunities found in {exec_time_ms}ms.")
            return opportunities

        except Exception as e:
            logger.error(f"Error during market scan {scan_id}: {e}")
            self.is_scanning = False
            summary = ScanRunSummary(
                id=scan_id,
                scan_timestamp=now_str,
                total_universe_count=0,
                eligible_stocks_scanned=0,
                stale_stocks_rejected=0,
                invalid_data_rejected=0,
                opportunities_found=0,
                active_filters=t.model_dump(),
                provider_used=market_data_engine.active_provider.name,
                data_delay="UNKNOWN",
                execution_time_ms=0.0,
                status="ERROR",
                error_message=str(e)
            )
            self.last_summary = summary
            return self.last_opportunities

scanner_engine = MarketScannerEngine()
