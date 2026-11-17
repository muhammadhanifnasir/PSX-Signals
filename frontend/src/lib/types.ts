export interface MarketBreadth {
  advances: number;
  declines: number;
  unchanged: number;
  total_traded: number;
}

export interface MarketStatus {
  status: "OPEN" | "CLOSED" | "PRE_OPEN";
  index_name: string;
  current_value: number;
  change: number;
  change_percent: number;
  high: number;
  low: number;
  volume: number;
  volume_formatted: string;
  turnover_pkr: number;
  turnover_formatted: string;
  previous_close: number;
  market_breadth: MarketBreadth;
  stocks_scanned_count: number;
  active_signals_count: number;
  strong_opportunities_count: number;
  data_freshness_seconds: number;
  last_updated: string;
  is_mock?: boolean;
  disclaimer: string;
}

export interface MarketMover {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  volume_formatted: string;
  turnover_pkr: number;
  high_today: number;
  low_today: number;
}

export interface MarketMoversResponse {
  gainers: MarketMover[];
  losers: MarketMover[];
  volume_leaders: MarketMover[];
  timestamp: string;
  is_mock?: boolean;
  disclaimer: string;
}

export type SignalAction = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL" | "WATCH" | "WAIT" | "EXIT";

export type SignalStateType = "BUY_CANDIDATE" | "WATCH" | "WAIT" | "EXIT" | "NO_TRADE";

export type SignalLifecycleStatus = "ACTIVE" | "TARGET_1_HIT" | "TARGET_2_HIT" | "STOPPED_OUT" | "EXPIRED" | "INVALIDATED";

export interface ScoreBreakdown {
  momentum_score: number;
  volume_score: number;
  vwap_ema_score: number;
  setup_rr_score: number;
  penalty_deduction: number;
  total_score: number;
}

export interface ConditionsMet {
  price_above_vwap: boolean;
  ema_alignment: boolean;
  breakout_or_pullback: boolean;
  rvol_confirmation: boolean;
  rsi_momentum: boolean;
  adequate_liquidity: boolean;
  acceptable_vwap_distance: boolean;
  acceptable_risk_reward: boolean;
  fresh_and_validated_data: boolean;
}

export interface Signal {
  id: string;
  symbol: string;
  company_name: string;
  sector: string;
  action: SignalAction;
  signal_type?: SignalStateType;
  strategy: string;
  strategy_version?: string;
  timeframe: string;
  confidence_score: number;
  opportunity_score?: number;
  score_breakdown?: ScoreBreakdown;
  conditions_met?: ConditionsMet;
  current_price: number;
  entry_price: number;
  entry_zone_low?: number;
  entry_zone_high?: number;
  stop_loss: number;
  target_1: number;
  target_2: number;
  target_3?: number;
  risk_reward_ratio: number;
  potential_gain_percent: number;
  max_loss_percent: number;
  vwap?: number;
  vwap_distance_pct?: number;
  ema_9?: number;
  ema_21?: number;
  ema_trend?: string;
  rsi_14: number;
  volume_surge_ratio: number;
  relative_volume?: number;
  atr_14?: number;
  circuit_breaker_upper?: number;
  circuit_breaker_lower?: number;
  circuit_status?: string;
  cap_distance_pct?: number;
  is_shariah_compliant?: boolean;
  is_defaulter?: boolean;
  is_non_compliant?: boolean;
  regulatory_category?: string;
  sector_quadrant?: string;
  macro_regime?: string;
  created_at: string;
  valid_until: string;
  status: SignalLifecycleStatus;
  catalyst_notes: string;
  invalidation_reason?: string;
  exit_reason?: string;
  data_freshness_seconds?: number;
  data_delay_type?: string;
  is_stale?: boolean;
  is_mock?: boolean;
  disclaimer?: string;
}

export interface SignalOverviewResponse {
  total_signals: number;
  strong_buy_count: number;
  buy_count: number;
  hold_count: number;
  sell_count: number;
  watch_count?: number;
  wait_count?: number;
  exit_count?: number;
  signals: Signal[];
  timestamp: string;
  is_mock?: boolean;
  disclaimer: string;
}

export interface StrategyConfig {
  strategy_name: string;
  strategy_version: string;
  min_score: number;
  watch_min_score: number;
  min_volume: number;
  min_turnover_pkr: number;
  min_rvol: number;
  min_rsi: number;
  max_rsi: number;
  max_vwap_distance_pct: number;
  min_risk_reward: number;
  atr_stop_multiplier: number;
  target_1_multiplier: number;
  target_2_multiplier: number;
  max_stale_seconds: number;
  expiry_hours: number;
}

export interface SignalLifecycleEvent {
  id: string;
  signal_id: string;
  timestamp: string;
  previous_status: string;
  new_status: string;
  price_at_event: number;
  note: string;
}

export interface ScannerItem {
  symbol: string;
  company_name: string;
  sector: string;
  price: number;
  change_percent: number;
  volume: number;
  rel_volume: number;
  rsi_14: number;
  macd_signal: string;
  ema_trend: string;
  detected_pattern: string;
  signal_trigger: string;
  confidence_score: number;
  is_shariah_compliant: boolean;
}

export interface ScannerResponse {
  total_scanned: number;
  matches_count: number;
  scan_timestamp: string;
  filters_applied: Record<string, any>;
  results: ScannerItem[];
  is_mock?: boolean;
  disclaimer: string;
}

export type SetupType =
  | "BREAKOUT"
  | "PULLBACK"
  | "VWAP_RECLAIM"
  | "MOMENTUM_SURGE"
  | "VOLUME_SURGE"
  | "CONSOLIDATION"
  | "NEUTRAL";

export interface StockOpportunity {
  symbol: string;
  company_name: string;
  sector: string;
  last_price: number;
  price_change_percent: number;
  volume: number;
  volume_formatted: string;
  relative_volume: number;
  vwap: number;
  ema_trend: string;
  rsi_14: number;
  atr_14: number;
  support_level: number;
  resistance_level: number;
  momentum_score: number;
  opportunity_score: number;
  setup_type: SetupType;
  setup_description: string;
  entry_price_recommended: number;
  stop_loss_recommended: number;
  target_price_recommended: number;
  risk_reward_ratio: number;
  is_late_entry_risk: boolean;
  data_freshness_seconds: number;
  data_delay_type: string;
  data_timestamp: string;
  is_shariah_compliant: boolean;
  is_defaulter?: boolean;
  is_non_compliant?: boolean;
  regulatory_category?: string;
  sector_quadrant?: string;
  circuit_breaker_upper?: number;
  circuit_breaker_lower?: number;
  circuit_status?: string;
  cap_distance_pct?: number;
  in_watchlist: boolean;
}

export interface ScanRunSummary {
  id: string;
  scan_timestamp: string;
  total_universe_count: number;
  eligible_stocks_scanned: number;
  stale_stocks_rejected: number;
  invalid_data_rejected: number;
  opportunities_found: number;
  active_filters: Record<string, any>;
  provider_used: string;
  data_delay: string;
  execution_time_ms: number;
  status: string;
  error_message?: string | null;
}

export interface ScannerThresholds {
  min_volume: number;
  min_turnover_pkr: number;
  min_price: number;
  max_price: number;
  min_change_percent: number;
  max_change_percent: number;
  min_relative_volume: number;
  min_rsi: number;
  max_rsi: number;
  min_momentum_score: number;
  min_opportunity_score: number;
  late_entry_buffer_pct: number;
  max_stale_data_seconds: number;
}

export interface OpportunityItem {
  id: string;
  symbol: string;
  company_name: string;
  action: string;
  score: number;
  expected_return_pct: number;
  risk_level: string;
  timeframe: string;
  entry_range: string;
  stop_loss: number;
  target_1: number;
  catalyst: string;
  volume_surge: string;
}

export interface OpportunitiesResponse {
  top_opportunities: OpportunityItem[];
  timestamp: string;
  is_mock?: boolean;
  disclaimer: string;
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OverlayPoint {
  time: string;
  value: number;
}

export interface SignalMarker {
  time: string;
  position: "aboveBar" | "belowBar";
  color: string;
  shape: "arrowUp" | "arrowDown" | "circle";
  text: string;
}

export interface SupportResistanceLevels {
  pivot: number;
  r1: number;
  r2: number;
  s1: number;
  s2: number;
}

export interface TechnicalIndicators {
  rsi_14: number;
  atr_14: number;
  vwap?: number;
  ema_9?: number;
  ema_21?: number;
  macd_line: number;
  macd_signal: number;
  macd_hist: number;
  sma_20: number;
  sma_50: number;
  sma_200: number;
  trend: string;
}

export interface StockDetail {
  symbol: string;
  company_name: string;
  sector: string;
  price: number;
  change: number;
  change_percent: number;
  open: number;
  high: number;
  low: number;
  ldcp?: number;
  volume: number;
  volume_formatted: string;
  pe_ratio: number;
  dividend_yield_pct: number;
  high_52w: number;
  low_52w: number;
  technicals: TechnicalIndicators;
  candles: Candle[];
  ema_9_series?: OverlayPoint[];
  ema_21_series?: OverlayPoint[];
  vwap_series?: OverlayPoint[];
  support_resistance?: SupportResistanceLevels;
  historical_markers?: SignalMarker[];
  current_signal?: Record<string, any>;
  entry_price?: number;
  entry_zone_low?: number;
  entry_zone_high?: number;
  stop_loss?: number;
  target_1?: number;
  target_2?: number;
  risk_reward_ratio?: number;
  opportunity_score?: number;
  circuit_breaker_upper?: number;
  circuit_breaker_lower?: number;
  circuit_status?: string;
  cap_distance_pct?: number;
  is_shariah_compliant?: boolean;
  is_defaulter?: boolean;
  is_non_compliant?: boolean;
  regulatory_category?: string;
  data_delay_type?: string;
  data_timestamp?: string;
  is_mock?: boolean;
  disclaimer: string;
}

export interface WatchlistItem {
  symbol: string;
  company_name: string;
  sector: string;
  current_price: number;
  change: number;
  change_percent: number;
  volume: number;
  volume_formatted: string;
  target_buy_price?: number;
  target_sell_price?: number;
  alert_enabled: boolean;
  notes: string;
  active_signal_action?: string;
  active_signal_score?: number;
  active_signal_type?: string;
  created_at: string;
}

export interface DashboardNotification {
  id: string;
  signal_id?: string;
  symbol: string;
  title: string;
  message: string;
  notification_type: string;
  timestamp: string;
  is_read: boolean;
}

export interface AlertConfig {
  telegram_enabled: boolean;
  telegram_bot_token_masked: string;
  telegram_chat_id: string;
  min_alert_score: number;
  alert_on_buy: boolean;
  alert_on_target: boolean;
  alert_on_stop_loss: boolean;
}

export type PositionSizeType = "PERCENT_OF_EQUITY" | "RISK_BASED" | "FIXED_AMOUNT";
export type ExitReasonType = "TARGET_1" | "TARGET_2" | "STOP_LOSS" | "TIME_EXPIRY" | "END_OF_DATA";

export interface BacktestRequest {
  symbols: string[];
  start_date: string;
  end_date: string;
  initial_capital: number;
  position_size_type: PositionSizeType;
  position_size_value: number;
  max_open_positions: number;
  commission_rate_pct: number;
  slippage_pct: number;
  min_score: number;
  min_rsi: number;
  max_rsi: number;
  min_rvol: number;
  atr_stop_multiplier: number;
  target_1_multiplier: number;
  target_2_multiplier: number;
  max_vwap_distance_pct: number;
  max_holding_days: number;
  enable_out_of_sample: boolean;
  out_of_sample_split_pct: number;
}

export interface BacktestTrade {
  trade_id: string;
  symbol: string;
  direction: string;
  entry_date: string;
  entry_price: number;
  effective_entry_price: number;
  exit_date: string;
  exit_price: number;
  effective_exit_price: number;
  shares: number;
  position_value: number;
  stop_loss: number;
  target_1: number;
  target_2: number;
  exit_reason: ExitReasonType;
  gross_pnl: number;
  fees_paid: number;
  slippage_paid: number;
  net_pnl: number;
  return_pct: number;
  holding_period_days: number;
  risk_reward_planned: number;
  risk_reward_realized: number;
  is_out_of_sample: boolean;
}

export interface BacktestEquityPoint {
  date: string;
  equity: number;
  cash: number;
  drawdown_pct: number;
  benchmark_equity: number;
  is_out_of_sample: boolean;
}

export interface BacktestPerformanceMetrics {
  initial_capital: number;
  final_equity: number;
  net_profit_pkr: number;
  total_return_pct: number;
  cagr_pct: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;
  win_rate_pct: number;
  profit_factor: number;
  expectancy_pkr: number;
  expectancy_pct: number;
  average_win_pkr: number;
  average_win_pct: number;
  average_loss_pkr: number;
  average_loss_pct: number;
  win_loss_ratio: number;
  max_drawdown_pkr: number;
  max_drawdown_pct: number;
  max_drawdown_duration_days: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  average_holding_days: number;
  total_commissions_pkr: number;
  total_slippage_pkr: number;
  benchmark_return_pct: number;
  alpha_vs_benchmark: number;
}

export interface BacktestResult {
  id: string;
  strategy_name: string;
  run_timestamp: string;
  config: BacktestRequest;
  metrics: BacktestPerformanceMetrics;
  in_sample_metrics?: BacktestPerformanceMetrics | null;
  out_of_sample_metrics?: BacktestPerformanceMetrics | null;
  trades: BacktestTrade[];
  equity_curve: BacktestEquityPoint[];
  assumptions: string[];
  data_quality_notes: string[];
}

export interface StrategyComparisonItem {
  strategy_name: string;
  description: string;
  total_return_pct: number;
  cagr_pct: number;
  win_rate_pct: number;
  profit_factor: number;
  expectancy_pkr: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  total_trades: number;
  avg_holding_days: number;
}

export interface StrategyComparisonResponse {
  strategies: StrategyComparisonItem[];
  benchmark_name: string;
  benchmark_return_pct: number;
  benchmark_max_drawdown_pct: number;
  start_date: string;
  end_date: string;
}

export interface BacktestPreset {
  id: string;
  name: string;
  description: string;
  params: Partial<BacktestRequest>;
}

// ==================== Trade Journal & Risk Management ====================

export type TradeDirection = "BUY" | "SELL";
export type TradeStatus = "OPEN" | "CLOSED";
export type ExitReason = "TARGET_1" | "TARGET_2" | "STOP_LOSS" | "DISCRETIONARY" | "TIME_EXPIRY" | "TRAILING_STOP";

export interface JournalTradeCreate {
  symbol: string;
  company_name?: string;
  sector?: string;
  direction?: TradeDirection;
  quantity: number;
  entry_price: number;
  entry_date: string;
  stop_loss?: number;
  target_1?: number;
  target_2?: number;
  strategy?: string;
  setup_type?: string;
  signal_id?: string;
  brokerage_commission_rate?: number;
  notes?: string;
}

export interface JournalTradeClose {
  exit_price: number;
  exit_date: string;
  exit_reason: ExitReason;
  closing_notes?: string;
}

export interface JournalTradeUpdate {
  stop_loss?: number;
  target_1?: number;
  target_2?: number;
  strategy?: string;
  notes?: string;
}

export interface JournalTrade {
  id: string;
  symbol: string;
  company_name: string;
  sector: string;
  direction: TradeDirection;
  status: TradeStatus;
  quantity: number;
  entry_price: number;
  entry_date: string;
  stop_loss?: number;
  target_1?: number;
  target_2?: number;
  exit_price?: number;
  exit_date?: string;
  exit_date_str?: string;
  exit_reason?: string;
  strategy: string;
  setup_type: string;
  signal_id?: string;
  position_value: number;
  brokerage_commission_rate: number;
  total_charges: number;
  gross_pnl: number;
  net_pnl: number;
  return_percent: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface RiskSettings {
  trading_capital: number;
  max_risk_per_trade_pct: number;
  max_daily_loss_pct: number;
  max_open_positions: number;
  max_sector_exposure_pct: number;
  max_single_position_pct: number;
  commission_rate_pct: number;
}

export interface RiskCalculationRequest {
  symbol: string;
  entry_price: number;
  stop_loss: number;
  target_1?: number;
  target_2?: number;
  capital_override?: number;
  risk_pct_override?: number;
}

export interface RiskCalculationResult {
  symbol: string;
  entry_price: number;
  stop_loss: number;
  stop_loss_distance_pkr: number;
  stop_loss_distance_pct: number;
  risk_amount_pkr: number;
  recommended_shares: number;
  recommended_position_value: number;
  position_size_pct_of_capital: number;
  target_1?: number;
  target_1_rr?: number;
  target_1_potential_pkr?: number;
  target_2?: number;
  target_2_rr?: number;
  target_2_potential_pkr?: number;
  estimated_commission_pkr: number;
  warnings: string[];
}

export interface RiskWarning {
  type: "INFO" | "WARNING" | "DANGER";
  category: string;
  message: string;
}

export interface PortfolioExposure {
  trading_capital: number;
  allocated_capital: number;
  remaining_cash: number;
  exposure_pct: number;
  open_positions_count: number;
  max_positions_limit: number;
  daily_realized_pnl: number;
  daily_pnl_pct: number;
  max_daily_loss_limit_pkr: number;
  is_daily_loss_breached: boolean;
  sector_exposure: Record<string, number>;
  warnings: RiskWarning[];
}

export interface StrategyPerformanceItem {
  strategy: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_pct: number;
  net_pnl: number;
  profit_factor: number;
  avg_return_pct: number;
}

export interface MonthlyPerformanceItem {
  month_label: string;
  trades_count: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_pct: number;
  gross_profit: number;
  gross_loss: number;
  net_pnl: number;
  total_commissions: number;
}

export interface PerformanceAnalyticsReport {
  total_trades: number;
  open_trades_count: number;
  closed_trades_count: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;
  win_rate_pct: number;
  gross_profit_pkr: number;
  gross_loss_pkr: number;
  total_commissions_pkr: number;
  net_profit_pkr: number;
  average_winner_pkr: number;
  average_winner_pct: number;
  average_loser_pkr: number;
  average_loser_pct: number;
  win_loss_ratio: number;
  profit_factor: number;
  expectancy_pkr: number;
  expectancy_pct: number;
  max_drawdown_pkr: number;
  max_drawdown_pct: number;
  largest_winning_trade_pkr: number;
  largest_losing_trade_pkr: number;
  average_holding_days: number;
  strategy_breakdown: StrategyPerformanceItem[];
  monthly_performance: MonthlyPerformanceItem[];
  signal_conversion_rate_pct: number;
  total_system_signals_generated: number;
  signals_converted_to_trades: number;
}

// ==================== User Authentication & Settings ====================

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  display_name?: string;
  created_at: string;
  is_active: boolean;
}

export interface UserSettings {
  user_id: string;
  theme: string;
  default_capital: number;
  default_risk_pct: number;
  default_timeframe: string;
  sound_alerts_enabled: boolean;
  telegram_notifications_enabled: boolean;
  browser_notifications_enabled: boolean;
  auto_refresh_interval_sec: number;
  updated_at?: string;
}

export interface UserSettingsUpdate {
  theme?: string;
  default_capital?: number;
  default_risk_pct?: number;
  default_timeframe?: string;
  sound_alerts_enabled?: boolean;
  telegram_notifications_enabled?: boolean;
  browser_notifications_enabled?: boolean;
  auto_refresh_interval_sec?: number;
}

// ==================== Phase 2: Sector Rotation & Macro Regime ====================

export type SectorRotationQuadrant = "LEADING" | "WEAKENING" | "LAGGING" | "IMPROVING";

export interface SectorPerformance {
  sector: string;
  company_count: number;
  total_volume: number;
  total_volume_formatted: string;
  total_turnover_pkr: number;
  total_turnover_formatted: string;
  average_change_percent: number;
  weighted_change_percent: number;
  relative_strength_vs_kse100: number;
  advances: number;
  declines: number;
  unchanged: number;
  quadrant: SectorRotationQuadrant;
  quadrant_label: string;
  top_stock_symbol: string;
  top_stock_change_pct: number;
  is_shariah_eligible: boolean;
}

export type MacroMarketRegime =
  | "BULL_MOMENTUM"
  | "BULL_CONSOLIDATION"
  | "NEUTRAL_RANGE"
  | "CORRECTION_RISK"
  | "BEAR_TREND";

export interface MacroRegimeReport {
  regime: MacroMarketRegime;
  regime_title: string;
  market_risk_mode: string;
  recommended_posture: string;
  score_threshold_adjustment: number;
  index_name: string;
  index_value: number;
  index_change: number;
  index_change_percent: number;
  advances_declines_ratio: number;
  leading_sectors: string[];
  lagging_sectors: string[];
  institutional_guidance: string;
  timestamp: string;
}

// ==================== Phase 3: Institutional Order Bracket & Slippage ====================

export interface OrderBracketSimulationRequest {
  symbol: string;
  price: number;
  quantity: number;
  stop_loss?: number;
  target_1?: number;
  target_2?: number;
  is_filer?: boolean;
  is_day_trade?: boolean;
}

export interface OrderBracketSimulationResponse {
  symbol: string;
  nominal_price: number;
  quantity: number;
  nominal_trade_value: number;
  estimated_slippage_pct: number;
  estimated_slippage_pkr: number;
  effective_entry_price: number;
  effective_capital_required: number;
  brokerage_commission_pkr: number;
  secp_turnover_levy_pkr: number;
  cvt_pkr: number;
  nccpl_charge_pkr: number;
  wht_pkr: number;
  total_statutory_charges_pkr: number;
  breakeven_price: number;
  breakeven_buffer_pct: number;
  target1_gross_profit_pkr: number;
  target1_net_profit_pkr: number;
  target1_net_return_pct: number;
  risk_pkr: number;
  risk_reward_ratio: number;
  tax_filer_status: string;
}

// ==================== Phase 4: SCSTrade Fast-Order & FIX 4.2 ====================

export interface ExecutionSafetyCheck {
  rule: string;
  passed: boolean;
  detail: string;
}

export interface FastOrderTicket {
  ticket_id: string;
  symbol: string;
  action: "BUY" | "SELL";
  price: number;
  quantity: number;
  order_type: "LIMIT" | "MARKET" | "STOP_LIMIT";
  stop_loss_trigger?: number;
  target_price?: number;
  client_code: string;
  scstrade_quick_string: string;
  fix_42_message: string;
  fix_tags: Record<string, string>;
  safety_checks: ExecutionSafetyCheck[];
  all_safety_checks_passed: boolean;
  generated_at: string;
}

// ==================== Phase 5: Smart Money & Institutional Flow (FIPI/LIPI) ====================

export interface SectorInstitutionalFlow {
  sector: string;
  fipi_net_pkr_millions: number;
  mutual_funds_net_pkr_millions: number;
  banks_net_pkr_millions: number;
  insurance_net_pkr_millions: number;
  companies_net_pkr_millions: number;
  retail_individuals_net_pkr_millions: number;
  brokers_net_pkr_millions: number;
  smart_money_net_pkr_millions: number;
  flow_regime: string;
  retail_trap_detected: boolean;
  sentiment_label: string;
  top_institutional_targets: string[];
}

export interface SmartMoneyFlowReport {
  trading_date: string;
  market_fipi_net_usd_millions: number;
  market_fipi_net_pkr_millions: number;
  market_mutual_funds_net_pkr_millions: number;
  market_retail_net_pkr_millions: number;
  market_smart_money_net_pkr_millions: number;
  dominant_participant: string;
  institutional_stance: string;
  sector_flows: SectorInstitutionalFlow[];
  high_conviction_accumulation_sectors: string[];
  retail_trap_sectors: string[];
  timestamp: string;
}

// ==================== Phase 6: Profit Locker & Dynamic Trailing Stop ====================

export interface PartialScaleOutLeg {
  leg_name: string;
  quantity: number;
  exit_price: number;
  gross_pnl_pkr: number;
  net_pnl_pkr: number;
  net_return_pct: number;
  execution_status: "PENDING" | "EXECUTED" | "ACTIVE_RUNNER";
}

export interface ProfitLockerPlanRequest {
  symbol: string;
  entry_price: number;
  current_price: number;
  highest_price_reached?: number;
  quantity?: number;
  stop_loss: number;
  target_1: number;
  target_2: number;
  atr_14?: number;
  is_filer?: boolean;
}

export interface ProfitLockerPlanResponse {
  symbol: string;
  entry_price: number;
  current_price: number;
  unrealized_gain_pct: number;
  initial_stop_loss: number;
  active_trailing_stop: number;
  breakeven_price: number;
  is_breakeven_locked: boolean;
  scale_out_phase: string;
  recommended_action: string;
  trade_risk_status: "RISK_ACTIVE" | "RISK_FREE_BREAKEVEN" | "PROFIT_LOCKED";
  scale_out_legs: PartialScaleOutLeg[];
  blended_target_profit_pkr: number;
  blended_target_return_pct: number;
  total_statutory_fees_pkr: number;
  guidance: string;
}

// ==================== Phase 7: PSX Intraday Timing Windows & Session Playbook ====================

export interface SessionPhaseReport {
  session_phase: string;
  phase_title: string;
  is_market_open: boolean;
  is_prime_window: boolean;
  is_friday: boolean;
  current_time_pkt: string;
  window_start: string;
  window_end: string;
  minutes_remaining_in_phase: number;
  score_adjustment: number;
  execution_bias: string;
  institutional_playbook: string;
  actionable_rule: string;
}

// ==================== Phase 8: Volume Profile & Value Area ====================

export interface VolumeProfileBin {
  price_level: number;
  volume: number;
  volume_percent: number;
  is_poc: boolean;
  is_in_value_area: boolean;
}

export interface VolumeProfileReport {
  symbol: string;
  current_price: number;
  point_of_control_poc: number;
  value_area_high_vah: number;
  value_area_low_val: number;
  total_volume_profiled: number;
  price_position_vs_value_area: string;
  auction_setup: string;
  auction_guidance: string;
  bins: VolumeProfileBin[];
}

// ==================== Phase 9: Corporate Actions & Earnings Calendar ====================

export interface CorporateActionItem {
  symbol: string;
  company_name: string;
  event_type: string;
  announcement_date: string;
  event_date: string;
  days_until_event: number;
  is_high_risk_window: boolean;
  details: string;
  action_guidance: string;
}

export interface CorporateActionsCalendarReport {
  as_of_date: string;
  total_upcoming_events: number;
  high_risk_events_count: number;
  events: CorporateActionItem[];
  symbol_risk_map: Record<string, string>;
}


