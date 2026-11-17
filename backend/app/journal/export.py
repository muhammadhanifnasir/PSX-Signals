import io
import csv
from typing import List

from backend.app.journal.models import JournalTrade

def generate_journal_csv(trades: List[JournalTrade]) -> str:
    """
    Generates a RFC 4180 compliant CSV string for trade journal export.
    """
    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")

    headers = [
        "Trade ID",
        "Symbol",
        "Company Name",
        "Sector",
        "Direction",
        "Status",
        "Quantity",
        "Entry Price (PKR)",
        "Entry Date",
        "Stop Loss (PKR)",
        "Target 1 (PKR)",
        "Target 2 (PKR)",
        "Exit Price (PKR)",
        "Exit Date",
        "Exit Reason",
        "Position Value (PKR)",
        "Brokerage Rate %",
        "Total Charges (PKR)",
        "Gross PnL (PKR)",
        "Net PnL (PKR)",
        "Return %",
        "Strategy",
        "Setup Type",
        "Signal ID",
        "Notes"
    ]
    writer.writerow(headers)

    for t in trades:
        writer.writerow([
            t.id,
            t.symbol,
            t.company_name,
            t.sector,
            t.direction,
            t.status,
            t.quantity,
            f"{t.entry_price:.2f}",
            t.entry_date,
            f"{t.stop_loss:.2f}" if t.stop_loss is not None else "",
            f"{t.target_1:.2f}" if t.target_1 is not None else "",
            f"{t.target_2:.2f}" if t.target_2 is not None else "",
            f"{t.exit_price:.2f}" if t.exit_price is not None else "",
            t.exit_date or "",
            t.exit_reason or "",
            f"{t.position_value:.2f}",
            f"{t.brokerage_commission_rate:.2f}",
            f"{t.total_charges:.2f}",
            f"{t.gross_pnl:.2f}",
            f"{t.net_pnl:.2f}",
            f"{t.return_percent:.2f}%",
            t.strategy,
            t.setup_type,
            t.signal_id or "",
            (t.notes or "").replace("\n", " -- ")
        ])

    return output.getvalue()
