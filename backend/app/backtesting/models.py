from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

PositionSizeType = Literal["PERCENT_OF_EQUITY", "RISK_BASED", "FIXED_AMOUNT"]
ExitReasonType = Literal["TARGET_1", "TARGET_2", "STOP_LOSS", "TIME_EXPIRY", "END_OF_DATA"]

class HistoricalBar(BaseModel):
    symbol: str
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class BacktestRequest(BaseModel):
    symbols: List[str] = Field(default=["AIRLINK"], description="List of PSX symbols to backtest e.g. ['AIRLINK', 'OGDC', 'MARI', 'SYS', 'LUCK']")
    start_date: str = Field(default="2025-01-01", description="Start date YYYY-MM-DD")
    end_date: str = Field(default="2026-11-15", description="End date YYYY-MM-DD")
    initial_capital: float = Field(default=1_000_000.0, description="Initial portfolio cash in PKR")
    position_size_type: PositionSizeType = Field(default="PERCENT_OF_EQUITY", description="Position sizing model")
    position_size_value: float = Field(default=20.0, description="% of equity (e.g. 20.0), fixed PKR (e.g. 200000), or % risk (e.g. 2.0)")
    max_open_positions: int = Field(default=5, description="Maximum simultaneous open positions")
    commission_rate_pct: float = Field(default=0.15, description="Brokerage commission % per trade (entry and exit)")
    slippage_pct: float = Field(default=0.10, description="Estimated execution slippage % on entry and exit")
    
    # Strategy parameter overrides
    min_score: int = Field(default=70, description="Minimum weighted opportunity score for entry")
    min_rsi: float = Field(default=48.0, description="Minimum RSI(14) for bullish momentum")
    max_rsi: float = Field(default=75.0, description="Maximum RSI(14) to avoid extreme overbought tops")
    min_rvol: float = Field(default=1.3, description="Minimum relative volume surge multiple")
    atr_stop_multiplier: float = Field(default=1.5, description="ATR multiplier for structural stop-loss")
    target_1_multiplier: float = Field(default=1.8, description="Target 1 multiplier of risk")
    target_2_multiplier: float = Field(default=2.8, description="Target 2 multiplier of risk")
    max_vwap_distance_pct: float = Field(default=3.5, description="Maximum acceptable distance above VWAP")
    max_holding_days: int = Field(default=15, description="Max holding period before time-based expiry")
    
    # Out of sample validation
    enable_out_of_sample: bool = Field(default=True, description="Enable In-Sample vs Out-of-Sample validation")
    out_of_sample_split_pct: float = Field(default=0.30, description="Fraction of timeline reserved for out-of-sample test (e.g. 0.3 = 30%)")

class BacktestTrade(BaseModel):
    trade_id: str
    symbol: str
    direction: str = "LONG"
    entry_date: str
    entry_price: float
    effective_entry_price: float
    exit_date: str
    exit_price: float
    effective_exit_price: float
    shares: int
    position_value: float
    stop_loss: float
    target_1: float
    target_2: float
    exit_reason: ExitReasonType
    gross_pnl: float
    fees_paid: float
    slippage_paid: float
    net_pnl: float
    return_pct: float
    holding_period_days: int
    risk_reward_planned: float
    risk_reward_realized: float
    is_out_of_sample: bool = False

class EquityPoint(BaseModel):
    date: str
    equity: float
    cash: float
    drawdown_pct: float
    benchmark_equity: float
    is_out_of_sample: bool = False

class PerformanceMetrics(BaseModel):
    initial_capital: float
    final_equity: float
    net_profit_pkr: float
    total_return_pct: float
    cagr_pct: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    breakeven_trades: int
    win_rate_pct: float
    profit_factor: float
    expectancy_pkr: float
    expectancy_pct: float
    average_win_pkr: float
    average_win_pct: float
    average_loss_pkr: float
    average_loss_pct: float
    win_loss_ratio: float
    max_drawdown_pkr: float
    max_drawdown_pct: float
    max_drawdown_duration_days: int
    sharpe_ratio: float
    sortino_ratio: float
    average_holding_days: float
    total_commissions_pkr: float
    total_slippage_pkr: float
    benchmark_return_pct: float
    alpha_vs_benchmark: float

class BacktestResult(BaseModel):
    id: str
    strategy_name: str
    run_timestamp: str
    config: BacktestRequest
    metrics: PerformanceMetrics
    in_sample_metrics: Optional[PerformanceMetrics] = None
    out_of_sample_metrics: Optional[PerformanceMetrics] = None
    trades: List[BacktestTrade]
    equity_curve: List[EquityPoint]
    assumptions: List[str]
    data_quality_notes: List[str]

class StrategyComparisonItem(BaseModel):
    strategy_name: str
    description: str
    total_return_pct: float
    cagr_pct: float
    win_rate_pct: float
    profit_factor: float
    expectancy_pkr: float
    max_drawdown_pct: float
    sharpe_ratio: float
    total_trades: int
    avg_holding_days: float

class StrategyComparisonResponse(BaseModel):
    strategies: List[StrategyComparisonItem]
    benchmark_name: str = "KSE-100 Index (Buy & Hold)"
    benchmark_return_pct: float
    benchmark_max_drawdown_pct: float
    start_date: str
    end_date: str
