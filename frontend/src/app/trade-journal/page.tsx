"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import {
  BookOpen,
  Plus,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BarChart2,
  Trash2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  PieChart,
  Calendar,
  Layers,
  ChevronRight,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { InstitutionalExecutionModal } from "@/components/trading/InstitutionalExecutionModal";
import {
  JournalTrade,
  JournalTradeCreate,
  JournalTradeClose,
  PerformanceAnalyticsReport,
  TradeDirection,
  ExitReason,
} from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/utils";

export default function TradeJournalPage() {
  const { marketStatus, isLiveBackend, isWsConnected, isLoading: marketLoading, refreshAllData } = useRealTimeMarket();

  const [activeTab, setActiveTab] = useState<"trades" | "analytics">("trades");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "CLOSED" | "WINS" | "LOSSES">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [analytics, setAnalytics] = useState<PerformanceAnalyticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalTrade, setTerminalTrade] = useState<{ symbol: string; price: number; sl?: number; t1?: number } | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<JournalTrade | null>(null);

  // New Trade Form state
  const [newSymbol, setNewSymbol] = useState("AIRLINK");
  const [newDirection, setNewDirection] = useState<TradeDirection>("BUY");
  const [newQuantity, setNewQuantity] = useState("1000");
  const [newEntryPrice, setNewEntryPrice] = useState("135.00");
  const [newEntryDate, setNewEntryDate] = useState("2026-11-16 10:00");
  const [newStopLoss, setNewStopLoss] = useState("128.00");
  const [newTarget1, setNewTarget1] = useState("145.00");
  const [newTarget2, setNewTarget2] = useState("152.00");
  const [newStrategy, setNewStrategy] = useState("Momentum + VWAP Breakout");
  const [newSetupType, setNewSetupType] = useState("BREAKOUT");
  const [newSignalId, setNewSignalId] = useState("");
  const [newCommissionRate, setNewCommissionRate] = useState("0.15");
  const [newNotes, setNewNotes] = useState("");

  // Close Trade Form state
  const [closeExitPrice, setCloseExitPrice] = useState("");
  const [closeExitDate, setCloseExitDate] = useState("2026-11-16 15:00");
  const [closeReason, setCloseReason] = useState<ExitReason>("TARGET_1");
  const [closeNotes, setCloseNotes] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [tradesRes, analyticsRes] = await Promise.all([
        api.getJournalTrades(),
        api.getPerformanceAnalytics(),
      ]);
      setTrades(tradesRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load journal records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    try {
      const nowStr = new Date().toISOString().slice(0, 16).replace("T", " ");
      setNewEntryDate(nowStr);
      setCloseExitDate(nowStr);
    } catch { }
  }, []);

  const handleCreateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(newQuantity);
    const entryP = parseFloat(newEntryPrice);
    if (!newSymbol || isNaN(qty) || qty <= 0 || isNaN(entryP) || entryP <= 0) {
      alert("Please enter a valid symbol, quantity, and entry price.");
      return;
    }

    const payload: JournalTradeCreate = {
      symbol: newSymbol.trim().toUpperCase(),
      direction: newDirection,
      quantity: qty,
      entry_price: entryP,
      entry_date: newEntryDate,
      stop_loss: newStopLoss ? parseFloat(newStopLoss) : undefined,
      target_1: newTarget1 ? parseFloat(newTarget1) : undefined,
      target_2: newTarget2 ? parseFloat(newTarget2) : undefined,
      strategy: newStrategy,
      setup_type: newSetupType,
      signal_id: newSignalId.trim() || undefined,
      brokerage_commission_rate: parseFloat(newCommissionRate) || 0.15,
      notes: newNotes,
    };

    const res = await api.createJournalTrade(payload);
    if (res.error) {
      alert(`Error creating trade: ${res.error}`);
    } else {
      setIsCreateOpen(false);
      resetCreateForm();
      loadData();
    }
  };

  const resetCreateForm = () => {
    setNewQuantity("1000");
    setNewEntryPrice("135.00");
    setNewNotes("");
    setNewSignalId("");
  };

  const handleOpenCloseModal = (trade: JournalTrade) => {
    setSelectedTrade(trade);
    setCloseExitPrice(trade.target_1 ? trade.target_1.toString() : trade.entry_price.toString());
    setCloseExitDate(new Date().toISOString().slice(0, 16).replace("T", " "));
    setCloseReason("TARGET_1");
    setCloseNotes("");
    setIsCloseOpen(true);
  };

  const handleCloseTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrade) return;
    const exitP = parseFloat(closeExitPrice);
    if (isNaN(exitP) || exitP <= 0) {
      alert("Please provide a valid exit price.");
      return;
    }

    const payload: JournalTradeClose = {
      exit_price: exitP,
      exit_date: closeExitDate,
      exit_reason: closeReason,
      closing_notes: closeNotes,
    };

    const res = await api.closeJournalTrade(selectedTrade.id, payload);
    if (res.error) {
      alert(`Error closing trade: ${res.error}`);
    } else {
      setIsCloseOpen(false);
      setSelectedTrade(null);
      loadData();
    }
  };

  const handleDeleteTrade = async (tradeId: string) => {
    if (!confirm(`Are you sure you want to remove trade ${tradeId} from the journal?`)) return;
    const success = await api.deleteJournalTrade(tradeId);
    if (success) {
      loadData();
    } else {
      alert("Failed to delete trade.");
    }
  };

  // Filtered trades
  const filteredTrades = trades.filter((t) => {
    if (statusFilter === "OPEN" && t.status !== "OPEN") return false;
    if (statusFilter === "CLOSED" && t.status !== "CLOSED") return false;
    if (statusFilter === "WINS" && (t.status !== "CLOSED" || t.net_pnl <= 0)) return false;
    if (statusFilter === "LOSSES" && (t.status !== "CLOSED" || t.net_pnl >= 0)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.symbol.toLowerCase().includes(q) ||
        t.company_name.toLowerCase().includes(q) ||
        t.strategy.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate quick stats from trades
  const openCount = trades.filter((t) => t.status === "OPEN").length;
  const closedTrades = trades.filter((t) => t.status === "CLOSED");
  const winCount = closedTrades.filter((t) => t.net_pnl > 0).length;
  const totalNetPnl = closedTrades.reduce((acc, t) => acc + t.net_pnl, 0);
  const totalCommissions = trades.reduce((acc, t) => acc + t.total_charges, 0);
  const winRate = closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0;

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={marketLoading}
      onRefresh={() => {
        refreshAllData();
        loadData();
      }}
    >
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="trading-card rounded-xl border border-slate-800 p-5 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-950/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white tracking-tight">PSX Trade Journal & Performance</h1>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    Dual DB Sync
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Post-trade execution audit, quantitative PnL accounting, and automated signal conversion tracking.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  setTerminalTrade({ symbol: "HUBC", price: 118.4, sl: 114.0, t1: 126.0 });
                  setIsTerminalOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30 transition-colors"
              >
                <Zap className="w-4 h-4 text-indigo-200" />
                Execution & Slippage Terminal
              </button>
              <a
                href={api.getJournalCsvUrl()}
                download="psx_trade_journal.csv"
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <Download className="w-4 h-4 text-slate-400" />
                Export CSV
              </a>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Log Trade
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-800/80">
            <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/60">
              <span className="text-[11px] font-medium text-slate-400 block">Total Net Realized PnL</span>
              <div className={`text-base font-mono font-bold mt-1 flex items-center gap-1.5 ${totalNetPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {totalNetPnl >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                PKR {formatNumber(totalNetPnl, 2)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/60">
              <span className="text-[11px] font-medium text-slate-400 block">Win Rate</span>
              <div className="text-base font-mono font-bold mt-1 text-cyan-400">
                {winRate.toFixed(1)}% <span className="text-xs font-normal text-slate-400">({winCount}/{closedTrades.length})</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/60">
              <span className="text-[11px] font-medium text-slate-400 block">Open Positions</span>
              <div className="text-base font-mono font-bold mt-1 text-amber-400">
                {openCount} <span className="text-xs font-normal text-slate-400">Active</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/60">
              <span className="text-[11px] font-medium text-slate-400 block">Total Commissions</span>
              <div className="text-base font-mono font-bold mt-1 text-slate-300">
                PKR {formatNumber(totalCommissions, 2)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/60 col-span-2 md:col-span-1">
              <span className="text-[11px] font-medium text-slate-400 block">Signal Conversion</span>
              <div className="text-base font-mono font-bold mt-1 text-teal-400">
                {analytics?.signal_conversion_rate_pct ?? 0}% <span className="text-xs font-normal text-slate-400">({analytics?.signals_converted_to_trades ?? 0} trades)</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("trades")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === "trades"
                ? "bg-slate-800 text-white border border-slate-700"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
          >
            <BookOpen className="w-4 h-4 text-teal-400" />
            Trade History ({trades.length})
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === "analytics"
                ? "bg-slate-800 text-white border border-slate-700"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
          >
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            Performance Analytics & Breakdown
          </button>
        </div>

        {activeTab === "trades" ? (
          /* TRADES LIST VIEW */
          <div className="trading-card rounded-xl border border-slate-800 overflow-hidden">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                {(["ALL", "OPEN", "CLOSED", "WINS", "LOSSES"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${statusFilter === st
                        ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by symbol, company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Trades Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono text-[11px] uppercase">
                    <th className="py-3 px-4">Trade ID / Date</th>
                    <th className="py-3 px-3">Symbol</th>
                    <th className="py-3 px-3">Direction</th>
                    <th className="py-3 px-3 text-right">Entry</th>
                    <th className="py-3 px-3 text-right">Exit</th>
                    <th className="py-3 px-3 text-right">Qty</th>
                    <th className="py-3 px-3 text-right">Net PnL (PKR)</th>
                    <th className="py-3 px-3 text-right">Return %</th>
                    <th className="py-3 px-3">Strategy</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredTrades.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-500">
                        No trade journal records found matching the active criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTrades.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-white">{t.id}</span>
                          <span className="text-[10px] text-slate-400 block">{t.entry_date.slice(0, 10)}</span>
                          {t.signal_id && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 inline-block mt-0.5">
                              {t.signal_id}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-white text-sm">{t.symbol}</span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">{t.company_name}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.direction === "BUY" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            }`}>
                            {t.direction}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-200">
                          {formatNumber(t.entry_price, 2)}
                          {t.stop_loss && (
                            <span className="text-[10px] text-rose-400/80 block">SL: {formatNumber(t.stop_loss, 2)}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-200">
                          {t.exit_price ? (
                            <>
                              <span>{formatNumber(t.exit_price, 2)}</span>
                              <span className="text-[10px] text-slate-400 block">{t.exit_reason || "CLOSED"}</span>
                            </>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-300">
                          {formatNumber(t.quantity)}
                          <span className="text-[10px] text-slate-500 block">PKR {formatNumber(t.position_value, 0)}</span>
                        </td>
                        <td className={`py-3 px-3 text-right font-bold ${t.status === "OPEN" ? "text-slate-400" : t.net_pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}>
                          {t.status === "OPEN" ? "Active" : `${t.net_pnl >= 0 ? "+" : ""}${formatNumber(t.net_pnl, 2)}`}
                          {t.total_charges > 0 && (
                            <span className="text-[9px] text-slate-500 block">Fee: {formatNumber(t.total_charges, 1)}</span>
                          )}
                        </td>
                        <td className={`py-3 px-3 text-right font-bold ${t.status === "OPEN" ? "text-slate-400" : t.return_percent >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}>
                          {t.status === "OPEN" ? "-" : `${t.return_percent >= 0 ? "+" : ""}${t.return_percent.toFixed(2)}%`}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          <span className="text-xs truncate block max-w-[130px]">{t.strategy}</span>
                          <span className="text-[10px] text-slate-500">{t.setup_type}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.status === "OPEN"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse"
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                            }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {t.status === "OPEN" && (
                              <button
                                onClick={() => handleOpenCloseModal(t)}
                                className="px-2.5 py-1 text-[11px] font-medium rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors"
                              >
                                Close
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteTrade(t.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* PERFORMANCE ANALYTICS VIEW */
          <div className="space-y-6">
            {analytics ? (
              <>
                {/* Scorecard Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="trading-card rounded-xl p-4 border border-slate-800 bg-slate-900/60">
                    <span className="text-xs text-slate-400 font-medium">Profit Factor</span>
                    <div className="text-xl font-mono font-bold text-white mt-1">
                      {analytics.profit_factor >= 999 ? "∞" : analytics.profit_factor.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Gross Profit / Gross Loss</span>
                  </div>

                  <div className="trading-card rounded-xl p-4 border border-slate-800 bg-slate-900/60">
                    <span className="text-xs text-slate-400 font-medium">Mathematical Expectancy</span>
                    <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
                      PKR {formatNumber(analytics.expectancy_pkr, 2)}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      +{analytics.expectancy_pct.toFixed(2)}% per closed trade
                    </span>
                  </div>

                  <div className="trading-card rounded-xl p-4 border border-slate-800 bg-slate-900/60">
                    <span className="text-xs text-slate-400 font-medium">Max Drawdown</span>
                    <div className="text-xl font-mono font-bold text-rose-400 mt-1">
                      -{analytics.max_drawdown_pct.toFixed(2)}%
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      PKR {formatNumber(analytics.max_drawdown_pkr, 2)} from equity peak
                    </span>
                  </div>

                  <div className="trading-card rounded-xl p-4 border border-slate-800 bg-slate-900/60">
                    <span className="text-xs text-slate-400 font-medium">Win / Loss Ratio</span>
                    <div className="text-xl font-mono font-bold text-cyan-400 mt-1">
                      {analytics.win_loss_ratio.toFixed(2)}:1
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Avg Win PKR {formatNumber(analytics.average_winner_pkr, 0)} vs Loss PKR {formatNumber(analytics.average_loser_pkr, 0)}
                    </span>
                  </div>
                </div>

                {/* Strategy Performance Breakdown Table */}
                <div className="trading-card rounded-xl border border-slate-800 overflow-hidden">
                  <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-teal-400" />
                      <h3 className="text-sm font-bold text-white">Strategy Performance Comparison</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {analytics.strategy_breakdown.length} Strategies Tracked
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono text-[11px] uppercase">
                          <th className="py-3 px-4">Strategy</th>
                          <th className="py-3 px-3 text-center">Trades</th>
                          <th className="py-3 px-3 text-center">Win Rate</th>
                          <th className="py-3 px-3 text-right">Net PnL (PKR)</th>
                          <th className="py-3 px-3 text-right">Profit Factor</th>
                          <th className="py-3 px-4 text-right">Avg Return %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {analytics.strategy_breakdown.map((s) => (
                          <tr key={s.strategy} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-bold text-white">{s.strategy}</td>
                            <td className="py-3 px-3 text-center text-slate-300">
                              {s.total_trades} <span className="text-[10px] text-slate-500">({s.winning_trades}W / {s.losing_trades}L)</span>
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-cyan-400">
                              {s.win_rate_pct.toFixed(1)}%
                            </td>
                            <td className={`py-3 px-3 text-right font-bold ${s.net_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {s.net_pnl >= 0 ? "+" : ""}{formatNumber(s.net_pnl, 2)}
                            </td>
                            <td className="py-3 px-3 text-right text-slate-300">
                              {s.profit_factor >= 999 ? "∞" : s.profit_factor.toFixed(2)}
                            </td>
                            <td className={`py-3 px-4 text-right font-bold ${s.avg_return_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {s.avg_return_pct >= 0 ? "+" : ""}{s.avg_return_pct.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Monthly Performance Table */}
                <div className="trading-card rounded-xl border border-slate-800 overflow-hidden">
                  <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-teal-400" />
                      <h3 className="text-sm font-bold text-white">Monthly Execution PnL Breakdown</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">Month-by-Month</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono text-[11px] uppercase">
                          <th className="py-3 px-4">Month</th>
                          <th className="py-3 px-3 text-center">Trades</th>
                          <th className="py-3 px-3 text-center">Win Rate</th>
                          <th className="py-3 px-3 text-right">Gross Profit</th>
                          <th className="py-3 px-3 text-right">Gross Loss</th>
                          <th className="py-3 px-3 text-right">Commissions</th>
                          <th className="py-3 px-4 text-right">Net Realized PnL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {analytics.monthly_performance.map((m) => (
                          <tr key={m.month_label} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-bold text-white">{m.month_label}</td>
                            <td className="py-3 px-3 text-center text-slate-300">
                              {m.trades_count} <span className="text-[10px] text-slate-500">({m.winning_trades}W / {m.losing_trades}L)</span>
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-cyan-400">
                              {m.win_rate_pct.toFixed(1)}%
                            </td>
                            <td className="py-3 px-3 text-right text-emerald-400">
                              +{formatNumber(m.gross_profit, 2)}
                            </td>
                            <td className="py-3 px-3 text-right text-rose-400">
                              -{formatNumber(m.gross_loss, 2)}
                            </td>
                            <td className="py-3 px-3 text-right text-slate-400">
                              {formatNumber(m.total_commissions, 2)}
                            </td>
                            <td className={`py-3 px-4 text-right font-bold ${m.net_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {m.net_pnl >= 0 ? "+" : ""}{formatNumber(m.net_pnl, 2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="trading-card rounded-xl p-8 border border-slate-800 text-center text-slate-500">
                Loading analytics data...
              </div>
            )}
          </div>
        )}

        {/* Modal: Log New Trade */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
                <div className="flex items-center gap-2.5">
                  <Plus className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Log Manual Trade</h3>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTrade} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Symbol *</label>
                    <input
                      type="text"
                      required
                      value={newSymbol}
                      onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 font-mono"
                      placeholder="e.g. AIRLINK"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Direction *</label>
                    <select
                      value={newDirection}
                      onChange={(e) => setNewDirection(e.target.value as TradeDirection)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="BUY">BUY (Long)</option>
                      <option value="SELL">SELL (Short)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Quantity *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Entry Price (PKR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min={0.01}
                      value={newEntryPrice}
                      onChange={(e) => setNewEntryPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Commission %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newCommissionRate}
                      onChange={(e) => setNewCommissionRate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Stop-Loss (PKR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newStopLoss}
                      onChange={(e) => setNewStopLoss(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-rose-300 focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Target 1 (PKR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newTarget1}
                      onChange={(e) => setNewTarget1(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-emerald-300 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Target 2 (PKR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newTarget2}
                      onChange={(e) => setNewTarget2(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-emerald-300 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Strategy</label>
                    <input
                      type="text"
                      value={newStrategy}
                      onChange={(e) => setNewStrategy(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Setup Type</label>
                    <select
                      value={newSetupType}
                      onChange={(e) => setNewSetupType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="BREAKOUT">BREAKOUT</option>
                      <option value="PULLBACK">PULLBACK</option>
                      <option value="VWAP_RECLAIM">VWAP_RECLAIM</option>
                      <option value="MOMENTUM">MOMENTUM</option>
                      <option value="REVERSAL">REVERSAL</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Linked Engine Signal ID (Optional)</label>
                  <input
                    type="text"
                    value={newSignalId}
                    onChange={(e) => setNewSignalId(e.target.value)}
                    placeholder="e.g. SIG-PSX-AIRLINK-01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Trade Rationale / Notes</label>
                  <textarea
                    rows={2}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Catalyst, market breadth, technical thesis..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-colors"
                  >
                    Save Trade to Journal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Close Trade */}
        {isCloseOpen && selectedTrade && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Close Trade: {selectedTrade.symbol}</h3>
                </div>
                <button
                  onClick={() => setIsCloseOpen(false)}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCloseTrade} className="p-6 space-y-4">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Entry Price:</span>
                    <span className="font-mono text-white">PKR {selectedTrade.entry_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Quantity:</span>
                    <span className="font-mono text-white">{selectedTrade.quantity} shares</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Stop Loss / Target:</span>
                    <span className="font-mono text-slate-300">
                      SL: {selectedTrade.stop_loss ?? "-"} / T1: {selectedTrade.target_1 ?? "-"}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Exit Price (PKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min={0.01}
                    value={closeExitPrice}
                    onChange={(e) => setCloseExitPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Exit Reason *</label>
                  <select
                    value={closeReason}
                    onChange={(e) => setCloseReason(e.target.value as ExitReason)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="TARGET_1">Target 1 Hit</option>
                    <option value="TARGET_2">Target 2 Extended Hit</option>
                    <option value="STOP_LOSS">Stop Loss Triggered</option>
                    <option value="TRAILING_STOP">Trailing Stop Reached</option>
                    <option value="DISCRETIONARY">Discretionary Manual Exit</option>
                    <option value="TIME_EXPIRY">Time Expiry</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Closing Notes / Post-Mortem</label>
                  <textarea
                    rows={2}
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder="Execution details, slippage notes, lesson learned..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCloseOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-colors"
                  >
                    Confirm & Settle Trade
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Institutional Execution & Slippage Modal */}
      <InstitutionalExecutionModal
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
        symbol={terminalTrade?.symbol || "HUBC"}
        defaultPrice={terminalTrade?.price || 118.4}
        defaultAction="BUY"
        defaultStopLoss={terminalTrade?.sl || 114.0}
        defaultTarget={terminalTrade?.t1 || 126.0}
      />
    </AppShell>
  );
}
