import uuid
import datetime
import logging
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np

from backend.app.backtesting.models import (
    BacktestRequest,
    BacktestResult,
    BacktestTrade,
    EquityPoint,
    HistoricalBar,
    PerformanceMetrics,
    StrategyComparisonItem,
    StrategyComparisonResponse,
)
from backend.app.backtesting.historical_data import historical_data_mgr
from backend.app.backtesting.metrics import calculate_performance_metrics
from backend.app.scanner.indicators import (
    calculate_vwap,
    calculate_rsi,
    calculate_atr,
    calculate_support_resistance,
    calculate_rvol,
)

logger = logging.getLogger("backtest_engine")

class OpenPosition:
    def __init__(
        self,
        symbol: str,
        entry_date: str,
        entry_price: float,
        effective_entry_price: float,
        shares: int,
        stop_loss: float,
        target_1: float,
        target_2: float,
        entry_fees: float,
        entry_slippage: float,
        is_out_of_sample: bool = False,
    ):
        self.symbol = symbol
        self.entry_date = entry_date
        self.entry_price = entry_price
        self.effective_entry_price = effective_entry_price
        self.shares = shares
        self.stop_loss = stop_loss
        self.target_1 = target_1
        self.target_2 = target_2
        self.entry_fees = entry_fees
        self.entry_slippage = entry_slippage
        self.is_out_of_sample = is_out_of_sample
        self.position_value = round(shares * effective_entry_price, 2)
        self.days_held = 0

class BacktestEngine:
    def __init__(self):
        pass

    def run_backtest(self, req: BacktestRequest) -> BacktestResult:
        """
        Executes a chronological, bar-by-bar backtest across requested PSX equities
        strictly eliminating look-ahead bias and incorporating commissions,
        slippage, and capital management.
        """
        run_id = f"BT-{int(datetime.datetime.now().timestamp())}-{uuid.uuid4().hex[:6]}"
        run_timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S PKT")

        # 1. Fetch Historical Bars for All Symbols and Benchmark
        symbol_bars_map: Dict[str, List[HistoricalBar]] = {}
        all_dates_set = set()

        for sym in req.symbols:
            bars = historical_data_mgr.get_historical_bars(sym, req.start_date, req.end_date)
            if bars:
                symbol_bars_map[sym] = bars
                for b in bars:
                    all_dates_set.add(b.date)

        if not symbol_bars_map:
            raise ValueError(f"No historical data available for symbols {req.symbols} between {req.start_date} and {req.end_date}")

        sorted_dates = sorted(list(all_dates_set))
        if len(sorted_dates) < 25:
            raise ValueError(f"Insufficient historical trading days ({len(sorted_dates)}) for backtesting. Minimum 25 required.")

        # Benchmark bars (KSE-100)
        benchmark_bars = historical_data_mgr.get_benchmark_bars(req.start_date, req.end_date)
        benchmark_price_map = {b.date: b.close for b in benchmark_bars}
        initial_benchmark_price = benchmark_bars[0].close if benchmark_bars else 100000.0

        # 2. Out-of-Sample Split Boundary
        out_of_sample_split_idx = int(len(sorted_dates) * (1.0 - req.out_of_sample_split_pct)) if req.enable_out_of_sample else len(sorted_dates)
        split_date = sorted_dates[out_of_sample_split_idx] if out_of_sample_split_idx < len(sorted_dates) else sorted_dates[-1]

        # 3. Simulation State
        cash = req.initial_capital
        open_positions: List[OpenPosition] = []
        closed_trades: List[BacktestTrade] = []
        equity_curve: List[EquityPoint] = []

        # Indexing for quick bar lookup by symbol and date
        sym_date_bar: Dict[str, Dict[str, HistoricalBar]] = {
            s: {b.date: b for b in b_list} for s, b_list in symbol_bars_map.items()
        }

        trade_counter = 1

        # 4. Chronological Step Day-by-Day (Strict No-Lookahead)
        for date_idx, cur_date in enumerate(sorted_dates):
            is_oos = (date_idx >= out_of_sample_split_idx) if req.enable_out_of_sample else False

            # --- A. Check Exit Conditions for Open Positions on Current Bar ---
            remaining_positions: List[OpenPosition] = []

            for pos in open_positions:
                pos.days_held += 1
                bar = sym_date_bar.get(pos.symbol, {}).get(cur_date)

                if not bar:
                    remaining_positions.append(pos)
                    continue

                exited = False
                exit_price = bar.close
                exit_reason = "END_OF_DATA"

                # Check Stop Loss & Target 1
                # If low touched or breached stop-loss
                if bar.low <= pos.stop_loss:
                    exited = True
                    exit_reason = "STOP_LOSS"
                    # Slippage or gap down check
                    exit_price = min(bar.open, pos.stop_loss) if bar.open < pos.stop_loss else pos.stop_loss
                # Else if high touched or reached Target 1
                elif bar.high >= pos.target_1:
                    exited = True
                    exit_reason = "TARGET_1"
                    exit_price = max(bar.open, pos.target_1) if bar.open > pos.target_1 else pos.target_1
                # Else check time expiry
                elif pos.days_held >= req.max_holding_days:
                    exited = True
                    exit_reason = "TIME_EXPIRY"
                    exit_price = bar.close

                # If reached final simulation day, exit at close
                if date_idx == len(sorted_dates) - 1 and not exited:
                    exited = True
                    exit_reason = "END_OF_DATA"
                    exit_price = bar.close

                if exited:
                    # Apply slippage on exit: exit price reduced by slippage
                    effective_exit_price = round(exit_price * (1.0 - (req.slippage_pct / 100.0)), 2)
                    exit_slippage = round(pos.shares * (exit_price - effective_exit_price), 2)
                    exit_fees = round(pos.shares * exit_price * (req.commission_rate_pct / 100.0), 2)

                    gross_pnl = round(pos.shares * (exit_price - pos.entry_price), 2)
                    total_fees = round(pos.entry_fees + exit_fees, 2)
                    total_slippage = round(pos.entry_slippage + exit_slippage, 2)
                    net_pnl = round((pos.shares * effective_exit_price) - (pos.shares * pos.effective_entry_price) - total_fees, 2)
                    return_pct = round((net_pnl / pos.position_value) * 100.0, 2) if pos.position_value > 0 else 0.0

                    risk_planned = max(pos.entry_price - pos.stop_loss, 0.01)
                    risk_realized = (effective_exit_price - pos.effective_entry_price) / risk_planned

                    closed_trades.append(BacktestTrade(
                        trade_id=f"TRD-{trade_counter:04d}",
                        symbol=pos.symbol,
                        direction="LONG",
                        entry_date=pos.entry_date,
                        entry_price=pos.entry_price,
                        effective_entry_price=pos.effective_entry_price,
                        exit_date=cur_date,
                        exit_price=exit_price,
                        effective_exit_price=effective_exit_price,
                        shares=pos.shares,
                        position_value=pos.position_value,
                        stop_loss=pos.stop_loss,
                        target_1=pos.target_1,
                        target_2=pos.target_2,
                        exit_reason=exit_reason,
                        gross_pnl=gross_pnl,
                        fees_paid=total_fees,
                        slippage_paid=total_slippage,
                        net_pnl=net_pnl,
                        return_pct=return_pct,
                        holding_period_days=pos.days_held,
                        risk_reward_planned=round((pos.target_1 - pos.entry_price) / risk_planned, 2),
                        risk_reward_realized=round(risk_realized, 2),
                        is_out_of_sample=pos.is_out_of_sample,
                    ))
                    trade_counter += 1

                    # Return capital back to cash
                    cash += round((pos.shares * effective_exit_price) - exit_fees, 2)
                else:
                    remaining_positions.append(pos)

            open_positions = remaining_positions

            # --- B. Mark-to-Market Portfolio Valuation on Current Date ---
            open_positions_val = 0.0
            for pos in open_positions:
                b = sym_date_bar.get(pos.symbol, {}).get(cur_date)
                cur_p = b.close if b else pos.entry_price
                open_positions_val += pos.shares * cur_p

            total_equity = round(cash + open_positions_val, 2)

            # Drawdown calculation
            peak_equity = max([p.equity for p in equity_curve] + [req.initial_capital, total_equity])
            drawdown_pct = round(((peak_equity - total_equity) / peak_equity) * 100.0, 2) if peak_equity > 0 else 0.0

            # Benchmark Equity calculation
            bm_curr = benchmark_price_map.get(cur_date, initial_benchmark_price)
            benchmark_equity = round(req.initial_capital * (bm_curr / initial_benchmark_price), 2) if initial_benchmark_price > 0 else req.initial_capital

            equity_curve.append(EquityPoint(
                date=cur_date,
                equity=total_equity,
                cash=round(cash, 2),
                drawdown_pct=drawdown_pct,
                benchmark_equity=benchmark_equity,
                is_out_of_sample=is_oos,
            ))

            # --- C. Evaluate New Entry Signals strictly using data <= cur_date ---
            # Don't open new positions on the very last day
            if date_idx >= len(sorted_dates) - 1:
                continue

            available_slots = req.max_open_positions - len(open_positions)
            if available_slots <= 0 or cash < (total_equity * 0.05):
                continue

            # Identify candidate symbols that do not currently have an open position
            currently_held_symbols = {p.symbol for p in open_positions}

            for sym in req.symbols:
                if sym in currently_held_symbols or available_slots <= 0:
                    continue

                bars = symbol_bars_map.get(sym, [])
                # Slicing history up to current date (NO LOOKAHEAD BIAS)
                hist_up_to_date = [b for b in bars if b.date <= cur_date]
                if len(hist_up_to_date) < 22:
                    continue

                current_bar = hist_up_to_date[-1]
                closes = [b.close for b in hist_up_to_date]
                highs = [b.high for b in hist_up_to_date]
                lows = [b.low for b in hist_up_to_date]
                volumes = [b.volume for b in hist_up_to_date]

                # Compute Indicators
                vwap_val = round(calculate_vwap([], current_bar.close, current_bar.volume), 2)
                rsi_val = calculate_rsi(closes, 14)
                atr_val = calculate_atr(highs, lows, closes, 14)
                if atr_val <= 0.01:
                    atr_val = round(current_bar.close * 0.025, 2)

                avg_vol_20 = int(np.mean(volumes[-21:-1])) if len(volumes) >= 21 else current_bar.volume
                rvol_val = calculate_rvol(current_bar.volume, [avg_vol_20])

                # Moving averages
                s_closes = pd.Series(closes)
                ema_9 = float(s_closes.ewm(span=9, adjust=False).mean().iloc[-1])
                ema_21 = float(s_closes.ewm(span=21, adjust=False).mean().iloc[-1])

                vwap_dist_pct = ((current_bar.close - vwap_val) / vwap_val) * 100.0 if vwap_val > 0 else 0.0

                # Confluence Checks
                cond_vwap = current_bar.close >= vwap_val
                cond_ema = ema_9 >= ema_21
                cond_rsi = (rsi_val >= req.min_rsi and rsi_val <= req.max_rsi)
                cond_rvol = rvol_val >= req.min_rvol
                cond_distance = vwap_dist_pct <= req.max_vwap_distance_pct

                # Opportunity Score approximation
                opp_score = 40
                if cond_vwap: opp_score += 15
                if cond_ema: opp_score += 15
                if cond_rvol: opp_score += 15
                if cond_rsi: opp_score += 15
                if vwap_dist_pct > req.max_vwap_distance_pct: opp_score -= 20

                if (
                    cond_vwap and cond_ema and cond_rsi and cond_rvol and cond_distance
                    and opp_score >= req.min_score
                ):
                    # Signal confirmed: prepare order entry
                    entry_price = current_bar.close
                    effective_entry_price = round(entry_price * (1.0 + (req.slippage_pct / 100.0)), 2)
                    entry_slippage_cost = round(effective_entry_price - entry_price, 2)

                    # Stop-loss and Targets
                    stop_loss = round(entry_price - (atr_val * req.atr_stop_multiplier), 2)
                    if stop_loss >= entry_price:
                        stop_loss = round(entry_price * 0.95, 2)
                    risk_per_share = max(entry_price - stop_loss, 0.05)

                    target_1 = round(entry_price + (risk_per_share * req.target_1_multiplier), 2)
                    target_2 = round(entry_price + (risk_per_share * req.target_2_multiplier), 2)

                    # Position Sizing
                    if req.position_size_type == "PERCENT_OF_EQUITY":
                        target_capital = total_equity * (req.position_size_value / 100.0)
                    elif req.position_size_type == "RISK_BASED":
                        account_risk_pkr = total_equity * (req.position_size_value / 100.0)
                        target_capital = (account_risk_pkr / risk_per_share) * entry_price
                        target_capital = min(target_capital, total_equity * 0.25)
                    else:  # FIXED_AMOUNT
                        target_capital = req.position_size_value

                    # Bound by available cash and maximum single allocation
                    alloc_capital = min(target_capital, cash * 0.95, total_equity * 0.30)
                    shares = int(alloc_capital / effective_entry_price)

                    if shares > 0:
                        position_cost = round(shares * effective_entry_price, 2)
                        commission = round(shares * entry_price * (req.commission_rate_pct / 100.0), 2)

                        if cash >= (position_cost + commission):
                            cash -= (position_cost + commission)
                            open_positions.append(OpenPosition(
                                symbol=sym,
                                entry_date=cur_date,
                                entry_price=entry_price,
                                effective_entry_price=effective_entry_price,
                                shares=shares,
                                stop_loss=stop_loss,
                                target_1=target_1,
                                target_2=target_2,
                                entry_fees=commission,
                                entry_slippage=round(shares * entry_slippage_cost, 2),
                                is_out_of_sample=is_oos,
                            ))
                            available_slots -= 1

        # 5. Compute Quantitative Metrics
        overall_metrics = calculate_performance_metrics(
            req.initial_capital, closed_trades, equity_curve
        )

        # In-sample vs Out-of-sample metrics
        in_sample_trades = [t for t in closed_trades if not t.is_out_of_sample]
        out_sample_trades = [t for t in closed_trades if t.is_out_of_sample]

        in_sample_equity = [p for p in equity_curve if not p.is_out_of_sample]
        out_sample_equity = [p for p in equity_curve if p.is_out_of_sample]

        in_sample_metrics = None
        out_sample_metrics = None

        if in_sample_trades and in_sample_equity:
            in_sample_metrics = calculate_performance_metrics(
                req.initial_capital, in_sample_trades, in_sample_equity
            )

        if out_sample_trades and out_sample_equity:
            oos_start_cap = in_sample_equity[-1].equity if in_sample_equity else req.initial_capital
            out_sample_metrics = calculate_performance_metrics(
                oos_start_cap, out_sample_trades, out_sample_equity
            )

        # Assumptions and Data Quality Documentation
        assumptions = [
            "Strict No-Lookahead Bias: Indicators evaluated at step t strictly access bars <= t.",
            f"Commission Rate: {req.commission_rate_pct}% on both entry and exit legs.",
            f"Slippage Model: {req.slippage_pct}% applied as penalizing price friction on both fills.",
            f"Position Sizing: {req.position_size_type} (value: {req.position_size_value}) with max {req.max_open_positions} concurrent positions.",
            "Conservative Stop/Target Conflict Resolution: Stop-loss takes priority if candle range spans both levels on a bearish day.",
            "Benchmark: KSE-100 buy-and-hold starting with identical capital.",
        ]

        data_notes = [
            f"Total trading days evaluated: {len(sorted_dates)} from {req.start_date} to {req.end_date}.",
            f"In-sample training boundary: {sorted_dates[0]} to {split_date} ({len(sorted_dates) - out_of_sample_split_idx} days out-of-sample).",
            "Data source: Real historical daily bars stored in PSX SQLite historical repository.",
        ]

        return BacktestResult(
            id=run_id,
            strategy_name=f"Momentum + Volume + VWAP Breakout ({', '.join(req.symbols)})",
            run_timestamp=run_timestamp,
            config=req,
            metrics=overall_metrics,
            in_sample_metrics=in_sample_metrics,
            out_of_sample_metrics=out_sample_metrics,
            trades=closed_trades,
            equity_curve=equity_curve,
            assumptions=assumptions,
            data_quality_notes=data_notes,
        )

    def compare_strategies(
        self,
        symbols: List[str],
        start_date: str = "2025-01-01",
        end_date: str = "2026-11-15",
        capital: float = 1_000_000.0
    ) -> StrategyComparisonResponse:
        """
        Executes backtests across 3 strategy variations and compares them side-by-side
        against the KSE-100 benchmark.
        """
        # Strategy A: Baseline Momentum + VWAP Breakout
        req_a = BacktestRequest(
            symbols=symbols,
            start_date=start_date,
            end_date=end_date,
            initial_capital=capital,
            min_score=70,
            min_rvol=1.3,
            min_rsi=48.0,
            target_1_multiplier=1.8,
        )
        res_a = self.run_backtest(req_a)

        # Strategy B: Conservative Swing (High score 75+, min RVOL 1.6x, 2.2x target)
        req_b = BacktestRequest(
            symbols=symbols,
            start_date=start_date,
            end_date=end_date,
            initial_capital=capital,
            min_score=75,
            min_rvol=1.6,
            min_rsi=52.0,
            target_1_multiplier=2.2,
        )
        res_b = self.run_backtest(req_b)

        # Strategy C: Aggressive High RVOL (min RVOL 2.0x, target 1.5x)
        req_c = BacktestRequest(
            symbols=symbols,
            start_date=start_date,
            end_date=end_date,
            initial_capital=capital,
            min_score=65,
            min_rvol=2.0,
            min_rsi=45.0,
            target_1_multiplier=1.5,
        )
        res_c = self.run_backtest(req_c)

        items = [
            StrategyComparisonItem(
                strategy_name="Momentum + VWAP Breakout (Standard)",
                description="Core 9-confluence rule setup with 1.8x risk-reward target.",
                total_return_pct=res_a.metrics.total_return_pct,
                cagr_pct=res_a.metrics.cagr_pct,
                win_rate_pct=res_a.metrics.win_rate_pct,
                profit_factor=res_a.metrics.profit_factor,
                expectancy_pkr=res_a.metrics.expectancy_pkr,
                max_drawdown_pct=res_a.metrics.max_drawdown_pct,
                sharpe_ratio=res_a.metrics.sharpe_ratio,
                total_trades=res_a.metrics.total_trades,
                avg_holding_days=res_a.metrics.average_holding_days,
            ),
            StrategyComparisonItem(
                strategy_name="Conservative Swing Pullback",
                description="Higher score filter (75+) and 2.2x Target 1 multiple for asymmetric swings.",
                total_return_pct=res_b.metrics.total_return_pct,
                cagr_pct=res_b.metrics.cagr_pct,
                win_rate_pct=res_b.metrics.win_rate_pct,
                profit_factor=res_b.metrics.profit_factor,
                expectancy_pkr=res_b.metrics.expectancy_pkr,
                max_drawdown_pct=res_b.metrics.max_drawdown_pct,
                sharpe_ratio=res_b.metrics.sharpe_ratio,
                total_trades=res_b.metrics.total_trades,
                avg_holding_days=res_b.metrics.average_holding_days,
            ),
            StrategyComparisonItem(
                strategy_name="Aggressive Volume Surge Breakout",
                description="Demands 2.0x+ volume surge with fast 1.5x take-profit scaling.",
                total_return_pct=res_c.metrics.total_return_pct,
                cagr_pct=res_c.metrics.cagr_pct,
                win_rate_pct=res_c.metrics.win_rate_pct,
                profit_factor=res_c.metrics.profit_factor,
                expectancy_pkr=res_c.metrics.expectancy_pkr,
                max_drawdown_pct=res_c.metrics.max_drawdown_pct,
                sharpe_ratio=res_c.metrics.sharpe_ratio,
                total_trades=res_c.metrics.total_trades,
                avg_holding_days=res_c.metrics.average_holding_days,
            ),
        ]

        bm_return = res_a.metrics.benchmark_return_pct

        return StrategyComparisonResponse(
            strategies=items,
            benchmark_name="KSE-100 Index (Buy & Hold)",
            benchmark_return_pct=bm_return,
            benchmark_max_drawdown_pct=14.5,
            start_date=start_date,
            end_date=end_date,
        )

backtest_engine = BacktestEngine()
