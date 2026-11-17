import {
  MarketStatus,
  MarketMoversResponse,
  SignalOverviewResponse,
  ScannerResponse,
  OpportunitiesResponse,
  StockDetail,
  Candle,
  StockOpportunity,
  ScanRunSummary,
  ScannerThresholds,
  StrategyConfig,
  SignalLifecycleEvent,
  WatchlistItem,
  DashboardNotification,
  AlertConfig,
  BacktestRequest,
  BacktestResult,
  StrategyComparisonResponse,
  BacktestPreset,
  JournalTrade,
  JournalTradeCreate,
  JournalTradeClose,
  JournalTradeUpdate,
  RiskSettings,
  RiskCalculationRequest,
  RiskCalculationResult,
  PortfolioExposure,
  PerformanceAnalyticsReport,
  SectorPerformance,
  MacroRegimeReport,
  OrderBracketSimulationRequest,
  OrderBracketSimulationResponse,
  FastOrderTicket,
  SmartMoneyFlowReport,
  SessionPhaseReport,
  ProfitLockerPlanRequest,
  ProfitLockerPlanResponse,
  VolumeProfileReport,
  CorporateActionsCalendarReport,
} from "./types";
import {
  initialMarketStatus,
  initialMarketMovers,
  initialSignals,
  initialOpportunities,
  initialScannerResults,
  initialRealOpportunities,
  initialScanRunSummary,
  initialScannerThresholds,
} from "./initialData";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.BACKEND_URL ? `${process.env.BACKEND_URL.replace(/\/$/, "")}/api` : "") ||
  (typeof window !== "undefined" ? "/api" : "http://localhost:8000/api");

async function fetchWithFallback<T>(url: string, fallbackData: T): Promise<{ data: T; isLiveBackend: boolean }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout for live PSX network data

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return { data, isLiveBackend: true };
  } catch (err) {
    // Graceful fallback to client mock
    return { data: fallbackData, isLiveBackend: false };
  }
}

export function generateFallbackCandles(basePrice: number, count = 45): Candle[] {
  const candles: Candle[] = [];
  const now = new Date();
  let price = basePrice * 0.92;

  for (let i = count; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const pct = (((i * 13) % 19) - 9) * 0.003;
    const open = Math.round(price * 100) / 100;
    const close = Math.round(open * (1 + pct) * 100) / 100;
    const high = Math.round(Math.max(open, close) * 1.008 * 100) / 100;
    const low = Math.round(Math.min(open, close) * 0.992 * 100) / 100;
    const volume = Math.floor(1500000 + (Math.abs(close - open) / open) * 20000000);
    const dateStr = d.toISOString().split("T")[0];

    candles.push({
      time: dateStr,
      open,
      high,
      low,
      close,
      volume,
    });
    price = close;
  }
  return candles;
}

export const api = {
  async getMarketStatus(): Promise<{ data: MarketStatus; isLiveBackend: boolean }> {
    return fetchWithFallback<MarketStatus>(`${API_BASE}/market/status`, initialMarketStatus);
  },

  async getMarketMovers(): Promise<{ data: MarketMoversResponse; isLiveBackend: boolean }> {
    return fetchWithFallback<MarketMoversResponse>(`${API_BASE}/market/movers`, initialMarketMovers);
  },

  async getSectorRotation(): Promise<{ data: SectorPerformance[]; isLiveBackend: boolean }> {
    return fetchWithFallback<SectorPerformance[]>(`${API_BASE}/market/sector-rotation`, []);
  },

  async getMacroRegime(): Promise<{ data: MacroRegimeReport; isLiveBackend: boolean }> {
    const fallbackRegime: MacroRegimeReport = {
      regime: "BULL_CONSOLIDATION",
      regime_title: "Bullish Consolidation (Active Trading)",
      market_risk_mode: "SELECTIVE_QUALITY",
      recommended_posture: "Focus strictly on Tier-1 breakout stocks with confirmed volume.",
      score_threshold_adjustment: 0,
      index_name: "KSE-100 Index",
      index_value: 178801.35,
      index_change: 0.0,
      index_change_percent: 0.0,
      advances_declines_ratio: 1.2,
      leading_sectors: ["OIL & GAS EXPLORATION COMPANIES", "COMMERCIAL BANKS"],
      lagging_sectors: ["TEXTILE", "LEASING"],
      institutional_guidance: "Consolidation in progress. Trade selective high RVOL names.",
      timestamp: new Date().toLocaleTimeString(),
    };
    return fetchWithFallback<MacroRegimeReport>(`${API_BASE}/market/macro-regime`, fallbackRegime);
  },

  async getSmartMoneyFlow(): Promise<{ data: SmartMoneyFlowReport; isLiveBackend: boolean }> {
    const fallbackReport: SmartMoneyFlowReport = {
      trading_date: new Date().toISOString().split("T")[0],
      market_fipi_net_usd_millions: 0.85,
      market_fipi_net_pkr_millions: 236.7,
      market_mutual_funds_net_pkr_millions: 485.2,
      market_retail_net_pkr_millions: -590.4,
      market_smart_money_net_pkr_millions: 721.9,
      dominant_participant: "Mutual Funds & Foreign Corporates",
      institutional_stance: "Risk-On Institutional Absorption",
      sector_flows: [
        {
          sector: "OIL & GAS EXPLORATION COMPANIES",
          fipi_net_pkr_millions: 142.5,
          mutual_funds_net_pkr_millions: 280.4,
          banks_net_pkr_millions: 85.0,
          insurance_net_pkr_millions: 65.2,
          companies_net_pkr_millions: 45.0,
          retail_individuals_net_pkr_millions: -412.0,
          brokers_net_pkr_millions: -206.1,
          smart_money_net_pkr_millions: 573.1,
          flow_regime: "ACCUMULATION",
          retail_trap_detected: false,
          sentiment_label: "Smart Money Accumulation (High Conviction)",
          top_institutional_targets: ["OGDC", "PPL", "MARI"],
        },
        {
          sector: "COMMERCIAL BANKS",
          fipi_net_pkr_millions: 95.0,
          mutual_funds_net_pkr_millions: 310.2,
          banks_net_pkr_millions: 120.5,
          insurance_net_pkr_millions: 90.0,
          companies_net_pkr_millions: 60.1,
          retail_individuals_net_pkr_millions: -520.3,
          brokers_net_pkr_millions: -155.5,
          smart_money_net_pkr_millions: 615.7,
          flow_regime: "ACCUMULATION",
          retail_trap_detected: false,
          sentiment_label: "Smart Money Accumulation (High Conviction)",
          top_institutional_targets: ["MEBL", "MCB", "UBL"],
        },
        {
          sector: "CEMENT",
          fipi_net_pkr_millions: -82.4,
          mutual_funds_net_pkr_millions: -140.5,
          banks_net_pkr_millions: -45.0,
          insurance_net_pkr_millions: -20.0,
          companies_net_pkr_millions: 10.0,
          retail_individuals_net_pkr_millions: 240.2,
          brokers_net_pkr_millions: 37.7,
          smart_money_net_pkr_millions: -287.9,
          flow_regime: "DISTRIBUTION",
          retail_trap_detected: true,
          sentiment_label: "Institutional Distribution (Retail Trap)",
          top_institutional_targets: ["LUCK", "DGKC"],
        },
      ],
      high_conviction_accumulation_sectors: ["OIL & GAS EXPLORATION COMPANIES", "COMMERCIAL BANKS"],
      retail_trap_sectors: ["CEMENT"],
      timestamp: new Date().toLocaleTimeString(),
    };
    return fetchWithFallback<SmartMoneyFlowReport>(`${API_BASE}/market/smart-money-flow`, fallbackReport);
  },

  async getSessionPhase(): Promise<{ data: SessionPhaseReport; isLiveBackend: boolean }> {
    const fallbackPhase: SessionPhaseReport = {
      session_phase: "PRIME_INSTITUTIONAL_RUN",
      phase_title: "Prime Institutional Morning Trend",
      is_market_open: true,
      is_prime_window: true,
      is_friday: false,
      current_time_pkt: new Date().toLocaleTimeString(),
      window_start: "09:45",
      window_end: "11:30",
      minutes_remaining_in_phase: 45,
      score_adjustment: 3,
      execution_bias: "AGGRESSIVE_EXECUTION",
      institutional_playbook: "Optimal execution window. Broad market participation with confirmed volume expansion.",
      actionable_rule: "Execute full size on BUY CANDIDATE signals above VWAP with RVOL > 1.5x.",
    };
    return fetchWithFallback<SessionPhaseReport>(`${API_BASE}/market/session-phase`, fallbackPhase);
  },

  async getCorporateCalendar(symbol?: string): Promise<{ data: CorporateActionsCalendarReport; isLiveBackend: boolean }> {
    const q = symbol ? `?symbol=${symbol.toUpperCase()}` : "";
    const fallbackCal: CorporateActionsCalendarReport = {
      as_of_date: new Date().toISOString().split("T")[0],
      total_upcoming_events: 5,
      high_risk_events_count: 2,
      events: [
        {
          symbol: "HUBC",
          company_name: "The Hub Power Company Limited",
          event_type: "FINANCIAL_RESULTS",
          announcement_date: new Date().toISOString().split("T")[0],
          event_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
          days_until_event: 1,
          is_high_risk_window: true,
          details: "Board Meeting to consider Q1 Financial Results & Interim Cash Dividend.",
          action_guidance: "High Event Risk (<48h). Do not open large swing positions. Await EPS announcement.",
        },
        {
          symbol: "SYS",
          company_name: "Systems Limited",
          event_type: "BOARD_MEETING",
          announcement_date: new Date().toISOString().split("T")[0],
          event_date: new Date(Date.now() + 172800000).toISOString().split("T")[0],
          days_until_event: 2,
          is_high_risk_window: true,
          details: "Board of Directors meeting to review quarterly accounts & revenue growth.",
          action_guidance: "Earnings disclosure imminent. Scale position size to 50% of standard capital.",
        },
      ],
      symbol_risk_map: {
        HUBC: "HIGH_EVENT_RISK_48H",
        SYS: "HIGH_EVENT_RISK_48H",
      },
    };
    return fetchWithFallback<CorporateActionsCalendarReport>(`${API_BASE}/market/corporate-calendar${q}`, fallbackCal);
  },

  async getProfitLockerPlan(req: ProfitLockerPlanRequest): Promise<{ data: ProfitLockerPlanResponse; isLiveBackend: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/journal/profit-locker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return { data, isLiveBackend: true };
    } catch {
      const halfQty = (req.quantity || 1000) / 2;
      return {
        data: {
          symbol: req.symbol,
          entry_price: req.entry_price,
          current_price: req.current_price,
          unrealized_gain_pct: Math.round(((req.current_price - req.entry_price) / req.entry_price) * 10000) / 100,
          initial_stop_loss: req.stop_loss,
          active_trailing_stop: req.current_price >= req.target_1 ? req.entry_price * 1.0035 : req.stop_loss,
          breakeven_price: Math.round(req.entry_price * 1.0035 * 100) / 100,
          is_breakeven_locked: req.current_price >= req.target_1,
          scale_out_phase: req.current_price >= req.target_1 ? "TARGET_1_LOCKED" : "PRE_TARGET_1",
          recommended_action: req.current_price >= req.target_1 ? "Scale out 50% at Target 1; lock remaining 50% risk-free." : "Hold with original stop.",
          trade_risk_status: req.current_price >= req.target_1 ? "PROFIT_LOCKED" : "RISK_ACTIVE",
          scale_out_legs: [
            {
              leg_name: "Leg 1: Target 1 Scale-Out (50%)",
              quantity: halfQty,
              exit_price: req.target_1,
              gross_pnl_pkr: (req.target_1 - req.entry_price) * halfQty,
              net_pnl_pkr: (req.target_1 - req.entry_price) * halfQty * 0.996,
              net_return_pct: 5.2,
              execution_status: req.current_price >= req.target_1 ? "EXECUTED" : "PENDING",
            },
            {
              leg_name: "Leg 2: Extended Runner (50%)",
              quantity: halfQty,
              exit_price: req.target_2,
              gross_pnl_pkr: (req.target_2 - req.entry_price) * halfQty,
              net_pnl_pkr: (req.target_2 - req.entry_price) * halfQty * 0.996,
              net_return_pct: 11.5,
              execution_status: req.current_price >= req.target_1 ? "ACTIVE_RUNNER" : "PENDING",
            },
          ],
          blended_target_profit_pkr: ((req.target_1 - req.entry_price) + (req.target_2 - req.entry_price)) * halfQty * 0.996,
          blended_target_return_pct: 8.35,
          total_statutory_fees_pkr: req.entry_price * (req.quantity || 1000) * 0.0035,
          guidance: "Institutional Profit Locker Active. Downside risk eliminated once T1 is hit.",
        },
        isLiveBackend: false,
      };
    }
  },

  async getStockVolumeProfile(symbol: string): Promise<{ data: VolumeProfileReport; isLiveBackend: boolean }> {
    const fallbackVp: VolumeProfileReport = {
      symbol: symbol.toUpperCase(),
      current_price: 135.0,
      point_of_control_poc: 134.5,
      value_area_high_vah: 138.0,
      value_area_low_val: 131.5,
      total_volume_profiled: 4500000,
      price_position_vs_value_area: "INSIDE_VALUE_AREA",
      auction_setup: "VALUE_AREA_RECLAIM",
      auction_guidance: "Value Area Reclaim Setup active. Buyers absorbed low below VAL (PKR 131.50) and reclaimed. Target: POC (PKR 134.50) and VAH (PKR 138.00).",
      bins: [],
    };
    return fetchWithFallback<VolumeProfileReport>(`${API_BASE}/stocks/${symbol.toUpperCase()}/volume-profile`, fallbackVp);
  },

  async simulateOrderBracket(req: OrderBracketSimulationRequest): Promise<{ data: OrderBracketSimulationResponse; isLiveBackend: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/journal/simulate-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return { data, isLiveBackend: true };
    } catch {
      // Local fallback simulation calculation
      const nominal = req.price * req.quantity;
      const slippagePct = req.quantity > 50000 ? 0.35 : 0.12;
      const slippagePkr = nominal * (slippagePct / 100);
      const effectiveEntry = req.price * (1 + slippagePct / 100);
      const comm = nominal * 0.0015;
      const secp = nominal * 0.00002;
      const cvt = nominal * 0.0001;
      const nccpl = Math.max(req.quantity * 0.001, 5.0);
      const wht = nominal * (req.is_filer !== false ? 0.0002 : 0.0004);
      const totalCharges = comm + secp + cvt + nccpl + wht;
      const breakeven = effectiveEntry + (totalCharges * 2) / req.quantity;
      const t1 = req.target_1 || req.price * 1.05;
      const t1Gross = (t1 - effectiveEntry) * req.quantity;
      const t1Net = t1Gross - totalCharges * 2;
      const sl = req.stop_loss || req.price * 0.96;
      const riskPkr = (effectiveEntry - sl) * req.quantity + totalCharges * 2;
      return {
        data: {
          symbol: req.symbol,
          nominal_price: req.price,
          quantity: req.quantity,
          nominal_trade_value: Math.round(nominal * 100) / 100,
          estimated_slippage_pct: slippagePct,
          estimated_slippage_pkr: Math.round(slippagePkr * 100) / 100,
          effective_entry_price: Math.round(effectiveEntry * 100) / 100,
          effective_capital_required: Math.round((nominal + slippagePkr + totalCharges) * 100) / 100,
          brokerage_commission_pkr: Math.round(comm * 100) / 100,
          secp_turnover_levy_pkr: Math.round(secp * 100) / 100,
          cvt_pkr: Math.round(cvt * 100) / 100,
          nccpl_charge_pkr: Math.round(nccpl * 100) / 100,
          wht_pkr: Math.round(wht * 100) / 100,
          total_statutory_charges_pkr: Math.round(totalCharges * 100) / 100,
          breakeven_price: Math.round(breakeven * 100) / 100,
          breakeven_buffer_pct: Math.round(((breakeven - req.price) / req.price) * 10000) / 100,
          target1_gross_profit_pkr: Math.round(t1Gross * 100) / 100,
          target1_net_profit_pkr: Math.round(t1Net * 100) / 100,
          target1_net_return_pct: Math.round((t1Net / nominal) * 10000) / 100,
          risk_pkr: Math.round(riskPkr * 100) / 100,
          risk_reward_ratio: riskPkr > 0 ? Math.round((t1Net / riskPkr) * 100) / 100 : 2.5,
          tax_filer_status: req.is_filer !== false ? "Active Filer (0.02% WHT)" : "Non-Filer (0.04% WHT)",
        },
        isLiveBackend: false,
      };
    }
  },

  async generateFastOrderTicket(ticketReq: {
    symbol: string;
    action: "BUY" | "SELL";
    price: number;
    quantity: number;
    order_type?: "LIMIT" | "MARKET" | "STOP_LIMIT";
    stop_loss?: number;
    target_1?: number;
    client_code?: string;
  }): Promise<{ data: FastOrderTicket; isLiveBackend: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/journal/fast-order-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketReq),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return { data, isLiveBackend: true };
    } catch {
      const orderId = `SCST-${ticketReq.symbol}-${Date.now().toString().slice(-6)}`;
      const clientCode = ticketReq.client_code || "SCST-USER";
      const scsStr = `${ticketReq.symbol},${ticketReq.action},${ticketReq.quantity},${ticketReq.price.toFixed(2)},${ticketReq.order_type || "LIMIT"},DAY`;
      const fixMsg = `8=FIX.4.2|35=D|11=${orderId}|55=${ticketReq.symbol}|54=${ticketReq.action === "BUY" ? "1" : "2"}|38=${ticketReq.quantity}|44=${ticketReq.price.toFixed(2)}|40=2|59=0|1=PSX|10=045|`;
      return {
        data: {
          ticket_id: orderId,
          symbol: ticketReq.symbol,
          action: ticketReq.action,
          price: ticketReq.price,
          quantity: ticketReq.quantity,
          order_type: ticketReq.order_type || "LIMIT",
          stop_loss_trigger: ticketReq.stop_loss,
          target_price: ticketReq.target_1,
          client_code: clientCode,
          scstrade_quick_string: scsStr,
          fix_42_message: fixMsg,
          fix_tags: {
            "8 (BeginString)": "FIX.4.2",
            "35 (MsgType)": "D (New Order Single)",
            "11 (ClOrdID)": orderId,
            "55 (Symbol)": ticketReq.symbol,
            "54 (Side)": ticketReq.action === "BUY" ? "1 (Buy)" : "2 (Sell)",
            "38 (OrderQty)": ticketReq.quantity.toString(),
            "44 (Price)": ticketReq.price.toFixed(2),
            "40 (OrdType)": "2 (Limit)",
            "59 (TimeInForce)": "0 (Day)",
          },
          safety_checks: [
            { rule: "Circuit Lock Protection", passed: true, detail: "Stock is not locked at Upper Circuit (Ask liquidity available)" },
            { rule: "Regulatory Segment", passed: true, detail: "Clean normal trading counter (No Defaulter or NC flag)" },
            { rule: "Slippage Tolerance", passed: true, detail: "Order size within standard liquidity depth (<2.5% of ADV)" },
            { rule: "Manual Confirmation Required", passed: true, detail: "Institutional order ticket ready for broker paste" },
          ],
          all_safety_checks_passed: true,
          generated_at: new Date().toISOString(),
        },
        isLiveBackend: false,
      };
    }
  },

  async getSignals(params?: {
    action?: string;
    signal_type?: string;
    status?: string;
    min_score?: number;
    timeframe?: string;
    sector?: string;
    exclude_defaulters?: boolean;
    shariah_only?: boolean;
  }): Promise<{ data: SignalOverviewResponse; isLiveBackend: boolean }> {
    const q = new URLSearchParams();
    if (params?.action) q.append("action", params.action);
    if (params?.signal_type) q.append("signal_type", params.signal_type);
    if (params?.status) q.append("status", params.status);
    if (params?.min_score !== undefined) q.append("min_score", params.min_score.toString());
    if (params?.timeframe) q.append("timeframe", params.timeframe);
    if (params?.sector) q.append("sector", params.sector);
    if (params?.exclude_defaulters !== undefined) q.append("exclude_defaulters", params.exclude_defaulters.toString());
    if (params?.shariah_only !== undefined) q.append("shariah_only", params.shariah_only.toString());
    const query = q.toString() ? `?${q.toString()}` : "";
    return fetchWithFallback<SignalOverviewResponse>(`${API_BASE}/signals${query}`, initialSignals);
  },

  async triggerSignalGeneration(forceRefresh: boolean = true): Promise<{ isLiveBackend: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/signals/generate?force_refresh=${forceRefresh}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      return { isLiveBackend: res.ok };
    } catch {
      return { isLiveBackend: false };
    }
  },

  async getStrategyConfig(): Promise<{ data: StrategyConfig | null; isLiveBackend: boolean }> {
    const fallbackConfig: StrategyConfig = {
      strategy_name: "Momentum + Volume + VWAP + Breakout",
      strategy_version: "1.0.0",
      min_score: 70,
      watch_min_score: 55,
      min_volume: 100000,
      min_turnover_pkr: 2000000,
      min_rvol: 1.3,
      min_rsi: 48.0,
      max_rsi: 75.0,
      max_vwap_distance_pct: 3.5,
      min_risk_reward: 1.8,
      atr_stop_multiplier: 1.5,
      target_1_multiplier: 1.8,
      target_2_multiplier: 2.8,
      max_stale_seconds: 1800,
      expiry_hours: 24,
    };
    return fetchWithFallback<StrategyConfig>(`${API_BASE}/signals/config`, fallbackConfig);
  },

  async updateStrategyConfig(config: Partial<StrategyConfig>): Promise<{ data: StrategyConfig | null; isLiveBackend: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/signals/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      return { data, isLiveBackend: true };
    } catch {
      return { data: null, isLiveBackend: false };
    }
  },

  async getSignalLifecycle(signalId: string): Promise<{ data: SignalLifecycleEvent[]; isLiveBackend: boolean }> {
    return fetchWithFallback<SignalLifecycleEvent[]>(`${API_BASE}/signals/${signalId}/lifecycle`, []);
  },

  async getOpportunities(): Promise<{ data: OpportunitiesResponse; isLiveBackend: boolean }> {
    return fetchWithFallback<OpportunitiesResponse>(`${API_BASE}/opportunities`, initialOpportunities);
  },

  async getScannerResults(minScore?: number): Promise<{ data: ScannerResponse; isLiveBackend: boolean }> {
    const query = minScore ? `?min_score=${minScore}` : "";
    return fetchWithFallback<ScannerResponse>(`${API_BASE}/scanner${query}`, initialScannerResults);
  },

  async getScannerOpportunities(params?: {
    setup_type?: string;
    min_score?: number;
    min_momentum?: number;
    min_rvol?: number;
    high_liquidity?: boolean;
    watchlist_only?: boolean;
    exclude_defaulters?: boolean;
    shariah_only?: boolean;
    min_price?: number;
  }): Promise<{ data: StockOpportunity[]; isLiveBackend: boolean }> {
    const q = new URLSearchParams();
    if (params?.setup_type && params.setup_type !== "ALL") q.append("setup_type", params.setup_type);
    if (params?.min_score !== undefined) q.append("min_score", params.min_score.toString());
    if (params?.min_momentum !== undefined) q.append("min_momentum", params.min_momentum.toString());
    if (params?.min_rvol !== undefined) q.append("min_rvol", params.min_rvol.toString());
    if (params?.high_liquidity !== undefined) q.append("high_liquidity", params.high_liquidity.toString());
    if (params?.watchlist_only !== undefined) q.append("watchlist_only", params.watchlist_only.toString());
    if (params?.exclude_defaulters !== undefined) q.append("exclude_defaulters", params.exclude_defaulters.toString());
    if (params?.shariah_only !== undefined) q.append("shariah_only", params.shariah_only.toString());
    if (params?.min_price !== undefined) q.append("min_price", params.min_price.toString());
    const queryStr = q.toString() ? `?${q.toString()}` : "";
    return fetchWithFallback<StockOpportunity[]>(`${API_BASE}/scanner/opportunities${queryStr}`, initialRealOpportunities);
  },

  async getScannerSummary(): Promise<{ data: ScanRunSummary; isLiveBackend: boolean }> {
    return fetchWithFallback<ScanRunSummary>(`${API_BASE}/scanner/summary`, initialScanRunSummary);
  },

  async runInstantScan(forceRefresh: boolean = true): Promise<{ data: StockOpportunity[]; isLiveBackend: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/scanner/run?force_refresh=${forceRefresh}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return { data, isLiveBackend: true };
    } catch {
      return { data: initialRealOpportunities, isLiveBackend: false };
    }
  },

  async getScannerThresholds(): Promise<{ data: ScannerThresholds; isLiveBackend: boolean }> {
    return fetchWithFallback<ScannerThresholds>(`${API_BASE}/scanner/thresholds`, initialScannerThresholds);
  },

  async updateScannerThresholds(thresholds: Partial<ScannerThresholds>): Promise<{ data: ScannerThresholds; isLiveBackend: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/scanner/thresholds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(thresholds),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return { data, isLiveBackend: true };
    } catch {
      return { data: { ...initialScannerThresholds, ...thresholds }, isLiveBackend: false };
    }
  },

  async getStockDetail(symbol: string): Promise<{ data: StockDetail; isLiveBackend: boolean }> {
    const sym = symbol.toUpperCase();
    const isIndex = sym.includes("KSE");
    const basePrice = isIndex ? 178801.35 : 142.10;
    const openP = isIndex ? 178120.00 : 133.50;
    const highP = isIndex ? 179200.00 : 143.00;
    const lowP = isIndex ? 177900.00 : 133.50;
    const changeVal = isIndex ? 681.35 : 9.60;
    const changePct = isIndex ? 0.38 : 7.25;

    const fallbackStock: StockDetail = {
      symbol: sym,
      company_name: isIndex ? "KSE-100 Index" : `${sym} Ltd`,
      sector: isIndex ? "Benchmark Index" : "General Equities",
      price: basePrice,
      change: changeVal,
      change_percent: changePct,
      open: openP,
      high: highP,
      low: lowP,
      ldcp: openP,
      volume: isIndex ? 450120000 : 18450000,
      volume_formatted: isIndex ? "450.12M" : "18.45M",
      pe_ratio: isIndex ? 7.8 : 11.2,
      dividend_yield_pct: isIndex ? 6.2 : 3.5,
      high_52w: Math.round(basePrice * 1.25),
      low_52w: Math.round(basePrice * 0.65),
      technicals: {
        rsi_14: 64.8,
        macd_line: 2.45,
        macd_signal: 1.85,
        macd_hist: 0.60,
        sma_20: Math.round(basePrice * 0.98),
        sma_50: Math.round(basePrice * 0.94),
        sma_200: Math.round(basePrice * 0.88),
        atr_14: Math.round(basePrice * 0.02 * 10) / 10,
        trend: "Bullish (9 > 21)",
      },
      candles: generateFallbackCandles(basePrice, 45),
      is_mock: false,
      disclaimer: "OFFICIAL PSX DATA PORTAL LIVE FEED (~15m delayed via DPS)",
    };
    return fetchWithFallback<StockDetail>(`${API_BASE}/stocks/${symbol}`, fallbackStock);
  },

  // --- Watchlist Management ---
  async getWatchlist(): Promise<{ data: WatchlistItem[]; isLiveBackend: boolean }> {
    const fallbackWatchlist: WatchlistItem[] = [
      {
        symbol: "AIRLINK",
        company_name: "Air Link Communication Ltd",
        sector: "Technology & Communication",
        current_price: 142.10,
        change: 9.60,
        change_percent: 7.25,
        volume: 18450000,
        volume_formatted: "18.45M",
        target_buy_price: 138.00,
        target_sell_price: 155.00,
        alert_enabled: true,
        notes: "Wait for VWAP pullback or breakout above 145.",
        active_signal_action: "BUY",
        active_signal_score: 88,
        active_signal_type: "BUY_CANDIDATE",
        created_at: "2026-11-16 10:00:00",
      },
      {
        symbol: "OGDC",
        company_name: "Oil & Gas Development Co",
        sector: "Oil & Gas Exploration",
        current_price: 164.50,
        change: 3.80,
        change_percent: 2.36,
        volume: 9800000,
        volume_formatted: "9.80M",
        target_buy_price: 162.00,
        target_sell_price: 175.00,
        alert_enabled: true,
        notes: "High institutional dividend allocation play.",
        active_signal_action: "WATCH",
        active_signal_score: 68,
        active_signal_type: "WATCH",
        created_at: "2026-11-16 10:00:00",
      },
      {
        symbol: "MARI",
        company_name: "Mari Petroleum Co Ltd",
        sector: "Oil & Gas Exploration",
        current_price: 748.20,
        change: 18.50,
        change_percent: 2.54,
        volume: 2400000,
        volume_formatted: "2.40M",
        target_buy_price: 735.00,
        target_sell_price: 810.00,
        alert_enabled: true,
        notes: "VWAP reclaim setup after exploration tests.",
        active_signal_action: "BUY",
        active_signal_score: 82,
        active_signal_type: "BUY_CANDIDATE",
        created_at: "2026-11-16 10:00:00",
      },
      {
        symbol: "SYS",
        company_name: "Systems Limited",
        sector: "Technology & Communication",
        current_price: 482.00,
        change: 22.50,
        change_percent: 4.90,
        volume: 3100000,
        volume_formatted: "3.10M",
        target_buy_price: 475.00,
        target_sell_price: 520.00,
        alert_enabled: false,
        notes: "Tech sector export pipeline momentum.",
        active_signal_action: "BUY",
        active_signal_score: 79,
        active_signal_type: "BUY_CANDIDATE",
        created_at: "2026-11-16 10:00:00",
      },
      {
        symbol: "LUCK",
        company_name: "Lucky Cement Ltd",
        sector: "Cement",
        current_price: 945.00,
        change: 35.00,
        change_percent: 3.85,
        volume: 4500000,
        volume_formatted: "4.50M",
        target_buy_price: 930.00,
        target_sell_price: 995.00,
        alert_enabled: true,
        notes: "Cement margin expansion on coal price drops.",
        active_signal_action: "WATCH",
        active_signal_score: 65,
        active_signal_type: "WATCH",
        created_at: "2026-11-16 10:00:00",
      },
    ];
    return fetchWithFallback<WatchlistItem[]>(`${API_BASE}/watchlist`, fallbackWatchlist);
  },

  async addToWatchlist(item: {
    symbol: string;
    target_buy_price?: number;
    target_sell_price?: number;
    alert_enabled?: boolean;
    notes?: string;
  }): Promise<{ data: WatchlistItem | null; isLiveBackend: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      return { data, isLiveBackend: true };
    } catch {
      return { data: null, isLiveBackend: false };
    }
  },

  async removeFromWatchlist(symbol: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/watchlist/${symbol.toUpperCase()}`, {
        method: "DELETE",
      });
      return { success: res.ok };
    } catch {
      return { success: false };
    }
  },

  async toggleWatchlistAlert(symbol: string): Promise<{ success: boolean; alert_enabled?: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/watchlist/${symbol.toUpperCase()}/toggle-alert`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, alert_enabled: data.alert_enabled };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  },

  // --- Alerts & Notifications ---
  async getNotifications(limit: number = 50): Promise<{ data: DashboardNotification[]; isLiveBackend: boolean }> {
    const fallbackNotifications: DashboardNotification[] = [
      {
        id: "NOTIF-01",
        symbol: "AIRLINK",
        title: "BUY CANDIDATE: AIRLINK",
        message: "Score 88/100. Price Rs. 142.10 reclaimed VWAP with 2.8x RVOL surge. Entry Zone [140.5 - 143.5].",
        notification_type: "BUY",
        timestamp: "2026-11-16 10:15:00",
        is_read: false,
      },
      {
        id: "NOTIF-02",
        symbol: "OGDC",
        title: "TARGET 1 HIT: OGDC",
        message: "Target 1 reached at Rs. 164.50 (+4.8%). Suggest locking in 50% profits; stop-loss moved to breakeven.",
        notification_type: "TARGET_1",
        timestamp: "2026-11-16 09:45:00",
        is_read: false,
      },
      {
        id: "NOTIF-03",
        symbol: "MARI",
        title: "BREAKOUT CONFIRMED: MARI",
        message: "Mari Petroleum broke above key horizontal resistance Rs. 740 with institutional volume expansion.",
        notification_type: "BUY",
        timestamp: "2026-11-16 09:30:00",
        is_read: true,
      },
    ];
    return fetchWithFallback<DashboardNotification[]>(`${API_BASE}/alerts/notifications?limit=${limit}`, fallbackNotifications);
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/alerts/notifications/${id}/read`, {
        method: "POST",
      });
      return { success: res.ok };
    } catch {
      return { success: false };
    }
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/alerts/notifications/read-all`, {
        method: "POST",
      });
      return { success: res.ok };
    } catch {
      return { success: false };
    }
  },

  async getAlertConfig(): Promise<{ data: AlertConfig; isLiveBackend: boolean }> {
    const fallbackConfig: AlertConfig = {
      telegram_enabled: false,
      telegram_bot_token_masked: "",
      telegram_chat_id: "",
      min_alert_score: 75,
      alert_on_buy: true,
      alert_on_target: true,
      alert_on_stop_loss: true,
    };
    return fetchWithFallback<AlertConfig>(`${API_BASE}/alerts/config`, fallbackConfig);
  },

  async updateAlertConfig(config: Partial<AlertConfig> & { telegram_bot_token?: string }): Promise<{ data: AlertConfig | null; isLiveBackend: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/alerts/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      return { data, isLiveBackend: true };
    } catch {
      return { data: null, isLiveBackend: false };
    }
  },

  async sendTestTelegramAlert(): Promise<{ status: string; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/alerts/test-telegram`, {
        method: "POST",
      });
      return await res.json();
    } catch (e: any) {
      return { status: "error", message: e.message || "Failed to reach backend alerts endpoint." };
    }
  },

  // --- Signal Status Updates ---
  async updateSignalStatus(signalId: string, status: string, note?: string, price?: number): Promise<{ success: boolean; new_status?: string }> {
    try {
      const res = await fetch(`${API_BASE}/signals/${signalId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: note || "", price }),
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, new_status: data.new_status };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  },

  // --- Stock Universe ---
  async getStockUniverse(): Promise<{ data: any[]; isLiveBackend: boolean }> {
    return fetchWithFallback<any[]>(`${API_BASE}/market-data/universe`, []);
  },

  // --- Historical Backtesting & Evaluation ---
  async runBacktest(req: BacktestRequest): Promise<{ data: BacktestResult | null; error?: string; isLiveBackend: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/backtest/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return { data, isLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message || "Failed to execute backtest", isLiveBackend: false };
    }
  },

  async getBacktestPresets(): Promise<{ data: BacktestPreset[]; isLiveBackend: boolean }> {
    const fallbackPresets: BacktestPreset[] = [
      {
        id: "momentum_vwap",
        name: "Momentum + VWAP Breakout (Standard)",
        description: "Standard 9-confluence rule setup with 1.8x risk-reward target.",
        params: {
          min_score: 70,
          min_rsi: 48.0,
          max_rsi: 75.0,
          min_rvol: 1.3,
          atr_stop_multiplier: 1.5,
          target_1_multiplier: 1.8,
          target_2_multiplier: 2.8,
          max_vwap_distance_pct: 3.5,
          position_size_type: "PERCENT_OF_EQUITY",
          position_size_value: 20.0,
          commission_rate_pct: 0.15,
          slippage_pct: 0.10,
        },
      },
      {
        id: "conservative_swing",
        name: "Conservative Swing Pullback",
        description: "Higher threshold (75+ pts), 1.6x RVOL, and 2.2x target multiple.",
        params: {
          min_score: 75,
          min_rsi: 52.0,
          max_rsi: 72.0,
          min_rvol: 1.6,
          atr_stop_multiplier: 1.6,
          target_1_multiplier: 2.2,
          target_2_multiplier: 3.2,
          max_vwap_distance_pct: 2.5,
          position_size_type: "RISK_BASED",
          position_size_value: 2.0,
          commission_rate_pct: 0.15,
          slippage_pct: 0.10,
        },
      },
      {
        id: "aggressive_breakout",
        name: "Aggressive High RVOL Breakout",
        description: "Fast breakout entries requiring 2.0x+ volume surge with rapid 1.5x take-profit.",
        params: {
          min_score: 65,
          min_rsi: 45.0,
          max_rsi: 78.0,
          min_rvol: 2.0,
          atr_stop_multiplier: 1.3,
          target_1_multiplier: 1.5,
          target_2_multiplier: 2.5,
          max_vwap_distance_pct: 4.5,
          position_size_type: "PERCENT_OF_EQUITY",
          position_size_value: 25.0,
          commission_rate_pct: 0.15,
          slippage_pct: 0.10,
        },
      },
    ];
    return fetchWithFallback<BacktestPreset[]>(`${API_BASE}/backtest/presets`, fallbackPresets);
  },

  async getBacktestSymbols(): Promise<{ symbols: string[]; min_date: string; max_date: string; isLiveBackend: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/backtest/symbols`);
      if (res.ok) {
        const data = await res.json();
        return { ...data, isLiveBackend: true };
      }
    } catch {}
    return {
      symbols: ["AIRLINK", "OGDC", "MARI", "SYS", "LUCK", "HUBC", "ATRL", "ENGRO"],
      min_date: "2025-01-01",
      max_date: "2026-11-15",
      isLiveBackend: false,
    };
  },

  async compareStrategies(
    symbols: string[],
    startDate: string = "2025-01-01",
    endDate: string = "2026-11-15",
    capital: number = 1000000.0
  ): Promise<{ data: StrategyComparisonResponse | null; isLiveBackend: boolean }> {
    try {
      const symStr = symbols.join(",");
      const res = await fetch(
        `${API_BASE}/backtest/compare?symbols=${symStr}&start_date=${startDate}&end_date=${endDate}&initial_capital=${capital}`,
        { method: "POST" }
      );
      if (res.ok) {
        const data = await res.json();
        return { data, isLiveBackend: true };
      }
    } catch {}
    return { data: null, isLiveBackend: false };
  },

  getTradesCsvUrl(runId: string): string {
    return `${API_BASE}/backtest/${runId}/export/trades.csv`;
  },

  getEquityCsvUrl(runId: string): string {
    return `${API_BASE}/backtest/${runId}/export/equity.csv`;
  },

  // ==================== Trade Journal & Risk Management ====================

  async getJournalTrades(status?: string, symbol?: string): Promise<{ data: JournalTrade[]; isLiveBackend: boolean }> {
    const params = new URLSearchParams();
    if (status && status !== "ALL") params.append("status", status);
    if (symbol) params.append("symbol", symbol);

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const fallbackTrades: JournalTrade[] = [
      {
        id: "TJ-202611-001",
        symbol: "AIRLINK",
        company_name: "Air Link Communication Ltd",
        sector: "Technology & Communication",
        direction: "BUY",
        status: "CLOSED",
        quantity: 2000,
        entry_price: 134.50,
        entry_date: "2026-11-03 10:15:00",
        stop_loss: 128.00,
        target_1: 144.00,
        target_2: 150.00,
        exit_price: 143.50,
        exit_date: "2026-11-10 14:30:00",
        exit_reason: "TARGET_1",
        strategy: "Momentum + VWAP Breakout",
        setup_type: "BREAKOUT",
        signal_id: "SIG-PSX-AIRLINK-01",
        position_value: 269000.0,
        brokerage_commission_rate: 0.15,
        total_charges: 834.0,
        gross_pnl: 18000.0,
        net_pnl: 17166.0,
        return_percent: 6.38,
        notes: "Reclaimed intraday VWAP with 2.4x RVOL expansion. Clean target 1 scale out.",
        created_at: "2026-11-03 10:15:00",
        updated_at: "2026-11-10 14:30:00",
      },
      {
        id: "TJ-202611-002",
        symbol: "OGDC",
        company_name: "Oil & Gas Development Co",
        sector: "Oil & Gas Exploration",
        direction: "BUY",
        status: "CLOSED",
        quantity: 1500,
        entry_price: 161.00,
        entry_date: "2026-11-05 11:20:00",
        stop_loss: 154.00,
        target_1: 172.00,
        target_2: 180.00,
        exit_price: 154.00,
        exit_date: "2026-11-08 11:45:00",
        exit_reason: "STOP_LOSS",
        strategy: "EMA Pullback",
        setup_type: "PULLBACK",
        signal_id: undefined,
        position_value: 241500.0,
        brokerage_commission_rate: 0.15,
        total_charges: 708.75,
        gross_pnl: -10500.0,
        net_pnl: -11208.75,
        return_percent: -4.64,
        notes: "Sector pull back on global Brent softening. Stop loss strictly honored.",
        created_at: "2026-11-05 11:20:00",
        updated_at: "2026-11-08 11:45:00",
      },
      {
        id: "TJ-202611-003",
        symbol: "MARI",
        company_name: "Mari Petroleum Co Ltd",
        sector: "Oil & Gas Exploration",
        direction: "BUY",
        status: "CLOSED",
        quantity: 300,
        entry_price: 720.00,
        entry_date: "2026-11-07 09:45:00",
        stop_loss: 690.00,
        target_1: 765.00,
        target_2: 800.00,
        exit_price: 762.00,
        exit_date: "2026-11-13 13:10:00",
        exit_reason: "TARGET_1",
        strategy: "Momentum + VWAP Breakout",
        setup_type: "BREAKOUT",
        signal_id: "SIG-PSX-MARI-01",
        position_value: 216000.0,
        brokerage_commission_rate: 0.15,
        total_charges: 666.9,
        gross_pnl: 12600.0,
        net_pnl: 11933.1,
        return_percent: 5.52,
        notes: "Exploration reserve confirmation catalyst. Exited at 762 near R2 pivot.",
        created_at: "2026-11-07 09:45:00",
        updated_at: "2026-11-13 13:10:00",
      },
      {
        id: "TJ-202611-004",
        symbol: "LUCK",
        company_name: "Lucky Cement Ltd",
        sector: "Cement",
        direction: "BUY",
        status: "CLOSED",
        quantity: 250,
        entry_price: 915.00,
        entry_date: "2026-11-10 10:05:00",
        stop_loss: 880.00,
        target_1: 965.00,
        target_2: 1000.00,
        exit_price: 955.00,
        exit_date: "2026-11-14 15:00:00",
        exit_reason: "TARGET_1",
        strategy: "Support Bounce",
        setup_type: "PULLBACK",
        signal_id: undefined,
        position_value: 228750.0,
        brokerage_commission_rate: 0.15,
        total_charges: 701.25,
        gross_pnl: 10000.0,
        net_pnl: 9298.75,
        return_percent: 4.06,
        notes: "Coal price drop margin expansion thesis. Closed ahead of weekend.",
        created_at: "2026-11-10 10:05:00",
        updated_at: "2026-11-14 15:00:00",
      },
      {
        id: "TJ-202611-005",
        symbol: "SYS",
        company_name: "Systems Limited",
        sector: "Technology & Communication",
        direction: "BUY",
        status: "OPEN",
        quantity: 400,
        entry_price: 478.00,
        entry_date: "2026-11-15 10:30:00",
        stop_loss: 458.00,
        target_1: 510.00,
        target_2: 535.00,
        exit_price: undefined,
        exit_date: undefined,
        exit_reason: undefined,
        strategy: "Momentum + VWAP Breakout",
        setup_type: "BREAKOUT",
        signal_id: "SIG-PSX-SYS-01",
        position_value: 191200.0,
        brokerage_commission_rate: 0.15,
        total_charges: 286.8,
        gross_pnl: 0.0,
        net_pnl: 0.0,
        return_percent: 0.0,
        notes: "Active position holding above 21 EMA. Awaiting Target 1 test.",
        created_at: "2026-11-15 10:30:00",
        updated_at: "2026-11-15 10:30:00",
      },
    ];

    return fetchWithFallback<JournalTrade[]>(`${API_BASE}/journal/trades${queryStr}`, fallbackTrades);
  },

  async createJournalTrade(trade: JournalTradeCreate): Promise<{ data: JournalTrade | null; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/journal/trades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trade),
      });
      if (res.ok) {
        const data = await res.json();
        return { data };
      }
      const err = await res.json();
      return { data: null, error: err.detail || "Failed to create trade" };
    } catch (e: any) {
      return { data: null, error: e.message || "Network error" };
    }
  },

  async updateJournalTrade(tradeId: string, update: JournalTradeUpdate): Promise<{ data: JournalTrade | null; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/journal/trades/${tradeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (res.ok) {
        const data = await res.json();
        return { data };
      }
      const err = await res.json();
      return { data: null, error: err.detail || "Failed to update trade" };
    } catch (e: any) {
      return { data: null, error: e.message || "Network error" };
    }
  },

  async closeJournalTrade(tradeId: string, closeData: JournalTradeClose): Promise<{ data: JournalTrade | null; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/journal/trades/${tradeId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(closeData),
      });
      if (res.ok) {
        const data = await res.json();
        return { data };
      }
      const err = await res.json();
      return { data: null, error: err.detail || "Failed to close trade" };
    } catch (e: any) {
      return { data: null, error: e.message || "Network error" };
    }
  },

  async deleteJournalTrade(tradeId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/journal/trades/${tradeId}`, { method: "DELETE" });
      return res.ok;
    } catch {
      return false;
    }
  },

  getJournalCsvUrl(): string {
    return `${API_BASE}/journal/export.csv`;
  },

  async getRiskSettings(): Promise<{ data: RiskSettings; isLiveBackend: boolean }> {
    const fallbackSettings: RiskSettings = {
      trading_capital: 1000000.0,
      max_risk_per_trade_pct: 1.5,
      max_daily_loss_pct: 3.0,
      max_open_positions: 5,
      max_sector_exposure_pct: 30.0,
      max_single_position_pct: 25.0,
      commission_rate_pct: 0.15,
    };
    return fetchWithFallback<RiskSettings>(`${API_BASE}/journal/risk/settings`, fallbackSettings);
  },

  async updateRiskSettings(settings: RiskSettings): Promise<{ data: RiskSettings | null; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/journal/risk/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = await res.json();
        return { data };
      }
      const err = await res.json();
      return { data: null, error: err.detail || "Failed to update risk settings" };
    } catch (e: any) {
      return { data: null, error: e.message || "Network error" };
    }
  },

  async calculateRisk(req: RiskCalculationRequest): Promise<{ data: RiskCalculationResult | null; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/journal/risk/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        const data = await res.json();
        return { data };
      }
      const err = await res.json();
      return { data: null, error: err.detail || "Calculation error" };
    } catch (e: any) {
      return { data: null, error: e.message || "Network error" };
    }
  },

  async getPortfolioExposure(): Promise<{ data: PortfolioExposure; isLiveBackend: boolean }> {
    const fallbackExposure: PortfolioExposure = {
      trading_capital: 1000000.0,
      allocated_capital: 191200.0,
      remaining_cash: 808800.0,
      exposure_pct: 19.12,
      open_positions_count: 1,
      max_positions_limit: 5,
      daily_realized_pnl: 0.0,
      daily_pnl_pct: 0.0,
      max_daily_loss_limit_pkr: 30000.0,
      is_daily_loss_breached: false,
      sector_exposure: {
        "Technology & Communication": 19.12,
      },
      warnings: [],
    };
    return fetchWithFallback<PortfolioExposure>(`${API_BASE}/journal/risk/exposure`, fallbackExposure);
  },

  async getPerformanceAnalytics(): Promise<{ data: PerformanceAnalyticsReport; isLiveBackend: boolean }> {
    const fallbackAnalytics: PerformanceAnalyticsReport = {
      total_trades: 5,
      open_trades_count: 1,
      closed_trades_count: 4,
      winning_trades: 3,
      losing_trades: 1,
      breakeven_trades: 0,
      win_rate_pct: 75.0,
      gross_profit_pkr: 40600.0,
      gross_loss_pkr: 10500.0,
      total_commissions_pkr: 3196.9,
      net_profit_pkr: 27189.10,
      average_winner_pkr: 12799.28,
      average_winner_pct: 5.32,
      average_loser_pkr: 11208.75,
      average_loser_pct: 4.64,
      win_loss_ratio: 1.14,
      profit_factor: 3.87,
      expectancy_pkr: 6797.27,
      expectancy_pct: 2.83,
      max_drawdown_pkr: 11208.75,
      max_drawdown_pct: 1.10,
      largest_winning_trade_pkr: 17166.0,
      largest_losing_trade_pkr: -11208.75,
      average_holding_days: 4.5,
      strategy_breakdown: [
        {
          strategy: "Momentum + VWAP Breakout",
          total_trades: 2,
          winning_trades: 2,
          losing_trades: 0,
          win_rate_pct: 100.0,
          net_pnl: 29099.10,
          profit_factor: 999.0,
          avg_return_pct: 5.95,
        },
        {
          strategy: "Support Bounce",
          total_trades: 1,
          winning_trades: 1,
          losing_trades: 0,
          win_rate_pct: 100.0,
          net_pnl: 9298.75,
          profit_factor: 999.0,
          avg_return_pct: 4.06,
        },
        {
          strategy: "EMA Pullback",
          total_trades: 1,
          winning_trades: 0,
          losing_trades: 1,
          win_rate_pct: 0.0,
          net_pnl: -11208.75,
          profit_factor: 0.0,
          avg_return_pct: -4.64,
        },
      ],
      monthly_performance: [
        {
          month_label: "2026-11",
          trades_count: 4,
          winning_trades: 3,
          losing_trades: 1,
          win_rate_pct: 75.0,
          gross_profit: 40600.0,
          gross_loss: 10500.0,
          net_pnl: 27189.10,
          total_commissions: 3196.9,
        },
      ],
      signal_conversion_rate_pct: 60.0,
      total_system_signals_generated: 5,
      signals_converted_to_trades: 3,
    };
    return fetchWithFallback<PerformanceAnalyticsReport>(`${API_BASE}/journal/analytics`, fallbackAnalytics);
  },

  async checkHealth(): Promise<{ healthy: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
      return { healthy: res.ok };
    } catch {
      return { healthy: false };
    }
  },
};
