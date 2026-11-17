import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional

from backend.app.backtesting.models import (
    BacktestTrade,
    EquityPoint,
    PerformanceMetrics,
)

def calculate_performance_metrics(
    initial_capital: float,
    trades: List[BacktestTrade],
    equity_curve: List[EquityPoint],
    benchmark_equity_curve: Optional[List[EquityPoint]] = None,
    risk_free_rate_annual: float = 0.15,  # 15% Pakistan Treasury rate
) -> PerformanceMetrics:
    """
    Computes rigorous quantitative metrics for PSX algorithmic strategy evaluation:
    - Win rate, Profit factor, Mathematical Expectancy
    - Average Win, Average Loss, Win/Loss Asymmetry ratio
    - Maximum Drawdown in PKR & % and Max Drawdown Duration
    - Annualized Sharpe & Sortino ratios
    - Realistic Commission & Slippage impact
    - Alpha relative to KSE-100 buy & hold benchmark
    """
    final_equity = equity_curve[-1].equity if equity_curve else initial_capital
    net_profit_pkr = round(final_equity - initial_capital, 2)
    total_return_pct = round((net_profit_pkr / initial_capital) * 100.0, 2) if initial_capital > 0 else 0.0

    # Timeline span for CAGR
    days_span = 365
    if len(equity_curve) >= 2:
        try:
            import datetime
            d_start = datetime.datetime.strptime(equity_curve[0].date, "%Y-%m-%d")
            d_end = datetime.datetime.strptime(equity_curve[-1].date, "%Y-%m-%d")
            days_span = max((d_end - d_start).days, 1)
        except Exception:
            days_span = max(len(equity_curve), 1)

    cagr_pct = 0.0
    if initial_capital > 0 and final_equity > 0:
        cagr_val = ((final_equity / initial_capital) ** (365.25 / days_span)) - 1.0
        cagr_pct = round(cagr_val * 100.0, 2)

    # Trade Statistics
    total_trades = len(trades)
    winning_trades_list = [t for t in trades if t.net_pnl > 0]
    losing_trades_list = [t for t in trades if t.net_pnl < 0]
    breakeven_trades_list = [t for t in trades if t.net_pnl == 0]

    winning_count = len(winning_trades_list)
    losing_count = len(losing_trades_list)
    breakeven_count = len(breakeven_trades_list)

    win_rate_pct = round((winning_count / total_trades) * 100.0, 2) if total_trades > 0 else 0.0

    gross_profits = sum(t.gross_pnl for t in winning_trades_list)
    gross_losses = abs(sum(t.gross_pnl for t in losing_trades_list))
    profit_factor = round(gross_profits / gross_losses, 2) if gross_losses > 0 else (99.0 if gross_profits > 0 else 1.0)

    avg_win_pkr = round(sum(t.net_pnl for t in winning_trades_list) / winning_count, 2) if winning_count > 0 else 0.0
    avg_win_pct = round(sum(t.return_pct for t in winning_trades_list) / winning_count, 2) if winning_count > 0 else 0.0

    avg_loss_pkr = round(abs(sum(t.net_pnl for t in losing_trades_list)) / losing_count, 2) if losing_count > 0 else 0.0
    avg_loss_pct = round(abs(sum(t.return_pct for t in losing_trades_list)) / losing_count, 2) if losing_count > 0 else 0.0

    win_loss_ratio = round(avg_win_pkr / avg_loss_pkr, 2) if avg_loss_pkr > 0 else (99.0 if avg_win_pkr > 0 else 1.0)

    # Mathematical Expectancy = (Win% * Avg Win) - (Loss% * Avg Loss)
    p_win = winning_count / total_trades if total_trades > 0 else 0.0
    p_loss = losing_count / total_trades if total_trades > 0 else 0.0
    expectancy_pkr = round((p_win * avg_win_pkr) - (p_loss * avg_loss_pkr), 2)
    
    avg_pos_val = sum(t.position_value for t in trades) / total_trades if total_trades > 0 else initial_capital * 0.2
    expectancy_pct = round((expectancy_pkr / avg_pos_val) * 100.0, 2) if avg_pos_val > 0 else 0.0

    # Drawdown Analysis on Equity Curve
    max_dd_pkr = 0.0
    max_dd_pct = 0.0
    max_dd_duration_days = 0

    if equity_curve:
        equities = [p.equity for p in equity_curve]
        peak = equities[0]
        peak_idx = 0
        cur_duration = 0

        for idx, eq in enumerate(equities):
            if eq > peak:
                peak = eq
                peak_idx = idx
                cur_duration = 0
            else:
                cur_duration = idx - peak_idx
                if cur_duration > max_dd_duration_days:
                    max_dd_duration_days = cur_duration

            dd_pkr = peak - eq
            dd_pct = (dd_pkr / peak) * 100.0 if peak > 0 else 0.0

            if dd_pkr > max_dd_pkr:
                max_dd_pkr = round(dd_pkr, 2)
            if dd_pct > max_dd_pct:
                max_dd_pct = round(dd_pct, 2)

    # Sharpe & Sortino Ratios (Daily Returns)
    sharpe_ratio = 0.0
    sortino_ratio = 0.0

    if len(equity_curve) >= 5:
        eq_series = pd.Series([p.equity for p in equity_curve])
        daily_returns = eq_series.pct_change().dropna()
        rf_daily = risk_free_rate_annual / 252.0

        excess_returns = daily_returns - rf_daily
        mean_excess = excess_returns.mean()
        std_dev = daily_returns.std()

        if std_dev > 0:
            sharpe_ratio = round(float((mean_excess / std_dev) * np.sqrt(252)), 2)

        downside_returns = daily_returns[daily_returns < 0]
        downside_std = downside_returns.std()
        if downside_std and downside_std > 0:
            sortino_ratio = round(float((mean_excess / downside_std) * np.sqrt(252)), 2)

    # Average Holding Duration
    avg_holding_days = round(sum(t.holding_period_days for t in trades) / total_trades, 1) if total_trades > 0 else 0.0

    # Total Fees and Slippage
    total_commissions = round(sum(t.fees_paid for t in trades), 2)
    total_slippage = round(sum(t.slippage_paid for t in trades), 2)

    # Benchmark Comparison (KSE-100)
    benchmark_return_pct = 0.0
    if equity_curve and equity_curve[0].benchmark_equity > 0:
        b_start = equity_curve[0].benchmark_equity
        b_end = equity_curve[-1].benchmark_equity
        benchmark_return_pct = round(((b_end - b_start) / b_start) * 100.0, 2)

    alpha_vs_benchmark = round(total_return_pct - benchmark_return_pct, 2)

    return PerformanceMetrics(
        initial_capital=initial_capital,
        final_equity=round(final_equity, 2),
        net_profit_pkr=net_profit_pkr,
        total_return_pct=total_return_pct,
        cagr_pct=cagr_pct,
        total_trades=total_trades,
        winning_trades=winning_count,
        losing_trades=losing_count,
        breakeven_trades=breakeven_count,
        win_rate_pct=win_rate_pct,
        profit_factor=profit_factor,
        expectancy_pkr=expectancy_pkr,
        expectancy_pct=expectancy_pct,
        average_win_pkr=avg_win_pkr,
        average_win_pct=avg_win_pct,
        average_loss_pkr=avg_loss_pkr,
        average_loss_pct=avg_loss_pct,
        win_loss_ratio=win_loss_ratio,
        max_drawdown_pkr=max_dd_pkr,
        max_drawdown_pct=max_dd_pct,
        max_drawdown_duration_days=max_dd_duration_days,
        sharpe_ratio=sharpe_ratio,
        sortino_ratio=sortino_ratio,
        average_holding_days=avg_holding_days,
        total_commissions_pkr=total_commissions,
        total_slippage_pkr=total_slippage,
        benchmark_return_pct=benchmark_return_pct,
        alpha_vs_benchmark=alpha_vs_benchmark,
    )
