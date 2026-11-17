import io
import csv
from backend.app.backtesting.models import BacktestResult

def generate_trades_csv(res: BacktestResult) -> str:
    """Exports all trade-by-trade simulated transactions to clean CSV."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Trade ID",
        "Symbol",
        "Direction",
        "Entry Date",
        "Entry Price (PKR)",
        "Effective Entry (with Slippage)",
        "Exit Date",
        "Exit Price (PKR)",
        "Effective Exit (with Slippage)",
        "Shares Traded",
        "Position Value (PKR)",
        "Stop Loss",
        "Target 1",
        "Target 2",
        "Exit Reason",
        "Gross PnL (PKR)",
        "Commissions Paid (PKR)",
        "Slippage Paid (PKR)",
        "Net PnL (PKR)",
        "Return %",
        "Holding Period (Days)",
        "Planned R:R",
        "Realized R:R",
        "Out of Sample",
    ])

    for t in res.trades:
        writer.writerow([
            t.trade_id,
            t.symbol,
            t.direction,
            t.entry_date,
            f"{t.entry_price:.2f}",
            f"{t.effective_entry_price:.2f}",
            t.exit_date,
            f"{t.exit_price:.2f}",
            f"{t.effective_exit_price:.2f}",
            t.shares,
            f"{t.position_value:.2f}",
            f"{t.stop_loss:.2f}",
            f"{t.target_1:.2f}",
            f"{t.target_2:.2f}",
            t.exit_reason,
            f"{t.gross_pnl:.2f}",
            f"{t.fees_paid:.2f}",
            f"{t.slippage_paid:.2f}",
            f"{t.net_pnl:.2f}",
            f"{t.return_pct:.2f}%",
            t.holding_period_days,
            f"{t.risk_reward_planned:.2f}",
            f"{t.risk_reward_realized:.2f}",
            "YES" if t.is_out_of_sample else "NO",
        ])

    return output.getvalue()

def generate_equity_csv(res: BacktestResult) -> str:
    """Exports daily portfolio equity curve & drawdown series to CSV."""
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Date",
        "Portfolio Equity (PKR)",
        "Available Cash (PKR)",
        "Drawdown %",
        "Benchmark Equity (KSE-100)",
        "Out of Sample",
    ])

    for p in res.equity_curve:
        writer.writerow([
            p.date,
            f"{p.equity:.2f}",
            f"{p.cash:.2f}",
            f"{p.drawdown_pct:.2f}%",
            f"{p.benchmark_equity:.2f}",
            "YES" if p.is_out_of_sample else "NO",
        ])

    return output.getvalue()
