"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import {
  Zap,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  X,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  History,
} from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/utils";
import { Signal, SignalOverviewResponse, StrategyConfig, SignalLifecycleEvent } from "@/lib/types";
import { api } from "@/lib/api";
import { SignalDetailModal } from "@/components/signals/SignalDetailModal";
import { InstitutionalExecutionModal } from "@/components/trading/InstitutionalExecutionModal";

type SignalTab = "ALL" | "BUY_CANDIDATES" | "WATCH" | "WAIT" | "TARGETS_HIT" | "EXITS";

export default function SignalsPage() {
  const { marketStatus, isLiveBackend, isWsConnected } = useRealTimeMarket();

  const [signalsOverview, setSignalsOverview] = useState<SignalOverviewResponse | null>(null);
  const [strategyConfig, setStrategyConfig] = useState<StrategyConfig | null>(null);
  const [configDraft, setConfigDraft] = useState<Partial<StrategyConfig>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<SignalTab>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSignalForOrder, setSelectedSignalForOrder] = useState<Signal | null>(null);
  const [selectedSignalForLifecycle, setSelectedSignalForLifecycle] = useState<Signal | null>(null);
  const [selectedSignalForDetail, setSelectedSignalForDetail] = useState<Signal | null>(null);
  const [lifecycleEvents, setLifecycleEvents] = useState<SignalLifecycleEvent[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [copiedOrderId, setCopiedOrderId] = useState<boolean>(false);
  const [execModalSignal, setExecModalSignal] = useState<Signal | null>(null);
  const [sortField, setSortField] = useState<keyof Signal>("opportunity_score");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [excludeDefaulters, setExcludeDefaulters] = useState<boolean>(true);
  const [shariahOnly, setShariahOnly] = useState<boolean>(false);

  // Fetch signals and strategy configuration
  const loadSignalsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [signalsRes, configRes] = await Promise.all([
        api.getSignals({
          exclude_defaulters: excludeDefaulters,
          shariah_only: shariahOnly,
        }),
        api.getStrategyConfig(),
      ]);
      setSignalsOverview(signalsRes.data);
      if (configRes.data) {
        setStrategyConfig(configRes.data);
        setConfigDraft(configRes.data);
      }
    } catch (err) {
      console.warn("Failed to load signals:", err);
    } finally {
      setIsLoading(false);
    }
  }, [excludeDefaulters, shariahOnly]);

  useEffect(() => {
    loadSignalsData();
  }, [loadSignalsData]);

  // Trigger on-demand signal evaluation
  const handleGenerateSignals = async () => {
    setIsGenerating(true);
    try {
      await api.triggerSignalGeneration(true);
      await loadSignalsData();
    } catch (err) {
      console.error("Signal generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Open lifecycle audit trail
  const handleOpenLifecycle = async (signal: Signal) => {
    setSelectedSignalForLifecycle(signal);
    try {
      const res = await api.getSignalLifecycle(signal.id);
      setLifecycleEvents(res.data);
    } catch {
      setLifecycleEvents([]);
    }
  };

  // Save Strategy Config
  const handleSaveConfig = async () => {
    try {
      const res = await api.updateStrategyConfig(configDraft);
      if (res.data) {
        setStrategyConfig(res.data);
      }
      setIsConfigModalOpen(false);
      handleGenerateSignals();
    } catch (err) {
      console.error("Error saving strategy config", err);
    }
  };

  // Copy SCSTrade order parameters
  const copyOrderParams = (signal: Signal) => {
    const text = `PSX SCSTrade Order Setup:\nSymbol: ${signal.symbol}\nStrategy: ${signal.strategy} (${signal.strategy_version || "1.0.0"})\nAction: ${signal.action}\nEntry Price: Rs. ${signal.entry_price.toFixed(2)}\nStop-Loss: Rs. ${signal.stop_loss.toFixed(2)}\nTarget 1: Rs. ${signal.target_1.toFixed(2)}\nTarget 2: Rs. ${signal.target_2.toFixed(2)}\nRisk:Reward: 1 : ${signal.risk_reward_ratio}\nOpportunity Score: ${signal.opportunity_score || signal.confidence_score}/100`;
    navigator.clipboard.writeText(text);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const allSignals = signalsOverview?.signals || [];

  // Filter signals
  const filteredSignals = allSignals.filter((s) => {
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSym = s.symbol.toLowerCase().includes(q);
      const matchComp = s.company_name.toLowerCase().includes(q);
      const matchSec = s.sector.toLowerCase().includes(q);
      if (!matchSym && !matchComp && !matchSec) return false;
    }

    // Tab filter
    switch (activeTab) {
      case "BUY_CANDIDATES":
        return (
          s.signal_type === "BUY_CANDIDATE" ||
          s.action === "BUY" ||
          s.action === "STRONG_BUY"
        );
      case "WATCH":
        return s.signal_type === "WATCH" || s.action === "WATCH";
      case "WAIT":
        return s.signal_type === "WAIT" || s.action === "WAIT";
      case "TARGETS_HIT":
        return s.status === "TARGET_1_HIT" || s.status === "TARGET_2_HIT";
      case "EXITS":
        return (
          s.signal_type === "EXIT" ||
          s.action === "EXIT" ||
          s.action === "SELL" ||
          s.status === "STOPPED_OUT"
        );
      case "ALL":
      default:
        return true;
    }
  });

  // Sort signals
  const sortedSignals = [...filteredSignals].sort((a, b) => {
    let aVal = a[sortField] ?? a.confidence_score;
    let bVal = b[sortField] ?? b.confidence_score;
    if (typeof aVal === "string") {
      return sortDirection === "asc"
        ? (aVal as string).localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal as string);
    }
    return sortDirection === "asc"
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  const toggleSort = (field: keyof Signal) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={isLoading}
      onRefresh={loadSignalsData}
      activeSignalsCount={allSignals.length}
    >
      <div className="space-y-4">
        {/* STRATEGY HEADER & CONTROL BAR */}
        <div className="trading-card rounded-xl border border-slate-800/90 p-4 bg-slate-900/60">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-white tracking-tight">
                    Automated PSX Trading Signal Engine
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    {strategyConfig?.strategy_name || "Momentum + Volume + VWAP + Breakout"} v{strategyConfig?.strategy_version || "1.0.0"}
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded">
                    Manual Execution (SCSTrade)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Algorithmic trading signals evaluated across 9 confluence factors including intraday VWAP, EMA 9/21 trend alignment, and relative volume surges.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 rounded-lg border border-slate-700/80 transition-all"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                Strategy Parameters
              </button>

              <button
                onClick={handleGenerateSignals}
                disabled={isGenerating}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                {isGenerating ? "Evaluating Equities..." : "Generate Signals Now"}
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono">
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
              <span className="text-slate-500 block text-[10px]">BUY CANDIDATES</span>
              <span className="text-emerald-400 font-bold">
                {allSignals.filter((s) => s.signal_type === "BUY_CANDIDATE" || s.action === "BUY" || s.action === "STRONG_BUY").length} Actionable
              </span>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
              <span className="text-slate-500 block text-[10px]">WATCH LIST</span>
              <span className="text-cyan-400 font-bold">
                {allSignals.filter((s) => s.signal_type === "WATCH" || s.action === "WATCH").length} Setup Watch
              </span>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
              <span className="text-slate-500 block text-[10px]">WAIT FOR PULLBACK</span>
              <span className="text-amber-400 font-bold">
                {allSignals.filter((s) => s.signal_type === "WAIT" || s.action === "WAIT").length} Overextended
              </span>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
              <span className="text-slate-500 block text-[10px]">TARGETS HIT</span>
              <span className="text-purple-400 font-bold">
                {allSignals.filter((s) => s.status === "TARGET_1_HIT" || s.status === "TARGET_2_HIT").length} Completed
              </span>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
              <span className="text-slate-500 block text-[10px]">EXIT / STOPPED</span>
              <span className="text-rose-400 font-bold">
                {allSignals.filter((s) => s.signal_type === "EXIT" || s.status === "STOPPED_OUT").length} Exited
              </span>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
              <span className="text-slate-500 block text-[10px]">MIN BUY SCORE</span>
              <span className="text-slate-200 font-bold">
                {strategyConfig?.min_score || 70} / 100 Pts
              </span>
            </div>
          </div>
        </div>

        {/* REGULATORY DISCLAIMER & STALE DATA BANNER */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p className="text-purple-200/90 leading-relaxed font-sans text-[11.5px]">
              <strong className="text-purple-100">Opportunity Score Notice:</strong> The 0–100 score is a quantitative ranking of technical confluence and volume expansion. It is <em>never</em> a guaranteed probability of profit. All trades carry financial risk.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-emerald-200/90 leading-relaxed font-sans text-[11.5px]">
              <strong className="text-emerald-100">Data Integrity Guard:</strong> Buy signals are strictly prohibited from generating on stale market data (&gt;1800s age). Only validated, fresh observations enter the ranking.
            </p>
          </div>
        </div>

        {/* INSTITUTIONAL MICROSTRUCTURE & COMPLIANCE CONTROLS */}
        <div className="trading-card rounded-xl border border-slate-800/90 p-3 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Institutional Shield:
            </span>

            {/* Exclude Defaulters Toggle */}
            <button
              onClick={() => setExcludeDefaulters(!excludeDefaulters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all border ${excludeDefaulters
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm"
                  : "bg-rose-500/15 text-rose-300 border-rose-500/40"
                }`}
              title="Filter out PSX Defaulters (DEF) and Non-Compliant (NC) companies"
            >
              {excludeDefaulters ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>{excludeDefaulters ? "Defaulter Shield: Active" : "Defaulters: Allowed"}</span>
            </button>

            {/* Shariah Only Toggle */}
            <button
              onClick={() => setShariahOnly(!shariahOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all border ${shariahOnly
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-white border-slate-700/60"
                }`}
              title="Show only KMI Shariah-Compliant Signals"
            >
              <span className={`w-2 h-2 rounded-full ${shariahOnly ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
              <span>Shariah (KMI) Only</span>
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 ml-auto">
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
              PSX Band: ±7.5% / PKR 1.00
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
              Locked Upper = WATCH
            </span>
          </div>
        </div>

        {/* FILTER BAR & SEARCH */}
        <div className="trading-card rounded-xl border border-slate-800/90 p-3 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            {[
              { id: "ALL", label: "All Signals", count: allSignals.length },
              {
                id: "BUY_CANDIDATES",
                label: "Buy Candidates",
                count: allSignals.filter((s) => s.signal_type === "BUY_CANDIDATE" || s.action === "BUY" || s.action === "STRONG_BUY").length,
              },
              {
                id: "WATCH",
                label: "Watch List",
                count: allSignals.filter((s) => s.signal_type === "WATCH" || s.action === "WATCH").length,
              },
              {
                id: "WAIT",
                label: "Wait for Pullback",
                count: allSignals.filter((s) => s.signal_type === "WAIT" || s.action === "WAIT").length,
              },
              {
                id: "TARGETS_HIT",
                label: "Targets Hit",
                count: allSignals.filter((s) => s.status === "TARGET_1_HIT" || s.status === "TARGET_2_HIT").length,
              },
              {
                id: "EXITS",
                label: "Exits / Stopped",
                count: allSignals.filter((s) => s.signal_type === "EXIT" || s.status === "STOPPED_OUT").length,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SignalTab)}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${isActive
                      ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm"
                      : "bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/40"
                    }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? "bg-amber-500/30 text-amber-100" : "bg-slate-700/60 text-slate-400"
                      }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by symbol, company, or sector..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950/70 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>

        {/* SIGNALS TABLE */}
        <div className="trading-card rounded-xl border border-slate-800/90 overflow-hidden bg-slate-950/30">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-mono text-[10.5px] uppercase tracking-wider select-none">
                  <th
                    onClick={() => toggleSort("symbol")}
                    className="py-3 px-3 cursor-pointer hover:text-white"
                  >
                    Symbol / Sector
                  </th>
                  <th className="py-3 px-3">Signal State</th>
                  <th
                    onClick={() => toggleSort("opportunity_score")}
                    className="py-3 px-3 text-center cursor-pointer hover:text-white"
                  >
                    Opp Score
                  </th>
                  <th
                    onClick={() => toggleSort("current_price")}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  >
                    Current Price
                  </th>
                  <th
                    onClick={() => toggleSort("entry_price")}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  >
                    Entry Zone
                  </th>
                  <th
                    onClick={() => toggleSort("stop_loss")}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  >
                    Stop-Loss
                  </th>
                  <th className="py-3 px-3 text-right">Targets (T1 / T2)</th>
                  <th
                    onClick={() => toggleSort("risk_reward_ratio")}
                    className="py-3 px-3 text-center cursor-pointer hover:text-white"
                  >
                    R : R
                  </th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Timestamp</th>
                  <th className="py-3 px-3.5 text-center">Execution</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 font-mono">
                {sortedSignals.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-sans">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Zap className="w-8 h-8 text-slate-600 animate-pulse" />
                        <span className="font-semibold text-slate-300">
                          No Trading Signals in Current Tab
                        </span>
                        <p className="text-xs text-slate-500 max-w-md">
                          Try switching to "All Signals", adjusting strategy parameters, or clicking "Generate Signals Now".
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedSignals.map((sig) => {
                    const score = sig.opportunity_score ?? sig.confidence_score;
                    const isBuy =
                      sig.signal_type === "BUY_CANDIDATE" ||
                      sig.action === "BUY" ||
                      sig.action === "STRONG_BUY";
                    const isWait = sig.signal_type === "WAIT" || sig.action === "WAIT";
                    const isWatch = sig.signal_type === "WATCH" || sig.action === "WATCH";
                    const isExit =
                      sig.signal_type === "EXIT" ||
                      sig.action === "EXIT" ||
                      sig.status === "STOPPED_OUT";

                    return (
                      <tr key={sig.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* 1. Symbol / Sector */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-[13px]">{sig.symbol}</span>
                            {sig.is_defaulter ? (
                              <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40" title="PSX Defaulter">
                                DEF
                              </span>
                            ) : sig.is_non_compliant ? (
                              <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40" title="Non-Compliant">
                                NC
                              </span>
                            ) : sig.is_shariah_compliant ? (
                              <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" title="KMI Shariah Compliant">
                                KMI
                              </span>
                            ) : (
                              <span className="text-[9px] px-1 py-0.2 rounded font-mono text-slate-400 bg-slate-800 border border-slate-700">
                                MAIN
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-slate-400 truncate max-w-[95px] font-sans">
                              {sig.company_name}
                            </span>
                            {sig.sector_quadrant && (
                              <span className={`text-[8.5px] px-1 py-0.2 rounded font-bold uppercase font-mono ${sig.sector_quadrant === "LEADING"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : sig.sector_quadrant === "IMPROVING"
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                    : sig.sector_quadrant === "WEAKENING"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                }`}>
                                {sig.sector_quadrant}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Signal State */}
                        <td className="py-3 px-3 font-sans">
                          <div className="flex flex-col gap-1 items-start">
                            {isBuy ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                BUY CANDIDATE
                              </span>
                            ) : isWatch ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                WATCH
                              </span>
                            ) : isWait ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                WAIT (Pullback)
                              </span>
                            ) : isExit ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                <ArrowDownRight className="w-3.5 h-3.5" />
                                EXIT
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px]">
                                NO TRADE
                              </span>
                            )}

                            {/* Upper Circuit Lock & Cap Warning Badges */}
                            {sig.circuit_status === "LOCKED_UPPER" ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold border border-rose-500/40 animate-pulse">
                                <ShieldAlert className="w-2.5 h-2.5 text-rose-400" />
                                Locked Upper (Ask 0)
                              </span>
                            ) : sig.circuit_status === "CAP_DANGER" ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-semibold border border-amber-500/30">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                                Near Circuit Cap
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* 3. Opp Score */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-xs inline-block ${score >= 80
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                                : score >= 70
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                  : "bg-slate-800 text-slate-300 border border-slate-700"
                              }`}
                          >
                            {score}
                          </span>
                        </td>

                        {/* 4. Current Price */}
                        <td className="py-3 px-3 text-right">
                          <div className="font-bold text-slate-100 font-mono text-xs">
                            Rs. {sig.current_price.toFixed(2)}
                          </div>
                          {sig.circuit_breaker_upper ? (
                            <span className="text-[9px] text-slate-500 block font-mono">
                              Cap Rs. {sig.circuit_breaker_upper.toFixed(1)}
                            </span>
                          ) : null}
                        </td>

                        {/* 5. Entry Zone */}
                        <td className="py-3 px-3 text-right">
                          <div className="font-bold text-emerald-400">
                            Rs. {sig.entry_price.toFixed(2)}
                          </div>
                          {sig.entry_zone_low && sig.entry_zone_high && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                              [{sig.entry_zone_low.toFixed(1)} - {sig.entry_zone_high.toFixed(1)}]
                            </span>
                          )}
                        </td>

                        {/* 6. Stop-Loss */}
                        <td className="py-3 px-3 text-right">
                          <div className="font-bold text-rose-400">
                            Rs. {sig.stop_loss.toFixed(2)}
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            -{sig.max_loss_percent.toFixed(1)}% Risk
                          </span>
                        </td>

                        {/* 7. Targets (T1 / T2) */}
                        <td className="py-3 px-3 text-right">
                          <div className="text-emerald-300 font-semibold">
                            T1: Rs. {sig.target_1.toFixed(2)}{" "}
                            <span className="text-[10px] text-emerald-400">
                              (+{sig.potential_gain_percent.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="text-cyan-300 text-[11px]">
                            T2: Rs. {sig.target_2.toFixed(2)}
                          </div>
                        </td>

                        {/* 8. R : R */}
                        <td className="py-3 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold text-[11px] border border-cyan-500/20">
                            1 : {sig.risk_reward_ratio.toFixed(2)}
                          </span>
                        </td>

                        {/* 9. Status */}
                        <td className="py-3 px-3 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${sig.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : sig.status.includes("TARGET")
                                  ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                                  : sig.status === "STOPPED_OUT"
                                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                    : "bg-slate-800 text-slate-400 border border-slate-700"
                              }`}
                          >
                            {sig.status}
                          </span>
                        </td>

                        {/* 10. Timestamp */}
                        <td className="py-3 px-3 text-right font-mono text-[10.5px] text-slate-400">
                          <div className="flex items-center justify-end gap-1 text-slate-300">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{sig.created_at.split(" ")[1] || sig.created_at}</span>
                          </div>
                          <span className="text-[9.5px] text-slate-500 block truncate">
                            {sig.data_delay_type || "DELAYED_15MIN"}
                          </span>
                        </td>

                        {/* 11. Execution & Lifecycle Actions */}
                        <td className="py-3 px-3.5 text-center font-sans">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedSignalForDetail(sig)}
                              className="px-2.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[11px] font-semibold transition-all"
                            >
                              Rules &amp; Score
                            </button>
                            <button
                              onClick={() => setSelectedSignalForOrder(sig)}
                              className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-all"
                            >
                              SCSTrade
                            </button>
                            <button
                              onClick={() => handleOpenLifecycle(sig)}
                              title="View signal lifecycle history"
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SCSTRADE ORDER PREPARATION MODAL */}
        {selectedSignalForOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="trading-card rounded-2xl border border-slate-700 bg-slate-900 w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
                <div className="flex items-center gap-2.5">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    SCSTrade Execution Assistant: {selectedSignalForOrder.symbol}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedSignalForOrder(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 font-mono text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800/70">
                    <span className="text-slate-400 font-sans">Stock Symbol:</span>
                    <span className="text-base font-bold text-white font-mono">
                      {selectedSignalForOrder.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400 font-sans">Order Action:</span>
                    <span className="font-bold text-emerald-400">{selectedSignalForOrder.action}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400 font-sans">Recommended Entry (Limit):</span>
                    <span className="font-bold text-white text-sm">
                      Rs. {selectedSignalForOrder.entry_price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400 font-sans">Stop-Loss Trigger:</span>
                    <span className="font-bold text-rose-400">
                      Rs. {selectedSignalForOrder.stop_loss.toFixed(2)} (-{selectedSignalForOrder.max_loss_percent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400 font-sans">Target 1 (Book 50%):</span>
                    <span className="font-bold text-emerald-300">
                      Rs. {selectedSignalForOrder.target_1.toFixed(2)} (+{selectedSignalForOrder.potential_gain_percent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400 font-sans">Target 2 (Runner):</span>
                    <span className="font-bold text-cyan-300">
                      Rs. {selectedSignalForOrder.target_2.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800/70">
                    <span className="text-slate-400 font-sans">Target 1 Risk/Reward:</span>
                    <span className="font-bold text-amber-300">
                      1 : {selectedSignalForOrder.risk_reward_ratio}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 font-sans leading-relaxed">
                  <strong>Instructions for SCSTrade Terminal:</strong>
                  <ol className="list-decimal list-inside space-y-1 mt-1">
                    <li>Open SCSTrade order entry ticket for {selectedSignalForOrder.symbol}.</li>
                    <li>Enter BUY Limit Order at Rs. {selectedSignalForOrder.entry_price.toFixed(2)}.</li>
                    <li>Place a stop-loss sell trigger at Rs. {selectedSignalForOrder.stop_loss.toFixed(2)}.</li>
                    <li>Plan partial scale-out at Target 1 (Rs. {selectedSignalForOrder.target_1.toFixed(2)}).</li>
                  </ol>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/40 font-sans">
                <span className="text-[11px] text-slate-400">
                  Opportunity Score: {selectedSignalForOrder.opportunity_score || selectedSignalForOrder.confidence_score}/100
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyOrderParams(selectedSignalForOrder)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    {copiedOrderId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedOrderId ? "Copied Order Setup!" : "Copy Order Details"}
                  </button>
                  <button
                    onClick={() => {
                      const sig = selectedSignalForOrder;
                      setSelectedSignalForOrder(null);
                      setExecModalSignal(sig);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Profit Locker &amp; Ticket
                  </button>
                  <button
                    onClick={() => setSelectedSignalForOrder(null)}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SIGNAL LIFECYCLE AUDIT TRAIL MODAL */}
        {selectedSignalForLifecycle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="trading-card rounded-2xl border border-slate-700 bg-slate-900 w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">
                    Lifecycle Audit Trail: {selectedSignalForLifecycle.symbol}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedSignalForLifecycle(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3 font-mono text-xs max-h-[60vh] overflow-y-auto">
                {lifecycleEvents.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 font-sans">
                    No recorded state transitions yet. Signal is in active initial monitoring.
                  </div>
                ) : (
                  lifecycleEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1"
                    >
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>{evt.timestamp}</span>
                        <span className="font-bold text-purple-300">
                          {evt.previous_status} → {evt.new_status}
                        </span>
                      </div>
                      <p className="text-slate-200 font-sans text-xs">{evt.note}</p>
                      <div className="text-[10px] text-slate-500">
                        Price at Event: Rs. {evt.price_at_event.toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-end p-4 border-t border-slate-800 bg-slate-950/40">
                <button
                  onClick={() => setSelectedSignalForLifecycle(null)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STRATEGY PARAMETERS CONFIGURATION MODAL */}
        {isConfigModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="trading-card rounded-2xl border border-slate-700 bg-slate-900 w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">
                    Strategy Configuration: {strategyConfig?.strategy_name}
                  </h3>
                </div>
                <button
                  onClick={() => setIsConfigModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs font-mono max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Min Score for BUY (0-100):</label>
                    <input
                      type="number"
                      value={configDraft.min_score ?? 70}
                      onChange={(e) =>
                        setConfigDraft({ ...configDraft, min_score: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Watch Score Threshold:</label>
                    <input
                      type="number"
                      value={configDraft.watch_min_score ?? 55}
                      onChange={(e) =>
                        setConfigDraft({ ...configDraft, watch_min_score: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Min Relative Volume (RVOL):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configDraft.min_rvol ?? 1.3}
                      onChange={(e) =>
                        setConfigDraft({ ...configDraft, min_rvol: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Max Distance from VWAP (%):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configDraft.max_vwap_distance_pct ?? 3.5}
                      onChange={(e) =>
                        setConfigDraft({
                          ...configDraft,
                          max_vwap_distance_pct: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Min Risk-to-Reward:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configDraft.min_risk_reward ?? 1.8}
                      onChange={(e) =>
                        setConfigDraft({ ...configDraft, min_risk_reward: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Target 1 Multiplier:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configDraft.target_1_multiplier ?? 1.8}
                      onChange={(e) =>
                        setConfigDraft({
                          ...configDraft,
                          target_1_multiplier: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Min RSI(14):</label>
                    <input
                      type="number"
                      value={configDraft.min_rsi ?? 48}
                      onChange={(e) =>
                        setConfigDraft({ ...configDraft, min_rsi: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Max RSI(14):</label>
                    <input
                      type="number"
                      value={configDraft.max_rsi ?? 75}
                      onChange={(e) =>
                        setConfigDraft({ ...configDraft, max_rsi: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">
                    Max Stale Data Seconds (Strict Guard):
                  </label>
                  <input
                    type="number"
                    value={configDraft.max_stale_seconds ?? 1800}
                    onChange={(e) =>
                      setConfigDraft({
                        ...configDraft,
                        max_stale_seconds: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                  <span className="text-[10px] text-slate-500">
                    Observations older than this limit are strictly prohibited from generating Buy Candidate signals.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-800 bg-slate-950/40">
                <button
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfig}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg"
                >
                  Save & Re-evaluate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SIGNAL DETAIL & 9-FACTOR CHECKLIST MODAL */}
        {selectedSignalForDetail && (
          <SignalDetailModal
            signal={selectedSignalForDetail}
            isOpen={!!selectedSignalForDetail}
            onClose={() => setSelectedSignalForDetail(null)}
            onStatusUpdated={() => {
              loadSignalsData();
              setSelectedSignalForDetail(null);
            }}
          />
        )}

        {/* Institutional Order Execution & Profit Locker Modal */}
        {execModalSignal && (
          <InstitutionalExecutionModal
            isOpen={!!execModalSignal}
            onClose={() => setExecModalSignal(null)}
            symbol={execModalSignal.symbol}
            defaultPrice={execModalSignal.entry_price || execModalSignal.current_price}
            defaultAction={execModalSignal.action === "SELL" ? "SELL" : "BUY"}
            defaultStopLoss={execModalSignal.stop_loss}
            defaultTarget={execModalSignal.target_1}
          />
        )}
      </div>
    </AppShell>
  );
}