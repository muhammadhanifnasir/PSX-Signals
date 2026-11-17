"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Percent,
  Calculator,
  TrendingDown,
  DollarSign,
  PieChart,
  Save,
  CheckCircle2,
  Info,
  Layers,
  ArrowRight,
  Activity,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  RiskSettings,
  RiskCalculationRequest,
  RiskCalculationResult,
  PortfolioExposure,
} from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/utils";
import { InstitutionalExecutionModal } from "@/components/trading/InstitutionalExecutionModal";
import { Zap } from "lucide-react";

export default function RiskManagementPage() {
  const { marketStatus, isLiveBackend, isWsConnected, isLoading: marketLoading, refreshAllData } = useRealTimeMarket();

  const [settings, setSettings] = useState<RiskSettings>({
    trading_capital: 1000000.0,
    max_risk_per_trade_pct: 1.5,
    max_daily_loss_pct: 3.0,
    max_open_positions: 5,
    max_sector_exposure_pct: 30.0,
    max_single_position_pct: 25.0,
    commission_rate_pct: 0.15,
  });

  const [exposure, setExposure] = useState<PortfolioExposure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Position Sizing Calculator state
  const [calcSymbol, setCalcSymbol] = useState("AIRLINK");
  const [calcEntry, setCalcEntry] = useState("135.00");
  const [calcStopLoss, setCalcStopLoss] = useState("128.00");
  const [calcTarget1, setCalcTarget1] = useState("145.00");
  const [calcTarget2, setCalcTarget2] = useState("152.00");
  const [calcResult, setCalcResult] = useState<RiskCalculationResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  // Settings form state
  const [formCapital, setFormCapital] = useState("1000000");
  const [formRiskPct, setFormRiskPct] = useState("1.5");
  const [formDailyLossPct, setFormDailyLossPct] = useState("3.0");
  const [formMaxPositions, setFormMaxPositions] = useState("5");
  const [formSectorExposure, setFormSectorExposure] = useState("30.0");
  const [formSinglePos, setFormSinglePos] = useState("25.0");
  const [formCommission, setFormCommission] = useState("0.15");

  const loadRiskData = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, exposureRes] = await Promise.all([
        api.getRiskSettings(),
        api.getPortfolioExposure(),
      ]);
      setSettings(settingsRes.data);
      setExposure(exposureRes.data);

      setFormCapital(settingsRes.data.trading_capital.toString());
      setFormRiskPct(settingsRes.data.max_risk_per_trade_pct.toString());
      setFormDailyLossPct(settingsRes.data.max_daily_loss_pct.toString());
      setFormMaxPositions(settingsRes.data.max_open_positions.toString());
      setFormSectorExposure(settingsRes.data.max_sector_exposure_pct.toString());
      setFormSinglePos(settingsRes.data.max_single_position_pct.toString());
      setFormCommission(settingsRes.data.commission_rate_pct.toString());
    } catch (e) {
      console.error("Failed to load risk management data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRiskData();
  }, []);

  // Run initial calculation when settings load
  useEffect(() => {
    if (settings) {
      handleCalculate();
    }
  }, [settings]);

  const handleCalculate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const entry = parseFloat(calcEntry);
    const sl = parseFloat(calcStopLoss);
    if (!calcSymbol || isNaN(entry) || entry <= 0 || isNaN(sl) || sl <= 0) return;

    setCalcLoading(true);
    const req: RiskCalculationRequest = {
      symbol: calcSymbol.trim().toUpperCase(),
      entry_price: entry,
      stop_loss: sl,
      target_1: calcTarget1 ? parseFloat(calcTarget1) : undefined,
      target_2: calcTarget2 ? parseFloat(calcTarget2) : undefined,
    };

    const res = await api.calculateRisk(req);
    if (res.data) {
      setCalcResult(res.data);
    }
    setCalcLoading(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: RiskSettings = {
      trading_capital: parseFloat(formCapital) || 1000000.0,
      max_risk_per_trade_pct: parseFloat(formRiskPct) || 1.5,
      max_daily_loss_pct: parseFloat(formDailyLossPct) || 3.0,
      max_open_positions: parseInt(formMaxPositions) || 5,
      max_sector_exposure_pct: parseFloat(formSectorExposure) || 30.0,
      max_single_position_pct: parseFloat(formSinglePos) || 25.0,
      commission_rate_pct: parseFloat(formCommission) || 0.15,
    };

    const res = await api.updateRiskSettings(updated);
    if (res.data) {
      setSettings(res.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadRiskData();
    } else {
      alert(`Error saving settings: ${res.error}`);
    }
  };

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={marketLoading}
      onRefresh={() => {
        refreshAllData();
        loadRiskData();
      }}
    >
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="trading-card rounded-xl border border-slate-800 p-5 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-950/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white tracking-tight">Risk Center & Capital Preservation</h1>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                    Active Circuit Breakers
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated position sizing mathematical engine, sector exposure thresholds, and daily loss circuit breakers.
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-mono flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Trading Capital: PKR {formatNumber(settings.trading_capital, 0)}
            </div>
          </div>
        </div>

        {/* Active Risk Warnings Banner */}
        {exposure && exposure.warnings.length > 0 && (
          <div className="space-y-2">
            {exposure.warnings.map((w, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs ${w.type === "DANGER"
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  }`}
              >
                {w.type === "DANGER" ? (
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold uppercase tracking-wider text-[11px] mb-0.5">
                    {w.category.replace(/_/g, " ")}
                  </div>
                  <div>{w.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Portfolio Exposure & Health Card */}
        {exposure && (
          <div className="trading-card rounded-xl border border-slate-800 p-5 bg-slate-900/60">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-400" />
                <h2 className="text-sm font-bold text-white">Live Portfolio Exposure & Capital Utilization</h2>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {exposure.open_positions_count} of {exposure.max_positions_limit} Positions Open
              </span>
            </div>

            {/* Capital Progress Bar */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">
                  Allocated Capital: <strong className="text-white">PKR {formatNumber(exposure.allocated_capital, 0)}</strong> ({exposure.exposure_pct}%)
                </span>
                <span className="text-slate-400">
                  Free Cash: <strong className="text-emerald-400">PKR {formatNumber(exposure.remaining_cash, 0)}</strong>
                </span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 flex">
                <div
                  className="h-full bg-teal-500 transition-all duration-500"
                  style={{ width: `${Math.min(exposure.exposure_pct, 100)}%` }}
                />
                <div
                  className="h-full bg-slate-800"
                  style={{ width: `${Math.max(100 - exposure.exposure_pct, 0)}%` }}
                />
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block font-medium">Daily Realized PnL</span>
                <div className={`text-base font-mono font-bold mt-1 ${exposure.daily_realized_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  PKR {formatNumber(exposure.daily_realized_pnl, 2)}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Cap: -PKR {formatNumber(exposure.max_daily_loss_limit_pkr, 0)} ({settings.max_daily_loss_pct}%)
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block font-medium">Daily Circuit Status</span>
                <div className="text-base font-mono font-bold mt-1 text-emerald-400 flex items-center gap-1.5">
                  {exposure.is_daily_loss_breached ? (
                    <span className="text-rose-400 flex items-center gap-1">
                      <ShieldAlert className="w-4 h-4" /> BREACHED
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> ACTIVE & HEALTHY
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Automated trading pause trigger
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block font-medium">Max Single Position Cap</span>
                <div className="text-base font-mono font-bold mt-1 text-cyan-400">
                  {settings.max_single_position_pct}%
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  PKR {formatNumber(settings.trading_capital * (settings.max_single_position_pct / 100), 0)} max allocation
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block font-medium">Max Sector Ceiling</span>
                <div className="text-base font-mono font-bold mt-1 text-amber-400">
                  {settings.max_sector_exposure_pct}%
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  PKR {formatNumber(settings.trading_capital * (settings.max_sector_exposure_pct / 100), 0)} max per sector
                </span>
              </div>
            </div>

            {/* Sector Breakdown */}
            {Object.keys(exposure.sector_exposure).length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-800">
                <span className="text-xs font-semibold text-slate-300 block mb-3">Sector Concentration</span>
                <div className="space-y-2">
                  {Object.entries(exposure.sector_exposure).map(([sec, pct]) => (
                    <div key={sec} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">{sec}</span>
                        <span className={pct > settings.max_sector_exposure_pct ? "text-rose-400 font-bold" : "text-slate-200"}>
                          {pct.toFixed(1)}% / {settings.max_sector_exposure_pct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${pct > settings.max_sector_exposure_pct ? "bg-rose-500" : "bg-cyan-500"}`}
                          style={{ width: `${Math.min((pct / settings.max_sector_exposure_pct) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2-Column Layout: Position Sizing Calculator & Capital Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Position Sizing Calculator (7 Cols) */}
          <div className="lg:col-span-7 trading-card rounded-xl border border-slate-800 p-5 bg-slate-900/60">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-teal-400" />
                <div>
                  <h2 className="text-sm font-bold text-white">Intelligent Position Sizing & R:R Calculator</h2>
                  <p className="text-[11px] text-slate-400">
                    Fixed fractional capital risk sizing based on structural invalidation levels.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTerminal(true)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 transition shadow-sm shadow-indigo-900/40"
              >
                <Zap className="w-3.5 h-3.5 text-indigo-200" />
                Institutional Slippage & Ticket Terminal
              </button>
            </div>

            <form onSubmit={handleCalculate} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Symbol</label>
                  <input
                    type="text"
                    value={calcSymbol}
                    onChange={(e) => setCalcSymbol(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
                    placeholder="e.g. AIRLINK"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Entry Price (PKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={calcEntry}
                    onChange={(e) => setCalcEntry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Stop-Loss (PKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={calcStopLoss}
                    onChange={(e) => setCalcStopLoss(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-rose-300 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Target 1 (PKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={calcTarget1}
                    onChange={(e) => setCalcTarget1(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Target 2 (PKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={calcTarget2}
                    onChange={(e) => setCalcTarget2(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={calcLoading}
                className="w-full py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors"
              >
                {calcLoading ? "Calculating..." : "Compute Share Sizing & R:R Metrics"}
              </button>
            </form>

            {/* Calculation Output Card */}
            {calcResult && (
              <div className="mt-5 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-sm">
                    {calcResult.symbol} Recommended Execution Sizing
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Risk Cap: {settings.max_risk_per_trade_pct}% = PKR {formatNumber(calcResult.risk_amount_pkr, 0)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[11px] block">Recommended Quantity</span>
                    <span className="text-base font-bold text-emerald-400">
                      {formatNumber(calcResult.recommended_shares)} shares
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      PKR {formatNumber(calcResult.recommended_position_value, 2)} ({calcResult.position_size_pct_of_capital}% of capital)
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 text-[11px] block">Stop-Loss Distance</span>
                    <span className="text-base font-bold text-rose-400">
                      PKR {calcResult.stop_loss_distance_pkr.toFixed(2)} ({calcResult.stop_loss_distance_pct.toFixed(2)}%)
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Capital at Risk: PKR {formatNumber(calcResult.risk_amount_pkr, 2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Target 1 Risk-to-Reward</span>
                    <div className="text-sm font-bold text-cyan-400">
                      {calcResult.target_1_rr ? `1 : ${calcResult.target_1_rr}` : "-"}
                    </div>
                    {calcResult.target_1_potential_pkr && (
                      <span className="text-[10px] text-emerald-400 block">
                        Potential: +PKR {formatNumber(calcResult.target_1_potential_pkr, 0)}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">Target 2 Risk-to-Reward</span>
                    <div className="text-sm font-bold text-cyan-400">
                      {calcResult.target_2_rr ? `1 : ${calcResult.target_2_rr}` : "-"}
                    </div>
                    {calcResult.target_2_potential_pkr && (
                      <span className="text-[10px] text-emerald-400 block">
                        Potential: +PKR {formatNumber(calcResult.target_2_potential_pkr, 0)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex justify-between text-[11px] text-slate-400">
                  <span>Est. Round-Trip Commission ({settings.commission_rate_pct}%):</span>
                  <span className="text-slate-200 font-bold">PKR {formatNumber(calcResult.estimated_commission_pkr, 2)}</span>
                </div>

                {/* Warnings */}
                {calcResult.warnings.length > 0 && (
                  <div className="pt-2 space-y-1">
                    {calcResult.warnings.map((warn, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-400 font-sans">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                        <span>{warn}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Risk Settings Config Form (5 Cols) */}
          <div className="lg:col-span-5 trading-card rounded-xl border border-slate-800 p-5 bg-slate-900/60">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-rose-400" />
                <h2 className="text-sm font-bold text-white">Account Risk Guardrails</h2>
              </div>
              {saveSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Trading Capital (PKR)</label>
                <input
                  type="number"
                  value={formCapital}
                  onChange={(e) => setFormCapital(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Max Risk / Trade %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formRiskPct}
                    onChange={(e) => setFormRiskPct(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Max Daily Loss %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formDailyLossPct}
                    onChange={(e) => setFormDailyLossPct(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Max Open Positions</label>
                  <input
                    type="number"
                    value={formMaxPositions}
                    onChange={(e) => setFormMaxPositions(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Sector Ceiling %</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formSectorExposure}
                    onChange={(e) => setFormSectorExposure(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Single Position %</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formSinglePos}
                    onChange={(e) => setFormSinglePos(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Brokerage Rate %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formCommission}
                    onChange={(e) => setFormCommission(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Risk Settings
                </button>
              </div>
            </form>

            <div className="mt-4 p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1 leading-relaxed">
              <span className="font-semibold text-slate-300 block">Strict Risk Protocol:</span>
              <p>• Never exceed 2.0% risk per single setup in manual trading.</p>
              <p>• Stop-losses are non-negotiable structural invalidation points.</p>
              <p>• Daily loss limit breaches mandate immediate trading halt for the session.</p>
            </div>
          </div>
        </div>

        {/* Regulatory & Safety Notice */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-xs text-slate-400 flex items-center gap-3">
          <Info className="w-5 h-5 text-teal-400 shrink-0" />
          <span>
            <strong>Brokerage Execution Guardrail:</strong> PSX Signal Intelligence operates as a quantitative scanning,
            strategy evaluation, and trade management system. Order entries into SCSTrade or other PSX brokerages
            must be executed manually by the authorized account owner. No automated order placement is performed.
          </span>
        </div>
      </div>

      {/* Institutional Execution & Slippage Modal */}
      <InstitutionalExecutionModal
        isOpen={showTerminal}
        onClose={() => setShowTerminal(false)}
        symbol={calcSymbol || "AIRLINK"}
        defaultPrice={parseFloat(calcEntry) || 100}
        defaultAction="BUY"
        defaultStopLoss={parseFloat(calcStopLoss) || 96}
        defaultTarget={parseFloat(calcTarget1) || 105}
      />
    </AppShell>
  );
}
