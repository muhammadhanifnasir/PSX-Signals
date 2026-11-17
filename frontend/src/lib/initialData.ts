import {
  MarketStatus,
  MarketMoversResponse,
  SignalOverviewResponse,
  ScannerResponse,
  OpportunitiesResponse,
  StockOpportunity,
  ScanRunSummary,
  ScannerThresholds
} from "./types";

export const LIVE_DISCLAIMER = "OFFICIAL PSX DATA PORTAL LIVE FEED (~15m delayed via DPS) - NOT FINANCIAL ADVICE";

export const initialMarketStatus: MarketStatus = {
  status: "OPEN",
  index_name: "KSE-100 Index",
  current_value: 0.0,
  change: 0.0,
  change_percent: 0.0,
  high: 0.0,
  low: 0.0,
  volume: 0,
  volume_formatted: "0.00M",
  turnover_pkr: 0.0,
  turnover_formatted: "PKR 0.00",
  previous_close: 0.0,
  market_breadth: {
    advances: 0,
    declines: 0,
    unchanged: 0,
    total_traded: 0,
  },
  stocks_scanned_count: 0,
  active_signals_count: 0,
  strong_opportunities_count: 0,
  data_freshness_seconds: 0,
  last_updated: "",
  is_mock: false,
  disclaimer: LIVE_DISCLAIMER,
};

export const initialMarketMovers: MarketMoversResponse = {
  gainers: [],
  losers: [],
  volume_leaders: [],
  timestamp: "",
  is_mock: false,
  disclaimer: LIVE_DISCLAIMER,
};

export const initialSignals: SignalOverviewResponse = {
  total_signals: 0,
  strong_buy_count: 0,
  buy_count: 0,
  hold_count: 0,
  sell_count: 0,
  watch_count: 0,
  wait_count: 0,
  exit_count: 0,
  signals: [],
  timestamp: "",
  is_mock: false,
  disclaimer: LIVE_DISCLAIMER,
};

export const initialOpportunities: OpportunitiesResponse = {
  top_opportunities: [],
  timestamp: "",
  is_mock: false,
  disclaimer: LIVE_DISCLAIMER,
};

export const initialScannerResults: ScannerResponse = {
  total_scanned: 0,
  matches_count: 0,
  scan_timestamp: "",
  filters_applied: {
    min_volume: 100000,
    min_turnover: 5000000,
    min_score: 60,
  },
  results: [],
  is_mock: false,
  disclaimer: LIVE_DISCLAIMER,
};

export const initialRealOpportunities: StockOpportunity[] = [];

export const initialScanRunSummary: ScanRunSummary = {
  id: "INIT-SCAN",
  scan_timestamp: "",
  total_universe_count: 500,
  eligible_stocks_scanned: 0,
  stale_stocks_rejected: 0,
  invalid_data_rejected: 0,
  opportunities_found: 0,
  active_filters: {},
  provider_used: "OFFICIAL PSX DATA PORTAL (DPS)",
  data_delay: "DELAYED_15MIN",
  execution_time_ms: 0,
  status: "IDLE",
  error_message: null,
};

export const initialScannerThresholds: ScannerThresholds = {
  min_volume: 100000,
  min_turnover_pkr: 5000000,
  min_price: 1.0,
  max_price: 2000.0,
  min_change_percent: -10.0,
  max_change_percent: 10.0,
  min_relative_volume: 1.2,
  min_rsi: 40.0,
  max_rsi: 78.0,
  min_momentum_score: 50,
  min_opportunity_score: 60,
  late_entry_buffer_pct: 1.5,
  max_stale_data_seconds: 1800,
};
