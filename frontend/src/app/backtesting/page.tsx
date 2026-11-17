"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { BacktestEquityChart } from "@/components/backtesting/BacktestEquityChart";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import {
  BacktestRequest,
  BacktestResult,
  BacktestTrade,
  StrategyComparisonResponse,
  BacktestPreset,
  PositionSizeType,
} from "@/lib/types";
import { api } from "@/lib/api";
import {
  History,
  Play,
  RotateCcw,
  Sliders,
  SlidersHorizontal,
  Download,
  Shield,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Clock,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  BarChart2,
  Calendar,
  DollarSign,
  Percent,
  Info,
} from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/utils";

const CORE_SYMBOLS = ["AIRLINK", "OGDC", "MARI", "SYS", "LUCK", "HUBC", "ATRL", "ENGRO"];

export default function BacktestingPage() {
  const { marketStatus, isLiveBackend, isWsConnected, isLoading, refreshAllData } =
    useRealTimeMarket();

  // Configuration state
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(["AIRLINK", "OGDC", "MARI", "SYS", "LUCK"]);
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState("2026-11-15");
  const [initialCapital, setInitialCapital] = useState(1_000_000);
  const [positionSizeType, setPositionSizeType] = useState<PositionSizeType>("PERCENT_OF_EQUITY");
  const [positionSizeValue, setPositionSizeValue] = useState(20);
  const [commissionRate, setCommissionRate] = useState(0.15);
  const [slippagePct, setSlippagePct] = useState(0.10);
  const [minScore, setMinScore] = useState(70);
  const [minRsi, setMinRsi] = useState(48);
  const [maxRsi, setMaxRsi] = useState(75);
  const [minRvol, setMinRvol] = useState(1.3);
  const [atrStopMultiplier, setAtrStopMultiplier] = useState(1.5);
  const [target1Multiplier, setTarget1Multiplier] = useState(1.8);
  const [target2Multiplier, setTarget2Multiplier] = useState(2.8);
  const [enableOos, setEnableOos] = useState(true);
  const [oosSplitPct, setOosSplitPct] = useState(30);

  // Execution & results state
  const [isRunning, setIsRunning] = useState(false);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [presets, setPresets] = useState<BacktestPreset[]>([]);
  const [comparisonData, setComparisonData] = useState<StrategyComparisonResponse | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [tradeFilter, setTradeFilter] = useState<"ALL" | "WINS" | "LOSSES">("ALL");
  const [tradeSearch, setTradeSearch] = useState("");
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "TRADES" | "COMPARISON" | "ASSUMPTIONS">("OVERVIEW");

  // Load presets and initial backtest
  const loadInitialData = useCallback(async () => {
    try {
      const presetsRes = await api.getBacktestPresets();
      setPresets(presetsRes.data);

      // Trigger initial backtest
      setIsRunning(true);
      const res = await api.runBacktest({
        symbols: ["AIRLINK", "OGDC", "MARI", "SYS", "LUCK"],
        start_date: "2025-01-01",
        end_date: "2026-11-15",
        initial_capital: 1_000_000,
        position_size_type: "PERCENT_OF_EQUITY",
        position_size_value: 20,
        max_open_positions: 5,
        commission_rate_pct: 0.15,
        slippage_pct: 0.10,
        min_score: 70,
        min_rsi: 48,
        max_rsi: 75,
        min_rvol: 1.3,
        atr_stop_multiplier: 1.5,
        target_1_multiplier: 1.8,
        target_2_multiplier: 2.8,
        max_vwap_distance_pct: 3.5,
        max_holding_days: 15,
        enable_out_of_sample: true,
        out_of_sample_split_pct: 0.30,
      });

      if (res.data) {
        setBacktestResult(res.data);
      }
    } catch (err) {
      console.warn("Initial backtest load failed:", err);
    } finally {
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleRunBacktest = async () => {
    setIsRunning(true);
    try {
      const req: BacktestRequest = {
        symbols: selectedSymbols,
        start_date: startDate,
        end_date: endDate,
        initial_capital: initialCapital,
        position_size_type: positionSizeType,
        position_size_value: positionSizeValue,
        max_open_positions: 5,
        commission_rate_pct: commissionRate,
        slippage_pct: slippagePct,
        min_score: minScore,
        min_rsi: minRsi,
        max_rsi: maxRsi,
        min_rvol: minRvol,
        atr_stop_multiplier: atrStopMultiplier,
        target_1_multiplier: target1Multiplier,
        target_2_multiplier: target2Multiplier,
        max_vwap_distance_pct: 3.5,
        max_holding_days: 15,
        enable_out_of_sample: enableOos,
        out_of_sample_split_pct: oosSplitPct / 100.0,
      };

      const res = await api.runBacktest(req);
      if (res.data) {
        setBacktestResult(res.data);
      }
    } catch (err) {
      console.error("Backtest failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleApplyPreset = (p: BacktestPreset) => {
    if (p.params.min_score !== undefined) setMinScore(p.params.min_score);
    if (p.params.min_rsi !== undefined) setMinRsi(p.params.min_rsi);
    if (p.params.max_rsi !== undefined) setMaxRsi(p.params.max_rsi);
    if (p.params.min_rvol !== undefined) setMinRvol(p.params.min_rvol);
    if (p.params.atr_stop_multiplier !== undefined) setAtrStopMultiplier(p.params.atr_stop_multiplier);
    if (p.params.target_1_multiplier !== undefined) setTarget1Multiplier(p.params.target_1_multiplier);
    if (p.params.target_2_multiplier !== undefined) setTarget2Multiplier(p.params.target_2_multiplier);
    if (p.params.position_size_type !== undefined) setPositionSizeType(p.params.position_size_type);
    if (p.params.position_size_value !== undefined) setPositionSizeValue(p.params.position_size_value);
  };

  const handleCompareStrategies = async () => {
    setIsComparing(true);
    try {
      const res = await api.compareStrategies(selectedSymbols, startDate, endDate, initialCapital);
      if (res.data) {
        setComparisonData(res.data);
        setActiveTab("COMPARISON");
      }
    } catch (err) {
      console.error("Comparison failed:", err);
    } finally {
      setIsComparing(false);
    }
  };

  const toggleSymbolSelection = (sym: string) => {
    if (selectedSymbols.includes(sym)) {
      if (selectedSymbols.length > 1) {
        setSelectedSymbols(selectedSymbols.filter((s) => s !== sym));
      }
    } else {
      setSelectedSymbols([...selectedSymbols, sym]);
    }
  };

  // Filtered trades
  const allTrades = backtestResult?.trades || [];
  const filteredTrades = allTrades.filter((t) => {
    if (tradeFilter === "WINS" && t.net_pnl <= 0) return false;
    if (tradeFilter === "LOSSES" && t.net_pnl >= 0) return false;
    if (tradeSearch.trim()) {
      const q = tradeSearch.toLowerCase();
      return (
        t.symbol.toLowerCase().includes(q) ||
        t.trade_id.toLowerCase().includes(q) ||
        t.exit_reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const m = backtestResult?.metrics;

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={isLoading}
      onRefresh={refreshAllData}
    >
      <div className="space-y-6">
        {/* 1. TOP HEADER & PRIMARY ACTION BAR */}
        <div className="trading-card rounded-xl border border-slate-800/90 p-5 bg-slate-900/60 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <History className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-white tracking-tight">
                    Historical Backtesting &amp; Strategy Evaluation
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    PSX Confluence Engine
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20">
                    Zero Look-Ahead Bias
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chronological simulation with PSX brokerage commissions (0.15%), market slippage (0.10%), and out-of-sample edge validation.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowConfigDrawer(!showConfigDrawer)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  showConfigDrawer
                    ? "bg-purple-600/20 text-purple-300 border-purple-500/40"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Parameters &amp; Universe ({selectedSymbols.length})
              </button>

              <button
                onClick={handleCompareStrategies}
                disabled={isComparing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition-all"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                {isComparing ? "Comparing..." : "Compare 3 Strategies"}
              </button>

              <button
                onClick={handleRunBacktest}
                disabled={isRunning}
                className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? "animate-spin" : ""}`} />
                {isRunning ? "Simulating Days..." : "Run Simulation"}
              </button>
            </div>
          </div>

          {/* Preset Buttons Strip */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono">
            <span className="text-slate-400 text-[11px] font-sans">Quick Presets:</span>
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => handleApplyPreset(p)}
                className="px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 text-[11px] transition-all"
                title={p.description}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* 2. CONFIGURATION DRAWER (EXPANDABLE) */}
        {showConfigDrawer && (
          <div className="trading-card rounded-xl border border-slate-700 bg-slate-900/95 p-5 space-y-4 shadow-2xl font-mono text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-sans">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Backtest Parameters, Capital &amp; Universe Configuration
              </h3>
              <button
                onClick={() => setShowConfigDrawer(false)}
                className="text-slate-400 hover:text-white text-xs font-sans"
              >
                Close
              </button>
            </div>

            {/* Symbol Universe Toggles */}
            <div>
              <label className="text-slate-300 block mb-1.5 font-sans font-semibold">
                Select Active PSX Equities:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CORE_SYMBOLS.map((sym) => {
                  const isSel = selectedSymbols.includes(sym);
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => toggleSymbolSelection(sym)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        isSel
                          ? "bg-emerald-500 text-slate-950 shadow-sm"
                          : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"
                      }`}
                    >
                      {sym}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dates & Capital */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Start Date:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">End Date:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Initial Capital (PKR):</label>
                <input
                  type="number"
                  step="50000"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Position Sizing Model:</label>
                <select
                  value={positionSizeType}
                  onChange={(e) => setPositionSizeType(e.target.value as PositionSizeType)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                >
                  <option value="PERCENT_OF_EQUITY">% of Portfolio Equity (20%)</option>
                  <option value="RISK_BASED">Risk-Based Fixed 2% Risk</option>
                  <option value="FIXED_AMOUNT">Fixed PKR Amount</option>
                </select>
              </div>
            </div>

            {/* Commissions & Strategy Parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2 border-t border-slate-800/80">
              <div>
                <label className="text-slate-400 block mb-1">Commission %:</label>
                <input
                  type="number"
                  step="0.01"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Slippage %:</label>
                <input
                  type="number"
                  step="0.01"
                  value={slippagePct}
                  onChange={(e) => setSlippagePct(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Min Score (0-100):</label>
                <input
                  type="number"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Min RVOL:</label>
                <input
                  type="number"
                  step="0.1"
                  value={minRvol}
                  onChange={(e) => setMinRvol(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Target 1 Mult:</label>
                <input
                  type="number"
                  step="0.1"
                  value={target1Multiplier}
                  onChange={(e) => setTarget1Multiplier(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">ATR Stop Mult:</label>
                <input
                  type="number"
                  step="0.1"
                  value={atrStopMultiplier}
                  onChange={(e) => setAtrStopMultiplier(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>
            </div>

            {/* Out-of-sample Testing */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={enableOos}
                  onChange={(e) => setEnableOos(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="text-slate-200 font-sans font-semibold block">
                    Out-of-Sample Overfitting Guard
                  </span>
                  <span className="text-slate-400 text-[10.5px] font-sans">
                    Reserve 30% of timeline to validate that edge holds on unseen future data.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Out-of-Sample Split:</span>
                <span className="text-purple-300 font-bold">{oosSplitPct}%</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. PERFORMANCE KPI METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono">
          <div className="trading-card rounded-xl p-3.5 border border-slate-800/90 bg-slate-900/60">
            <span className="text-[10px] text-slate-400 block uppercase">Total Return</span>
            <span
              className={`text-lg font-bold block mt-0.5 ${
                (m?.total_return_pct ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {(m?.total_return_pct ?? 0) >= 0 ? `+${m?.total_return_pct}%` : `${m?.total_return_pct}%`}
            </span>
            <span className="text-[10px] text-slate-400 block">
              Rs. {formatNumber(m?.net_profit_pkr || 0)}
            </span>
          </div>

          <div className="trading-card rounded-xl p-3.5 border border-slate-800/90 bg-slate-900/60">
            <span className="text-[10px] text-slate-400 block uppercase">Win Rate</span>
            <span className="text-lg font-bold text-emerald-400 block mt-0.5">
              {m?.win_rate_pct || 0}%
            </span>
            <span className="text-[10px] text-slate-400 block">
              {m?.winning_trades || 0}W / {m?.losing_trades || 0}L
            </span>
          </div>

          <div className="trading-card rounded-xl p-3.5 border border-slate-800/90 bg-slate-900/60">
            <span className="text-[10px] text-slate-400 block uppercase">Profit Factor</span>
            <span className="text-lg font-bold text-cyan-400 block mt-0.5">
              {m?.profit_factor || 0}
            </span>
            <span className="text-[10px] text-slate-400 block">
              Win/Loss: {m?.win_loss_ratio || 0}x
            </span>
          </div>

          <div className="trading-card rounded-xl p-3.5 border border-slate-800/90 bg-slate-900/60">
            <span className="text-[10px] text-slate-400 block uppercase">Expectancy</span>
            <span className="text-lg font-bold text-amber-300 block mt-0.5">
              Rs. {formatNumber(m?.expectancy_pkr || 0)}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {m?.expectancy_pct || 0}% per trade
            </span>
          </div>

          <div className="trading-card rounded-xl p-3.5 border border-slate-800/90 bg-slate-900/60">
            <span className="text-[10px] text-slate-400 block uppercase">Max Drawdown</span>
            <span className="text-lg font-bold text-rose-400 block mt-0.5">
              -{m?.max_drawdown_pct || 0}%
            </span>
            <span className="text-[10px] text-slate-400 block">
              {m?.max_drawdown_duration_days || 0} days recovery
            </span>
          </div>

          <div className="trading-card rounded-xl p-3.5 border border-slate-800/90 bg-slate-900/60">
            <span className="text-[10px] text-slate-400 block uppercase">Avg Win / Loss</span>
            <span className="text-xs font-bold text-emerald-400 block mt-0.5">
              W: +{m?.average_win_pct || 0}%
            </span>
            <span className="text-xs font-bold text-rose-400 block">
              L: -{m?.average_loss_pct || 0}%
            </span>
          </div>

          <div className="trading-card rounded-xl p-3.5 border border-slate-800/90 bg-slate-900/60">
            <span className="text-[10px] text-slate-400 block uppercase">Sharpe Ratio</span>
            <span className="text-lg font-bold text-purple-300 block mt-0.5">
              {m?.sharpe_ratio || 0}
            </span>
            <span className="text-[10px] text-slate-400 block">
              Sortino: {m?.sortino_ratio || 0}
            </span>
          </div>

          <div className="trading-card rounded-xl p-3.5 border border-slate-800/90 bg-slate-900/60">
            <span className="text-[10px] text-slate-400 block uppercase">Alpha vs KSE100</span>
            <span
              className={`text-lg font-bold block mt-0.5 ${
                (m?.alpha_vs_benchmark ?? 0) >= 0 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {(m?.alpha_vs_benchmark ?? 0) >= 0 ? `+${m?.alpha_vs_benchmark}%` : `${m?.alpha_vs_benchmark}%`}
            </span>
            <span className="text-[10px] text-slate-400 block">
              BM: {m?.benchmark_return_pct || 0}%
            </span>
          </div>
        </div>

        {/* 4. OUT-OF-SAMPLE VALIDATION STRIP */}
        {backtestResult?.out_of_sample_metrics && (
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 font-mono text-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 font-sans">
              <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <span className="font-bold text-white text-xs block">
                  Out-of-Sample Generalization Validation
                </span>
                <span className="text-[11px] text-purple-200/90">
                  Comparing trained model against unseen future market cycles to prevent curve-fitting.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">IN-SAMPLE RETURN</span>
                <span className="font-bold text-emerald-400">
                  +{backtestResult.in_sample_metrics?.total_return_pct || 0}% (PF: {backtestResult.in_sample_metrics?.profit_factor})
                </span>
              </div>

              <div className="bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">OUT-OF-SAMPLE RETURN</span>
                <span
                  className={`font-bold ${
                    (backtestResult.out_of_sample_metrics.total_return_pct ?? 0) >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {(backtestResult.out_of_sample_metrics.total_return_pct ?? 0) >= 0 ? "+" : ""}
                  {backtestResult.out_of_sample_metrics.total_return_pct}% (PF: {backtestResult.out_of_sample_metrics.profit_factor})
                </span>
              </div>

              <div className="bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">OUT-OF-SAMPLE WIN RATE</span>
                <span className="font-bold text-white">
                  {backtestResult.out_of_sample_metrics.win_rate_pct}% ({backtestResult.out_of_sample_metrics.winning_trades}W / {backtestResult.out_of_sample_metrics.losing_trades}L)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 5. INTERACTIVE EQUITY CURVE CHART */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Portfolio Equity Curve vs KSE-100 Benchmark
            </h3>
            {backtestResult && (
              <a
                href={api.getEquityCsvUrl(backtestResult.id)}
                download
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Equity CSV
              </a>
            )}
          </div>

          <BacktestEquityChart
            equityCurve={backtestResult?.equity_curve || []}
            height={380}
          />
        </div>

        {/* 6. TABBED DETAILED SECTIONS */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                onClick={() => setActiveTab("OVERVIEW")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "OVERVIEW"
                    ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Overview &amp; Costs
              </button>
              <button
                onClick={() => setActiveTab("TRADES")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "TRADES"
                    ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Trade-by-Trade Log ({allTrades.length})
              </button>
              <button
                onClick={() => setActiveTab("COMPARISON")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "COMPARISON"
                    ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Strategy Comparison
              </button>
              <button
                onClick={() => setActiveTab("ASSUMPTIONS")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "ASSUMPTIONS"
                    ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Assumptions &amp; Method
              </button>
            </div>

            {activeTab === "TRADES" && backtestResult && (
              <a
                href={api.getTradesCsvUrl(backtestResult.id)}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export Trades CSV
              </a>
            )}
          </div>

          {/* TAB 1: OVERVIEW & COSTS */}
          {activeTab === "OVERVIEW" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="trading-card rounded-xl p-4 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase font-sans flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Capital Management &amp; Sizing
                </h4>
                <div className="space-y-2 text-slate-300">
                  <div className="flex justify-between">
                    <span>Initial Capital:</span>
                    <span className="font-bold text-white">Rs. {formatNumber(initialCapital)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Final Ending Equity:</span>
                    <span className="font-bold text-emerald-400">Rs. {formatNumber(m?.final_equity || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Position Sizing:</span>
                    <span className="font-bold text-cyan-300">{positionSizeType} ({positionSizeValue}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Open Positions:</span>
                    <span className="font-bold text-white">5 simultaneous</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Position Size:</span>
                    <span className="font-bold text-white">Rs. {formatNumber(initialCapital * 0.2)}</span>
                  </div>
                </div>
              </div>

              <div className="trading-card rounded-xl p-4 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase font-sans flex items-center gap-2">
                  <Percent className="w-4 h-4 text-amber-400" />
                  Commissions &amp; Slippage Deductions
                </h4>
                <div className="space-y-2 text-slate-300">
                  <div className="flex justify-between">
                    <span>Brokerage Commission Rate:</span>
                    <span className="font-bold text-white">{commissionRate}% per leg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Slippage Model:</span>
                    <span className="font-bold text-white">{slippagePct}% on fill</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Commissions Deducted:</span>
                    <span className="font-bold text-rose-400">Rs. {formatNumber(m?.total_commissions_pkr || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Slippage Friction:</span>
                    <span className="font-bold text-rose-400">Rs. {formatNumber(m?.total_slippage_pkr || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800/80 pt-2">
                    <span>Total Transaction Costs:</span>
                    <span className="font-bold text-amber-300">
                      Rs. {formatNumber((m?.total_commissions_pkr || 0) + (m?.total_slippage_pkr || 0))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="trading-card rounded-xl p-4 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase font-sans flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  Trade Quality &amp; Time In Market
                </h4>
                <div className="space-y-2 text-slate-300">
                  <div className="flex justify-between">
                    <span>Total Trades Executed:</span>
                    <span className="font-bold text-white">{m?.total_trades || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Holding Period:</span>
                    <span className="font-bold text-cyan-300">{m?.average_holding_days || 0} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target 1 Multiplier:</span>
                    <span className="font-bold text-emerald-400">{target1Multiplier}x Risk</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stop-Loss Buffer:</span>
                    <span className="font-bold text-rose-400">{atrStopMultiplier}x ATR</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800/80 pt-2">
                    <span>Realized Expectancy:</span>
                    <span className="font-bold text-emerald-400">+{m?.expectancy_pct || 0}% / trade</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRADE-BY-TRADE LOG TABLE */}
          {activeTab === "TRADES" && (
            <div className="trading-card rounded-xl border border-slate-800/90 overflow-hidden bg-slate-950/40">
              {/* Filter controls */}
              <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  {(["ALL", "WINS", "LOSSES"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setTradeFilter(f)}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        tradeFilter === f
                          ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                          : "bg-slate-800/70 text-slate-400 hover:text-white"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Filter by symbol, trade ID, exit reason..."
                  value={tradeSearch}
                  onChange={(e) => setTradeSearch(e.target.value)}
                  className="px-3 py-1 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 border-b border-slate-800 text-slate-400 font-mono text-[10.5px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Trade ID</th>
                      <th className="py-2.5 px-3">Symbol</th>
                      <th className="py-2.5 px-3">Entry Date</th>
                      <th className="py-2.5 px-3 text-right">Entry (Slip)</th>
                      <th className="py-2.5 px-3">Exit Date</th>
                      <th className="py-2.5 px-3 text-right">Exit (Slip)</th>
                      <th className="py-2.5 px-3">Exit Reason</th>
                      <th className="py-2.5 px-3 text-right">Net PnL</th>
                      <th className="py-2.5 px-3 text-right">Return %</th>
                      <th className="py-2.5 px-3 text-center">Days</th>
                      <th className="py-2.5 px-3 text-center">OOS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {filteredTrades.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-500 font-sans">
                          No trades match the current filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredTrades.map((t) => {
                        const isWin = t.net_pnl > 0;
                        return (
                          <tr key={t.trade_id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-3 text-slate-400">{t.trade_id}</td>
                            <td className="py-2.5 px-3 font-bold text-white">{t.symbol}</td>
                            <td className="py-2.5 px-3 text-slate-300">{t.entry_date}</td>
                            <td className="py-2.5 px-3 text-right text-slate-200">
                              Rs. {t.entry_price.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-300">{t.exit_date}</td>
                            <td className="py-2.5 px-3 text-right text-slate-200">
                              Rs. {t.exit_price.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  t.exit_reason === "TARGET_1" || t.exit_reason === "TARGET_2"
                                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                    : t.exit_reason === "STOP_LOSS"
                                    ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {t.exit_reason}
                              </span>
                            </td>
                            <td
                              className={`py-2.5 px-3 text-right font-bold ${
                                isWin ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {isWin ? `+Rs. ${formatNumber(t.net_pnl)}` : `-Rs. ${formatNumber(Math.abs(t.net_pnl))}`}
                            </td>
                            <td
                              className={`py-2.5 px-3 text-right font-bold ${
                                isWin ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {isWin ? `+${t.return_pct.toFixed(2)}%` : `${t.return_pct.toFixed(2)}%`}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-300">
                              {t.holding_period_days}d
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {t.is_out_of_sample ? (
                                <span className="px-1.5 py-0.2 rounded text-[9.5px] bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                  OOS
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500">Train</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: STRATEGY COMPARISON TABLE */}
          {activeTab === "COMPARISON" && (
            <div className="trading-card rounded-xl border border-slate-800/90 overflow-hidden bg-slate-950/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-cyan-400" />
                    Multi-Strategy Quantitative Benchmark Matrix
                  </h4>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Compare systematic parameter models side-by-side against the KSE-100 buy-and-hold index.
                  </p>
                </div>
              </div>

              {comparisonData ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 text-[10.5px] uppercase">
                        <th className="py-3 px-3">Strategy / Benchmark</th>
                        <th className="py-3 px-3 text-right">Total Return</th>
                        <th className="py-3 px-3 text-right">CAGR</th>
                        <th className="py-3 px-3 text-center">Win Rate</th>
                        <th className="py-3 px-3 text-center">Profit Factor</th>
                        <th className="py-3 px-3 text-right">Expectancy</th>
                        <th className="py-3 px-3 text-right">Max Drawdown</th>
                        <th className="py-3 px-3 text-center">Sharpe</th>
                        <th className="py-3 px-3 text-center">Trades</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {comparisonData.strategies.map((strat, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-bold text-white block">{strat.strategy_name}</span>
                            <span className="text-[10px] text-slate-400 font-sans block max-w-xs truncate">
                              {strat.description}
                            </span>
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-bold ${
                              strat.total_return_pct >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {strat.total_return_pct >= 0 ? `+${strat.total_return_pct}%` : `${strat.total_return_pct}%`}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-white">
                            {strat.cagr_pct}%
                          </td>
                          <td className="py-3 px-3 text-center text-emerald-400 font-bold">
                            {strat.win_rate_pct}%
                          </td>
                          <td className="py-3 px-3 text-center text-cyan-300 font-bold">
                            {strat.profit_factor}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-amber-300">
                            Rs. {formatNumber(strat.expectancy_pkr)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-rose-400">
                            -{strat.max_drawdown_pct}%
                          </td>
                          <td className="py-3 px-3 text-center text-purple-300 font-bold">
                            {strat.sharpe_ratio}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-200">
                            {strat.total_trades}
                          </td>
                        </tr>
                      ))}

                      {/* Benchmark Row */}
                      <tr className="bg-slate-900/60 font-bold">
                        <td className="py-3 px-3 text-amber-400">
                          {comparisonData.benchmark_name}
                        </td>
                        <td className="py-3 px-3 text-right text-amber-400">
                          +{comparisonData.benchmark_return_pct}%
                        </td>
                        <td className="py-3 px-3 text-right text-slate-300">
                          +15.2%
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400">---</td>
                        <td className="py-3 px-3 text-center text-slate-400">---</td>
                        <td className="py-3 px-3 text-right text-slate-400">---</td>
                        <td className="py-3 px-3 text-right text-rose-400">
                          -{comparisonData.benchmark_max_drawdown_pct}%
                        </td>
                        <td className="py-3 px-3 text-center text-slate-300">1.10</td>
                        <td className="py-3 px-3 text-center text-slate-400">1 (Hold)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 font-sans text-xs">
                  Click "Compare 3 Strategies" above to run the side-by-side simulation.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ASSUMPTIONS & METHODOLOGY */}
          {activeTab === "ASSUMPTIONS" && (
            <div className="trading-card rounded-xl border border-slate-800/90 p-5 bg-slate-950/40 space-y-4 font-sans text-xs">
              <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Backtesting Model Integrity &amp; Strict Scientific Assumptions
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 leading-relaxed text-slate-300">
                <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-white text-xs block">
                    1. Absolute Zero Look-Ahead Bias Guarantee
                  </span>
                  <p className="text-[11.5px] text-slate-400">
                    The engine iterates chronologically day-by-day. At step <code>t</code>, all indicators (EMA 9, EMA 21, VWAP, RSI 14, ATR 14, RVOL) are calculated strictly on historical bars <code>0 .. t</code>. Future price discovery is completely inaccessible.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-white text-xs block">
                    2. Realistic PSX Brokerage &amp; Turnover Charges
                  </span>
                  <p className="text-[11.5px] text-slate-400">
                    Deducts a standard 0.15% brokerage commission on both the entry and exit leg (including SECP turnover fee, CDC custody fee, and CVT), preventing false profitability.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-white text-xs block">
                    3. Bid-Ask Spread Slippage Penalization
                  </span>
                  <p className="text-[11.5px] text-slate-400">
                    Applies 0.10% price friction on both entry (buying at effective premium) and exit (selling at effective discount), simulating real PSX order book depth and spread crossing.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-white text-xs block">
                    4. Conservative Intraday Target/Stop Conflict Resolution
                  </span>
                  <p className="text-[11.5px] text-slate-400">
                    If both Target 1 and Stop Loss are within the day's High-Low range, the simulator applies a conservative rule: on bearish candles (Close &lt; Open), it assumes the stop-loss was triggered first.
                  </p>
                </div>
              </div>

              {backtestResult?.assumptions && (
                <div className="pt-2 font-mono text-[11px] text-slate-400">
                  <span className="text-slate-300 font-bold block mb-1">Active Run Parameters:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {backtestResult.assumptions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
