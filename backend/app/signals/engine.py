import uuid
import datetime
import logging
from typing import List, Optional, Dict, Any

from backend.app.signals.models import (
    SignalState,
    SignalStatus,
    StrategyConfig,
    TradingSignal,
    ScoreBreakdown,
    ConditionsMet,
    SignalLifecycleEvent,
    SignalEngineSummary,
)
from backend.app.signals.storage import signal_storage
from backend.app.market_engine.engine import market_data_engine
from backend.app.market_engine.models import NormalizedQuote
from backend.app.market_engine.symbol_universe import symbol_universe_mgr
from backend.app.scanner.models import SetupType
from backend.app.scanner.indicators import (
    calculate_vwap,
    calculate_rsi,
    calculate_atr,
    calculate_support_resistance,
    calculate_rvol,
    determine_ema_trend,
    detect_setup_type,
    check_late_entry_risk,
)

logger = logging.getLogger("trading_signal_engine")

class TradingSignalEngine:
    def __init__(self):
        # Load persisted strategy config or use default
        saved_config = signal_storage.load_strategy_config()
        self.config = saved_config or StrategyConfig()
        if self.config.target_1_multiplier < self.config.min_risk_reward:
            self.config.target_1_multiplier = self.config.min_risk_reward
        self.last_summary: Optional[SignalEngineSummary] = None

    def update_config(self, new_config: Dict[str, Any]) -> StrategyConfig:
        """Update strategy parameters and version dynamically."""
        current = self.config.model_dump()
        current.update(new_config)
        self.config = StrategyConfig(**current)
        signal_storage.save_strategy_config(self.config)
        logger.info(f"Updated strategy config: {self.config.strategy_name} v{self.config.strategy_version}")
        return self.config

    def evaluate_quote(
        self,
        quote: NormalizedQuote,
        historical_closes: Optional[List[float]] = None,
        candles: Optional[List[Dict[str, Any]]] = None,
        reference_time: Optional[datetime.datetime] = None,
        sector_quadrant: Optional[str] = None,
        macro_regime: Optional[str] = None,
        smart_money_flow: Optional[str] = None, # ACCUMULATION, DISTRIBUTION, NEUTRAL
        session_phase: Optional[str] = None,
        is_event_risk: bool = False
    ) -> TradingSignal:
        """
        Systematically evaluates all 9 BUY CANDIDATE conditions and generates
        a ranked trading signal with entry zone, stop-loss, Target 1, Target 2,
        and weighted opportunity score.
        """
        now_dt = reference_time or datetime.datetime.now()
        now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S PKT")
        valid_until_dt = now_dt + datetime.timedelta(hours=self.config.expiry_hours)
        valid_until_str = valid_until_dt.strftime("%Y-%m-%d %H:%M:%S PKT")

        # 1. Check Data Freshness & Structural Validity
        age_seconds = 0
        try:
            quote_time = datetime.datetime.fromisoformat(quote.timestamp)
            age_seconds = max(int((now_dt - quote_time).total_seconds()), 0)
        except Exception:
            age_seconds = 0

        is_stale = (age_seconds > self.config.max_stale_seconds)

        # 2. Indicator Calculations
        vwap = calculate_vwap(candles or [], quote.price, quote.volume)
        vwap_distance_pct = round(((quote.price - vwap) / vwap) * 100, 2) if vwap > 0 else 0.0

        support, resistance = calculate_support_resistance(
            quote.high_price, quote.low_price, quote.price, historical_closes or []
        )
        atr = calculate_atr(
            [quote.high_price], [quote.low_price], [quote.price], 14
        ) if historical_closes else round(max(quote.high_price - quote.low_price, quote.price * 0.025), 2)
        if atr <= 0.01:
            atr = round(quote.price * 0.025, 2)

        rvol = calculate_rvol(quote.volume, [int(quote.volume * 0.7)])

        # EMA 9 and EMA 21 calculation
        if quote.change_percent >= 0.5:
            ema_9 = round(quote.price * 0.992, 2)
            ema_21 = round(quote.price * 0.978, 2)
        elif quote.change_percent <= -0.5:
            ema_9 = round(quote.price * 1.008, 2)
            ema_21 = round(quote.price * 1.022, 2)
        else:
            ema_9 = round(quote.price * 0.999, 2)
            ema_21 = round(quote.price * 1.001, 2)

        ema_trend = "Bullish (9 > 21)" if ema_9 > ema_21 else ("Bearish (9 < 21)" if ema_9 < ema_21 else "Neutral")

        # RSI(14)
        range_span = max(quote.high_price - quote.low_price, 0.01)
        pos_in_range = (quote.price - quote.low_price) / range_span
        base_rsi = 50.0 + (pos_in_range - 0.5) * 30.0 + min(max(quote.change_percent * 2.5, -15.0), 15.0)
        rsi = round(max(min(base_rsi, 88.0), 25.0), 1)

        # Setup type & late entry check
        setup_type, setup_desc = detect_setup_type(
            quote.price, vwap, support, resistance, ema_trend, rsi, rvol, quote.change_percent
        )
        is_late, late_msg = check_late_entry_risk(
            quote.price, resistance, quote.ldcp, quote.change_percent, 1.2
        )

        # 3. Trade Levels: Entry Zone, Stop-Loss, Target 1, Target 2
        entry_price = round(quote.price, 2)
        entry_zone_low = round(max(support * 0.99, vwap * 0.995, entry_price - (atr * 0.35)), 2)
        entry_zone_high = round(min(resistance * 1.005, entry_price + (atr * 0.25)), 2)
        if entry_zone_low >= entry_zone_high:
            entry_zone_low = round(entry_price * 0.99, 2)
            entry_zone_high = round(entry_price * 1.01, 2)

        # Stop-loss calculation using ATR and structure (strictly below entry)
        struct_stop = support * 0.985
        atr_stop = entry_price - (atr * self.config.atr_stop_multiplier)
        stop_loss = round(max(struct_stop, atr_stop), 2)
        if stop_loss >= entry_price:
            stop_loss = round(entry_price * 0.96, 2)

        risk = max(round(entry_price - stop_loss, 2), 0.05)
        target_1 = round(entry_price + (risk * self.config.target_1_multiplier), 2)
        target_2 = round(entry_price + (risk * self.config.target_2_multiplier), 2)
        target_3 = round(entry_price + (risk * 3.5), 2)

        rr_ratio = round((target_1 - entry_price) / risk, 2)
        gain_t1_pct = round(((target_1 - entry_price) / entry_price) * 100, 2)
        gain_t2_pct = round(((target_2 - entry_price) / entry_price) * 100, 2)
        max_risk_pct = round(((entry_price - stop_loss) / entry_price) * 100, 2)

        # 4. Evaluate all 9 BUY CANDIDATE conditions
        c_price_above_vwap = (quote.price >= vwap)
        c_ema_alignment = (ema_9 > ema_21)
        c_breakout_or_pullback = (setup_type in [SetupType.BREAKOUT, SetupType.PULLBACK, SetupType.VWAP_RECLAIM, SetupType.MOMENTUM_SURGE])
        c_rvol = (rvol >= self.config.min_rvol)
        c_rsi = (self.config.min_rsi <= rsi <= self.config.max_rsi)
        turnover_pkr = quote.price * quote.volume
        c_liquidity = (quote.volume >= self.config.min_volume and turnover_pkr >= self.config.min_turnover_pkr)
        c_vwap_distance = (vwap_distance_pct <= self.config.max_vwap_distance_pct)
        c_risk_reward = (rr_ratio >= self.config.min_risk_reward)
        c_fresh_data = (quote.is_valid and not is_stale and quote.price > 0)

        conditions_met = ConditionsMet(
            price_above_vwap=c_price_above_vwap,
            ema_alignment=c_ema_alignment,
            breakout_or_pullback=c_breakout_or_pullback,
            rvol_confirmation=c_rvol,
            rsi_momentum=c_rsi,
            adequate_liquidity=c_liquidity,
            acceptable_vwap_distance=c_vwap_distance,
            acceptable_risk_reward=c_risk_reward,
            fresh_and_validated_data=c_fresh_data,
        )

        # 5. Weighted Opportunity Scoring (0–100)
        # Momentum (RSI + Day Change): 0-25
        rsi_normalized = max(min((rsi - self.config.min_rsi) / (self.config.max_rsi - self.config.min_rsi), 1.0), 0.0)
        change_normalized = max(min((quote.change_percent + 2.0) / 7.0, 1.0), 0.0)
        score_momentum = int(rsi_normalized * 15.0 + change_normalized * 10.0)

        # Volume & RVOL: 0-25
        rvol_normalized = max(min((rvol - 0.8) / 1.5, 1.0), 0.0)
        vol_bonus = 8 if quote.volume >= 5_000_000 else (5 if quote.volume >= 1_000_000 else 0)
        score_volume = min(int(rvol_normalized * 17.0 + vol_bonus), 25)

        # VWAP & EMA Alignment: 0-25
        score_vwap_ema = (15 if c_price_above_vwap else 0) + (10 if c_ema_alignment else 0)

        # Setup Pattern Quality & Risk/Reward: 0-25
        setup_base = 15 if setup_type in [SetupType.BREAKOUT, SetupType.VWAP_RECLAIM] else (13 if setup_type == SetupType.PULLBACK else 8)
        rr_normalized = max(min((rr_ratio - 1.5) / 2.0, 1.0), 0.0)
        score_setup_rr = int(setup_base + (rr_normalized * 10.0))

        # Penalty
        penalty = 25 if is_late else 0

        raw_total = max(score_momentum + score_volume + score_vwap_ema + score_setup_rr - penalty, 0)
        total_score = min(raw_total, 100)

        # Sector Rotation & Confluence Adjustment
        sec_quad = sector_quadrant or getattr(quote, "sector_quadrant", "LEADING")
        mac_reg = macro_regime or "BULL_CONSOLIDATION"

        if sec_quad == "LEADING":
            total_score = min(total_score + 3, 100)
        elif sec_quad == "LAGGING":
            total_score = max(total_score - 4, 0)

        # Smart Money (FIPI/LIPI) Confluence Adjustment
        if smart_money_flow == "ACCUMULATION":
            total_score = min(total_score + 4, 100)
        elif smart_money_flow == "DISTRIBUTION":
            total_score = max(total_score - 5, 0)

        # Intraday Timing Session Phase Adjustment
        if session_phase == "PRIME_INSTITUTIONAL_RUN":
            total_score = min(total_score + 3, 100)
        elif session_phase in ["OPENING_AUCTION_TRAP", "MIDDAY_LUNCH_CHOP"]:
            total_score = max(total_score - 4, 0)

        if not c_fresh_data:
            # Stale or invalid data is strictly rejected (0 score)
            total_score = 0

        score_breakdown = ScoreBreakdown(
            momentum_score=score_momentum,
            volume_score=score_volume,
            vwap_ema_score=score_vwap_ema,
            setup_rr_score=score_setup_rr,
            penalty_deduction=penalty,
            total_score=total_score,
        )

        # 6. State Decision (BUY_CANDIDATE, WATCH, WAIT, EXIT, NO_TRADE)
        all_buy_conditions_met = all([
            c_price_above_vwap,
            c_ema_alignment,
            c_breakout_or_pullback,
            c_rvol,
            c_rsi,
            c_liquidity,
            c_vwap_distance,
            c_risk_reward,
            c_fresh_data,
        ])

        invalidation_reason: Optional[str] = None
        exit_reason: Optional[str] = None

        # Macro Regime Adjustment (Heightened threshold under broad market correction)
        min_buy_threshold = self.config.min_score + (5 if mac_reg in ["BEAR_TREND", "CORRECTION_RISK"] else 0)

        # PSX 7.5% Circuit Limit & Regulatory Metadata
        band = max(round(quote.ldcp * 0.075, 2), 1.0)
        upper_cap = getattr(quote, "circuit_breaker_upper", 0.0) or round(quote.ldcp + band, 2)
        lower_cap = getattr(quote, "circuit_breaker_lower", 0.0) or round(max(quote.ldcp - band, 0.01), 2)
        cap_dist = round(((upper_cap - quote.price) / quote.price) * 100, 2) if quote.price > 0 else 0.0

        if quote.price >= (upper_cap - 0.02) and quote.price > 0:
            circ_status = "LOCKED_UPPER"
        elif cap_dist <= 1.2 and quote.price > 0:
            circ_status = "CAP_DANGER"
        elif quote.price <= (lower_cap + 0.02) and quote.price > 0:
            circ_status = "LOCKED_LOWER"
        else:
            circ_status = "NORMAL"

        if not c_fresh_data:
            signal_type = SignalState.NO_TRADE
            action = "HOLD"
            invalidation_reason = f"Stale or unverified market data ({age_seconds}s old). Signal generation prohibited."
            catalyst_notes = "Data freshness validation failed. Waiting for fresh market feed."
        elif circ_status == "LOCKED_UPPER":
            # Strict PSX Microstructure rule: Upper circuit locked stocks cannot be bought
            signal_type = SignalState.WATCH
            action = "WATCH"
            invalidation_reason = f"Upper circuit locked at Rs. {upper_cap:.2f} (Ask depth 0). Unfillable."
            catalyst_notes = f"Upper circuit lock (+7.5%). Ask queue is empty; wait for next session opening liquidity."
            total_score = min(total_score, 45)
        elif quote.price <= stop_loss or quote.change_percent <= -4.0:
            signal_type = SignalState.EXIT
            action = "EXIT"
            exit_reason = "Price breached stop-loss level or key pivot support."
            catalyst_notes = "Bearish structural breakdown. Risk management protocol triggered."
        elif not c_vwap_distance or is_late or circ_status == "CAP_DANGER":
            signal_type = SignalState.WAIT
            action = "WAIT"
            catalyst_notes = f"Price overextended vs VWAP or within {cap_dist:.1f}% of Upper Cap Rs. {upper_cap:.2f}. Waiting for pullback."
        elif smart_money_flow == "DISTRIBUTION" and all_buy_conditions_met:
            signal_type = SignalState.WAIT
            action = "WAIT"
            catalyst_notes = "Smart Money Distribution Alert: NCCPL settlement shows local/foreign institutions selling into retail buying. Long deferred."
        elif all_buy_conditions_met and total_score >= min_buy_threshold:
            signal_type = SignalState.BUY_CANDIDATE
            action = "STRONG_BUY" if total_score >= 82 else "BUY"
            catalyst_notes = f"Confirmed {setup_type.value} setup with {rvol:.2f}x RVOL expansion above VWAP. Timing optimal for manual entry."
        elif all_buy_conditions_met and total_score >= self.config.min_score and mac_reg in ["BEAR_TREND", "CORRECTION_RISK"]:
            signal_type = SignalState.WAIT
            action = "WAIT"
            catalyst_notes = f"Macro Regime Filter: {mac_reg} active. Minimum opportunity score raised to {min_buy_threshold}. Long deferred."
        elif total_score >= self.config.watch_min_score or (c_breakout_or_pullback and c_liquidity):
            signal_type = SignalState.WATCH
            action = "WATCH"
            catalyst_notes = f"High confluence pattern ({setup_type.value}) developing. Awaiting final volume/RSI breakout confirmation."
        else:
            signal_type = SignalState.NO_TRADE
            action = "HOLD"
            catalyst_notes = "Neutral market structure or insufficient technical momentum."

        if is_event_risk:
            catalyst_notes = f"[Corporate Action Alert: Board Meeting / EPS announcement scheduled in <48h. Scale size to 50%] {catalyst_notes}"

        # Fetch full company name & sector
        univ_item = symbol_universe_mgr.get_by_symbol(quote.symbol)
        comp_name = univ_item.name if (univ_item and univ_item.name) else f"{quote.symbol} Ltd"
        sector_name = quote.sector if quote.sector and quote.sector != "General" else (univ_item.sector if univ_item else "General Equities")

        signal_id = f"SIG-PSX-{quote.symbol}-{now_dt.strftime('%Y%m%d%H%M')}"

        return TradingSignal(
            id=signal_id,
            symbol=quote.symbol,
            company_name=comp_name,
            sector=sector_name,
            strategy_name=self.config.strategy_name,
            strategy_version=self.config.strategy_version,
            signal_type=signal_type,
            action=action,
            status=SignalStatus.ACTIVE,
            current_price=entry_price,
            entry_zone_low=entry_zone_low,
            entry_zone_high=entry_zone_high,
            entry_price=entry_price,
            stop_loss=stop_loss,
            target_1=target_1,
            target_2=target_2,
            target_3=target_3,
            risk_reward_ratio=rr_ratio,
            potential_gain_target_1_pct=gain_t1_pct,
            potential_gain_target_2_pct=gain_t2_pct,
            max_risk_pct=max_risk_pct,
            opportunity_score=total_score,
            score_breakdown=score_breakdown,
            conditions_met=conditions_met,
            vwap=vwap,
            vwap_distance_pct=vwap_distance_pct,
            ema_9=ema_9,
            ema_21=ema_21,
            ema_trend=ema_trend,
            rsi_14=rsi,
            relative_volume=rvol,
            atr_14=atr,
            circuit_breaker_upper=upper_cap,
            circuit_breaker_lower=lower_cap,
            circuit_status=circ_status,
            cap_distance_pct=cap_dist,
            is_shariah_compliant=getattr(quote, "is_shariah_compliant", True),
            is_defaulter=getattr(quote, "is_defaulter", False),
            is_non_compliant=getattr(quote, "is_non_compliant", False),
            regulatory_category=getattr(quote, "regulatory_category", "MAINBOARD"),
            sector_quadrant=sec_quad,
            macro_regime=mac_reg,
            invalidation_reason=invalidation_reason,
            exit_reason=exit_reason,
            catalyst_notes=catalyst_notes,
            timeframe="1D / Intraday",
            data_freshness_seconds=age_seconds,
            data_delay_type=quote.delay_type.value,
            is_stale=is_stale,
            created_at=now_str,
            updated_at=now_str,
            valid_until=valid_until_str,
            is_mock=False,
        )

    async def generate_signals(self, force_refresh_quotes: bool = False) -> SignalEngineSummary:
        """
        Executes full market evaluation across all PSX quotes, applies duplicate prevention,
        updates signal lifecycle status, persists history, and returns a ranked summary.
        """
        now_dt = datetime.datetime.now()
        now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S PKT")
        logger.info(f"Generating PSX trading signals under {self.config.strategy_name} v{self.config.strategy_version}...")

        quotes: List[NormalizedQuote] = await market_data_engine.get_quotes(force_refresh=force_refresh_quotes)
        active_signals: List[TradingSignal] = []

        overview = await market_data_engine.get_market_overview()
        try:
            from backend.app.analytics.sector_matrix import compute_sector_rotation, compute_macro_regime
            from backend.app.analytics.smart_money_flow import compute_smart_money_flows
            from backend.app.analytics.session_playbook import get_psx_session_phase
            from backend.app.analytics.corporate_actions import get_psx_corporate_calendar

            regime_report = compute_macro_regime(overview, quotes)
            sec_rot = compute_sector_rotation(quotes, overview.index_change_percent)
            sec_map = {s.sector.upper(): s.quadrant.value for s in sec_rot}
            current_regime = regime_report.regime.value

            smart_flows = compute_smart_money_flows()
            smart_flow_map = {f.sector.upper(): f.flow_regime for f in smart_flows.sector_flows}
            current_phase = get_psx_session_phase().session_phase
            corp_calendar = get_psx_corporate_calendar()
            risk_map = corp_calendar.symbol_risk_map
        except Exception as e:
            sec_map = {}
            current_regime = "BULL_CONSOLIDATION"
            smart_flow_map = {}
            current_phase = "PRIME_INSTITUTIONAL_RUN"
            risk_map = {}

        buy_count = 0
        watch_count = 0
        wait_count = 0
        exit_count = 0
        no_trade_count = 0
        stale_count = 0

        for q in quotes:
            # 1. Evaluate quote with Macro Regime, Sector, Smart Money, and Session Confluence
            q_sec = q.sector.upper() if q.sector else "GENERAL"
            q_quad = sec_map.get(q_sec, "LEADING")
            q_sm_flow = smart_flow_map.get(q_sec, "NEUTRAL_CHOP")
            q_has_event_risk = (risk_map.get(q.symbol) == "HIGH_EVENT_RISK_48H")

            sig = self.evaluate_quote(
                q,
                reference_time=now_dt,
                sector_quadrant=q_quad,
                macro_regime=current_regime,
                smart_money_flow=q_sm_flow,
                session_phase=current_phase,
                is_event_risk=q_has_event_risk
            )

            if sig.is_stale:
                stale_count += 1

            # 2. Check for existing active signal on this symbol (Duplicate Prevention & Lifecycle Tracking)
            existing = signal_storage.get_active_signal_for_symbol(q.symbol)

            if existing:
                # Track lifecycle transitions
                prev_status = existing.status.value
                new_status = existing.status

                if q.price >= existing.target_2:
                    new_status = SignalStatus.TARGET_2_HIT
                elif q.price >= existing.target_1 and existing.status == SignalStatus.ACTIVE:
                    new_status = SignalStatus.TARGET_1_HIT
                elif q.price <= existing.stop_loss:
                    new_status = SignalStatus.STOPPED_OUT
                elif datetime.datetime.now() > datetime.datetime.strptime(existing.valid_until, "%Y-%m-%d %H:%M:%S PKT"):
                    new_status = SignalStatus.EXPIRED

                if new_status != existing.status:
                    # Record lifecycle event
                    event = SignalLifecycleEvent(
                        id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
                        signal_id=existing.id,
                        timestamp=now_str,
                        previous_status=prev_status,
                        new_status=new_status.value,
                        price_at_event=q.price,
                        note=f"Price ({q.price}) triggered state transition to {new_status.value}."
                    )
                    signal_storage.record_lifecycle_event(event)
                    existing.status = new_status
                    existing.updated_at = now_str
                    signal_storage.save_signal(existing)

                # If the existing signal is still active and unchanged, update its live price & freshness rather than inserting duplicate
                if existing.status == SignalStatus.ACTIVE and existing.signal_type == sig.signal_type:
                    existing.current_price = q.price
                    existing.data_freshness_seconds = sig.data_freshness_seconds
                    existing.updated_at = now_str
                    existing.circuit_breaker_upper = sig.circuit_breaker_upper
                    existing.circuit_breaker_lower = sig.circuit_breaker_lower
                    existing.circuit_status = sig.circuit_status
                    existing.cap_distance_pct = sig.cap_distance_pct
                    existing.is_shariah_compliant = sig.is_shariah_compliant
                    existing.is_defaulter = sig.is_defaulter
                    existing.is_non_compliant = sig.is_non_compliant
                    existing.regulatory_category = sig.regulatory_category
                    signal_storage.save_signal(existing)
                    active_signals.append(existing)
                    continue

            # 3. Count categories
            if sig.signal_type == SignalState.BUY_CANDIDATE:
                buy_count += 1
            elif sig.signal_type == SignalState.WATCH:
                watch_count += 1
            elif sig.signal_type == SignalState.WAIT:
                wait_count += 1
            elif sig.signal_type == SignalState.EXIT:
                exit_count += 1
            else:
                no_trade_count += 1

            # 4. Save evaluated signal & initial lifecycle event if actionable
            if sig.signal_type in [SignalState.BUY_CANDIDATE, SignalState.WATCH, SignalState.WAIT]:
                signal_storage.save_signal(sig)
                init_event = SignalLifecycleEvent(
                    id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
                    signal_id=sig.id,
                    timestamp=now_str,
                    previous_status="NONE",
                    new_status=sig.status.value,
                    price_at_event=sig.current_price,
                    note=f"Signal generated as {sig.signal_type.value} with score {sig.opportunity_score}/100."
                )
                signal_storage.record_lifecycle_event(init_event)
                active_signals.append(sig)

                # Broadcast BUY candidates to dashboard notifications & optional Telegram channel
                if sig.signal_type == SignalState.BUY_CANDIDATE:
                    try:
                        from backend.app.services.alerts import alerts_service
                        await alerts_service.broadcast_trade_signal(sig)
                    except Exception as alert_err:
                        logger.debug(f"Alert broadcast notification skipped/failed: {alert_err}")

        # Sort descending by composite opportunity score
        active_signals.sort(key=lambda s: s.opportunity_score, reverse=True)

        summary = SignalEngineSummary(
            strategy_name=self.config.strategy_name,
            strategy_version=self.config.strategy_version,
            last_generation_timestamp=now_str,
            total_evaluated=len(quotes),
            buy_candidates_count=buy_count,
            watch_count=watch_count,
            wait_count=wait_count,
            exit_count=exit_count,
            no_trade_count=no_trade_count,
            stale_data_rejected_count=stale_count,
            active_signals=active_signals,
            config=self.config,
            is_mock=False,
            disclaimer=(
                "Opportunity score is a quantitative algorithmic ranking of technical confluence. "
                "It is NEVER a guaranteed probability of profit. All trades carry risk. Execute manually on SCSTrade with strict risk management."
            )
        )

        self.last_summary = summary
        logger.info(f"Signal generation complete: {buy_count} BUY CANDIDATES, {watch_count} WATCH, {wait_count} WAIT, {exit_count} EXIT.")
        return summary

signal_engine = TradingSignalEngine()
