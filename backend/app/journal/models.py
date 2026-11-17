from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

TradeDirection = Literal["BUY", "SELL"]
TradeStatus = Literal["OPEN", "CLOSED"]
ExitReason = Literal["TARGET_1", "TARGET_2", "STOP_LOSS", "DISCRETIONARY", "TIME_EXPIRY", "TRAILING_STOP"]

class JournalTradeCreate(BaseModel):
    symbol: str = Field(description="PSX stock symbol e.g. AIRLINK")
    company_name: Optional[str] = None
    sector: Optional[str] = "Equities"
    direction: TradeDirection = "BUY"
    quantity: int = Field(gt=0, description="Number of shares traded")
    entry_price: float = Field(gt=0, description="Executed entry price in PKR")
    entry_date: str = Field(description="Entry timestamp YYYY-MM-DD or YYYY-MM-DD HH:MM:SS")
    stop_loss: Optional[float] = Field(None, gt=0, description="Stop-loss price")
    target_1: Optional[float] = Field(None, gt=0, description="Target 1 take-profit price")
    target_2: Optional[float] = Field(None, gt=0, description="Target 2 extended take-profit price")
    strategy: Optional[str] = "Momentum + VWAP Breakout"
    setup_type: Optional[str] = "BREAKOUT"
    signal_id: Optional[str] = Field(None, description="Linked automated signal ID if converted from engine")
    brokerage_commission_rate: float = Field(default=0.15, description="Brokerage commission rate % (default 0.15%)")
    notes: Optional[str] = ""

class JournalTradeClose(BaseModel):
    exit_price: float = Field(gt=0, description="Executed exit price in PKR")
    exit_date: str = Field(description="Exit timestamp YYYY-MM-DD or YYYY-MM-DD HH:MM:SS")
    exit_reason: ExitReason = "TARGET_1"
    closing_notes: Optional[str] = ""

class JournalTradeUpdate(BaseModel):
    stop_loss: Optional[float] = None
    target_1: Optional[float] = None
    target_2: Optional[float] = None
    strategy: Optional[str] = None
    notes: Optional[str] = None

class JournalTrade(BaseModel):
    id: str
    symbol: str
    company_name: str
    sector: str
    direction: TradeDirection
    status: TradeStatus
    quantity: int
    entry_price: float
    entry_date: str
    stop_loss: Optional[float] = None
    target_1: Optional[float] = None
    target_2: Optional[float] = None
    exit_price: Optional[float] = None
    exit_date: Optional[str] = None  # text YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
    exit_date_str: Optional[str] = None
    exit_reason: Optional[str] = None
    strategy: str
    setup_type: str
    signal_id: Optional[str] = None
    position_value: float
    brokerage_commission_rate: float
    total_charges: float
    gross_pnl: float
    net_pnl: float
    return_percent: float
    notes: str
    created_at: str
    updated_at: str

# Risk Management Models
class RiskSettings(BaseModel):
    trading_capital: float = Field(default=1_000_000.0, gt=0, description="Total account trading capital in PKR")
    max_risk_per_trade_pct: float = Field(default=1.5, gt=0, le=10.0, description="Maximum risk per trade % of capital")
    max_daily_loss_pct: float = Field(default=3.0, gt=0, le=20.0, description="Maximum allowable daily account drawdown %")
    max_open_positions: int = Field(default=5, ge=1, le=20, description="Maximum simultaneous open positions")
    max_sector_exposure_pct: float = Field(default=30.0, gt=0, le=100.0, description="Maximum capital allocated to any single sector")
    max_single_position_pct: float = Field(default=25.0, gt=0, le=100.0, description="Maximum capital allocated to a single position")
    commission_rate_pct: float = Field(default=0.15, description="Brokerage commission % per leg")

class RiskCalculationRequest(BaseModel):
    symbol: str
    entry_price: float = Field(gt=0)
    stop_loss: float = Field(gt=0)
    target_1: Optional[float] = None
    target_2: Optional[float] = None
    capital_override: Optional[float] = None
    risk_pct_override: Optional[float] = None

class RiskCalculationResult(BaseModel):
    symbol: str
    entry_price: float
    stop_loss: float
    stop_loss_distance_pkr: float
    stop_loss_distance_pct: float
    risk_amount_pkr: float
    recommended_shares: int
    recommended_position_value: float
    position_size_pct_of_capital: float
    target_1: Optional[float] = None
    target_1_rr: Optional[float] = None
    target_1_potential_pkr: Optional[float] = None
    target_2: Optional[float] = None
    target_2_rr: Optional[float] = None
    target_2_potential_pkr: Optional[float] = None
    estimated_commission_pkr: float
    warnings: List[str]

class RiskWarning(BaseModel):
    type: Literal["INFO", "WARNING", "DANGER"]
    category: str
    message: str

class PortfolioExposure(BaseModel):
    trading_capital: float
    allocated_capital: float
    remaining_cash: float
    exposure_pct: float
    open_positions_count: int
    max_positions_limit: int
    daily_realized_pnl: float
    daily_pnl_pct: float
    max_daily_loss_limit_pkr: float
    is_daily_loss_breached: bool
    sector_exposure: Dict[str, float]
    warnings: List[RiskWarning]

# Performance Analytics Models
class StrategyPerformanceItem(BaseModel):
    strategy: str
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate_pct: float
    net_pnl: float
    profit_factor: float
    avg_return_pct: float

class MonthlyPerformanceItem(BaseModel):
    month_label: str  # e.g. "2026-11"
    trades_count: int
    winning_trades: int
    losing_trades: int
    win_rate_pct: float
    gross_profit: float
    gross_loss: float
    net_pnl: float
    total_commissions: float

class PerformanceAnalyticsReport(BaseModel):
    total_trades: int
    open_trades_count: int
    closed_trades_count: int
    winning_trades: int
    losing_trades: int
    breakeven_trades: int
    win_rate_pct: float
    gross_profit_pkr: float
    gross_loss_pkr: float
    total_commissions_pkr: float
    net_profit_pkr: float
    average_winner_pkr: float
    average_winner_pct: float
    average_loser_pkr: float
    average_loser_pct: float
    win_loss_ratio: float
    profit_factor: float
    expectancy_pkr: float
    expectancy_pct: float
    max_drawdown_pkr: float
    max_drawdown_pct: float
    largest_winning_trade_pkr: float
    largest_losing_trade_pkr: float
    average_holding_days: float
    strategy_breakdown: List[StrategyPerformanceItem]
    monthly_performance: List[MonthlyPerformanceItem]
    signal_conversion_rate_pct: float
    total_system_signals_generated: int
    signals_converted_to_trades: int
