import datetime
import logging
from typing import List, Dict, Any, Optional

from backend.app.journal.models import (
    JournalTrade,
    StrategyPerformanceItem,
    MonthlyPerformanceItem,
    PerformanceAnalyticsReport,
)
from backend.app.signals.storage import signal_storage

logger = logging.getLogger("journal_analytics")

def calculate_performance_analytics(
    trades: List[JournalTrade],
    initial_capital: float = 1_000_000.0
) -> PerformanceAnalyticsReport:
    """
    Computes rigorous trade journal performance analytics, strategy comparison,
    monthly breakdown, and signal conversion metrics.
    """
    total_trades = len(trades)
    open_trades = [t for t in trades if t.status == "OPEN"]
    closed_trades = [t for t in trades if t.status == "CLOSED"]

    open_trades_count = len(open_trades)
    closed_trades_count = len(closed_trades)

    winning_trades = [t for t in closed_trades if t.net_pnl > 0]
    losing_trades = [t for t in closed_trades if t.net_pnl < 0]
    breakeven_trades = [t for t in closed_trades if t.net_pnl == 0]

    wins_count = len(winning_trades)
    losses_count = len(losing_trades)
    breakeven_count = len(breakeven_trades)

    win_rate_pct = round((wins_count / closed_trades_count) * 100.0, 2) if closed_trades_count > 0 else 0.0

    gross_profit_pkr = round(sum(t.gross_pnl for t in winning_trades), 2)
    gross_loss_pkr = round(abs(sum(t.gross_pnl for t in losing_trades)), 2)
    total_commissions_pkr = round(sum(t.total_charges for t in trades), 2)
    net_profit_pkr = round(sum(t.net_pnl for t in closed_trades), 2)

    average_winner_pkr = round(sum(t.net_pnl for t in winning_trades) / wins_count, 2) if wins_count > 0 else 0.0
    average_winner_pct = round(sum(t.return_percent for t in winning_trades) / wins_count, 2) if wins_count > 0 else 0.0

    average_loser_pkr = round(abs(sum(t.net_pnl for t in losing_trades) / losses_count), 2) if losses_count > 0 else 0.0
    average_loser_pct = round(abs(sum(t.return_percent for t in losing_trades) / losses_count), 2) if losses_count > 0 else 0.0

    win_loss_ratio = round(average_winner_pkr / average_loser_pkr, 2) if average_loser_pkr > 0 else (999.0 if average_winner_pkr > 0 else 0.0)
    profit_factor = round(gross_profit_pkr / gross_loss_pkr, 2) if gross_loss_pkr > 0 else (999.0 if gross_profit_pkr > 0 else 0.0)

    # Mathematical Expectancy
    p_win = wins_count / closed_trades_count if closed_trades_count > 0 else 0.0
    p_loss = losses_count / closed_trades_count if closed_trades_count > 0 else 0.0
    expectancy_pkr = round((p_win * average_winner_pkr) - (p_loss * average_loser_pkr), 2)
    expectancy_pct = round((p_win * average_winner_pct) - (p_loss * average_loser_pct), 2)

    # Chronological equity curve for Max Drawdown
    sorted_closed = sorted(closed_trades, key=lambda t: t.exit_date or t.created_at)
    cum_pnl = 0.0
    peak_pnl = 0.0
    max_dd_pkr = 0.0

    for t in sorted_closed:
        cum_pnl += t.net_pnl
        if cum_pnl > peak_pnl:
            peak_pnl = cum_pnl
        dd = peak_pnl - cum_pnl
        if dd > max_dd_pkr:
            max_dd_pkr = dd

    max_dd_pkr = round(max_dd_pkr, 2)
    peak_equity = initial_capital + peak_pnl
    max_dd_pct = round((max_dd_pkr / peak_equity) * 100.0, 2) if peak_equity > 0 else 0.0

    largest_winning_trade_pkr = round(max((t.net_pnl for t in winning_trades), default=0.0), 2)
    largest_losing_trade_pkr = round(min((t.net_pnl for t in losing_trades), default=0.0), 2)

    # Average Holding Days
    holding_days_list: List[float] = []
    for t in closed_trades:
        if t.entry_date and t.exit_date:
            try:
                # Strip ISO or timestamp strings
                clean_entry = t.entry_date.replace("T", " ").replace("Z", "").split(".")[0]
                clean_exit = t.exit_date.replace("T", " ").replace("Z", "").split(".")[0]
                d1 = datetime.datetime.fromisoformat(clean_entry)
                d2 = datetime.datetime.fromisoformat(clean_exit)
                diff_days = max((d2 - d1).total_seconds() / 86400.0, 0.1)
                holding_days_list.append(diff_days)
            except Exception:
                pass

    average_holding_days = round(sum(holding_days_list) / len(holding_days_list), 1) if holding_days_list else 0.0

    # Strategy Breakdown
    strat_map: Dict[str, List[JournalTrade]] = {}
    for t in closed_trades:
        s_key = t.strategy or "Discretionary"
        if s_key not in strat_map:
            strat_map[s_key] = []
        strat_map[s_key].append(t)

    strategy_breakdown: List[StrategyPerformanceItem] = []
    for strat, t_list in strat_map.items():
        s_wins = [t for t in t_list if t.net_pnl > 0]
        s_losses = [t for t in t_list if t.net_pnl < 0]
        s_gross_win = sum(t.gross_pnl for t in s_wins)
        s_gross_loss = abs(sum(t.gross_pnl for t in s_losses))
        s_pf = round(s_gross_win / s_gross_loss, 2) if s_gross_loss > 0 else (999.0 if s_gross_win > 0 else 0.0)

        strategy_breakdown.append(StrategyPerformanceItem(
            strategy=strat,
            total_trades=len(t_list),
            winning_trades=len(s_wins),
            losing_trades=len(s_losses),
            win_rate_pct=round((len(s_wins) / len(t_list)) * 100.0, 2) if t_list else 0.0,
            net_pnl=round(sum(t.net_pnl for t in t_list), 2),
            profit_factor=s_pf,
            avg_return_pct=round(sum(t.return_percent for t in t_list) / len(t_list), 2) if t_list else 0.0
        ))

    # Monthly Performance
    month_map: Dict[str, List[JournalTrade]] = {}
    for t in closed_trades:
        m_str = (t.exit_date or t.entry_date)[:7] if (t.exit_date or t.entry_date) else "Unknown"
        if m_str not in month_map:
            month_map[m_str] = []
        month_map[m_str].append(t)

    monthly_performance: List[MonthlyPerformanceItem] = []
    for m_label in sorted(month_map.keys()):
        m_trades = month_map[m_label]
        m_wins = [t for t in m_trades if t.net_pnl > 0]
        m_losses = [t for t in m_trades if t.net_pnl < 0]
        monthly_performance.append(MonthlyPerformanceItem(
            month_label=m_label,
            trades_count=len(m_trades),
            winning_trades=len(m_wins),
            losing_trades=len(m_losses),
            win_rate_pct=round((len(m_wins) / len(m_trades)) * 100.0, 2) if m_trades else 0.0,
            gross_profit=round(sum(t.gross_pnl for t in m_wins), 2),
            gross_loss=round(abs(sum(t.gross_pnl for t in m_losses)), 2),
            net_pnl=round(sum(t.net_pnl for t in m_trades), 2),
            total_commissions=round(sum(t.total_charges for t in m_trades), 2)
        ))

    # Signal-to-Trade Conversion
    try:
        all_signals = signal_storage.get_signals(limit=1000)
        total_signals_count = len(all_signals)
    except Exception as e:
        logger.warning(f"Failed to fetch signals for conversion analytics: {e}")
        total_signals_count = 0

    converted_trade_ids = set(t.signal_id for t in trades if t.signal_id)
    converted_signals_count = len(converted_trade_ids)
    signal_conversion_rate = round((converted_signals_count / total_signals_count) * 100.0, 2) if total_signals_count > 0 else 0.0

    return PerformanceAnalyticsReport(
        total_trades=total_trades,
        open_trades_count=open_trades_count,
        closed_trades_count=closed_trades_count,
        winning_trades=wins_count,
        losing_trades=losses_count,
        breakeven_trades=breakeven_count,
        win_rate_pct=win_rate_pct,
        gross_profit_pkr=gross_profit_pkr,
        gross_loss_pkr=gross_loss_pkr,
        total_commissions_pkr=total_commissions_pkr,
        net_profit_pkr=net_profit_pkr,
        average_winner_pkr=average_winner_pkr,
        average_winner_pct=average_winner_pct,
        average_loser_pkr=average_loser_pkr,
        average_loser_pct=average_loser_pct,
        win_loss_ratio=win_loss_ratio,
        profit_factor=profit_factor,
        expectancy_pkr=expectancy_pkr,
        expectancy_pct=expectancy_pct,
        max_drawdown_pkr=max_dd_pkr,
        max_drawdown_pct=max_dd_pct,
        largest_winning_trade_pkr=largest_winning_trade_pkr,
        largest_losing_trade_pkr=largest_losing_trade_pkr,
        average_holding_days=average_holding_days,
        strategy_breakdown=strategy_breakdown,
        monthly_performance=monthly_performance,
        signal_conversion_rate_pct=signal_conversion_rate,
        total_system_signals_generated=total_signals_count,
        signals_converted_to_trades=converted_signals_count,
    )
