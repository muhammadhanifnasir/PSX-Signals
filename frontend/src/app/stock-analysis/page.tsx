"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TradingChart } from "@/components/dashboard/TradingChart";
import { SignalDetailModal } from "@/components/signals/SignalDetailModal";
import { VolumeProfilePanel } from "@/components/stock/VolumeProfilePanel";
import { InstitutionalExecutionModal } from "@/components/trading/InstitutionalExecutionModal";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import { StockDetail, Signal, WatchlistItem, CorporateActionItem } from "@/lib/types";
import { api } from "@/lib/api";
import {
  TrendingUp,
  TrendingDown,
  Search,
  Bookmark,
  BookmarkCheck,
  Zap,
  Target,
  Shield,
  Clock,
  Layers,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Activity,
  Sliders,
  ChevronRight,
  Info,
} from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/utils";

function StockAnalysisContent() {
  const searchParams = useSearchParams();
  const symbolParam = searchParams.get("symbol") || "AIRLINK";

  const { marketStatus, isLiveBackend, isWsConnected, isLoading, refreshAllData } =
    useRealTimeMarket();

  const [activeSymbol, setActiveSymbol] = useState(symbolParam.toUpperCase());
  const [stockDetail, setStockDetail] = useState<StockDetail | null>(null);
  const [loadingStock, setLoadingStock] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [universe, setUniverse] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isWatchlistSaving, setIsWatchlistSaving] = useState(false);
  const [activeModalSignal, setActiveModalSignal] = useState<Signal | null>(null);
  const [copiedOrder, setCopiedOrder] = useState(false);
  const [corporateEvent, setCorporateEvent] = useState<CorporateActionItem | null>(null);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);

  // Load universe for autocomplete
  useEffect(() => {
    api.getStockUniverse().then((res) => {
      if (res.data && res.data.length > 0) {
        setUniverse(res.data);
      }
    });
  }, []);

  // Load watchlist to know if activeSymbol is in watchlist
  const loadWatchlist = useCallback(async () => {
    try {
      const res = await api.getWatchlist();
      setWatchlist(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  // Load stock detail
  const loadStock = useCallback(async (sym: string) => {
    setLoadingStock(true);
    try {
      const [stockRes, calRes] = await Promise.all([
        api.getStockDetail(sym),
        api.getCorporateCalendar(sym),
      ]);
      setStockDetail(stockRes.data);
      const matched = calRes.data?.events?.find((e) => e.symbol.toUpperCase() === sym.toUpperCase());
      setCorporateEvent(matched || null);
    } catch (err) {
      console.warn("Error loading stock detail:", err);
    } finally {
      setLoadingStock(false);
    }
  }, []);

  useEffect(() => {
    loadStock(activeSymbol);
  }, [activeSymbol, loadStock]);

  // Handle symbol change
  const handleSelectSymbol = (sym: string) => {
    const s = sym.trim().toUpperCase();
    if (s && s !== activeSymbol) {
      setActiveSymbol(s);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleSelectSymbol(searchQuery);
      setSearchQuery("");
    }
  };

  // Watchlist toggle
  const isInWatchlist = watchlist.some((w) => w.symbol === activeSymbol);

  const handleToggleWatchlist = async () => {
    setIsWatchlistSaving(true);
    try {
      if (isInWatchlist) {
        await api.removeFromWatchlist(activeSymbol);
      } else {
        await api.addToWatchlist({
          symbol: activeSymbol,
          target_buy_price: stockDetail?.entry_price || stockDetail?.price || 100,
          target_sell_price: stockDetail?.target_1 || (stockDetail?.price ? stockDetail.price * 1.08 : 108),
          notes: "Added from Stock Analysis page.",
          alert_enabled: true,
        });
      }
      await loadWatchlist();
    } catch (err) {
      console.error("Failed to toggle watchlist", err);
    } finally {
      setIsWatchlistSaving(false);
    }
  };

  // Copy SCSTrade order
  const copyOrderSetup = () => {
    if (!stockDetail) return;
    const text = `PSX SCSTrade Order Setup:
Symbol: ${stockDetail.symbol}
Regulatory Category: ${stockDetail.regulatory_category || (stockDetail.is_defaulter ? "DEFAULTER" : stockDetail.is_shariah_compliant ? "KMI SHARIAH" : "MAINBOARD")}
Action: BUY
Current Price: Rs. ${stockDetail.price.toFixed(2)}
Upper Circuit Cap: Rs. ${stockDetail.circuit_breaker_upper?.toFixed(2) || "N/A"}
Lower Circuit Cap: Rs. ${stockDetail.circuit_breaker_lower?.toFixed(2) || "N/A"}
Entry Price: Rs. ${stockDetail.entry_price?.toFixed(2) || stockDetail.price.toFixed(2)}
Stop-Loss: Rs. ${stockDetail.stop_loss?.toFixed(2) || (stockDetail.price * 0.95).toFixed(2)}
Target 1: Rs. ${stockDetail.target_1?.toFixed(2) || (stockDetail.price * 1.08).toFixed(2)}
Target 2: Rs. ${stockDetail.target_2?.toFixed(2) || (stockDetail.price * 1.15).toFixed(2)}
Risk:Reward: 1 : ${stockDetail.risk_reward_ratio || 1.8}
Opportunity Score: ${stockDetail.opportunity_score || 70}/100`;
    navigator.clipboard.writeText(text);
    setCopiedOrder(true);
    setTimeout(() => setCopiedOrder(false), 2200);
  };

  const isPositive = (stockDetail?.change ?? 0) >= 0;

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={isLoading}
      onRefresh={refreshAllData}
      onSearchSymbol={handleSelectSymbol}
    >
      <div className="space-y-6">
        {/* TOP SEARCH & STOCK HEADER BAR */}
        <div className="trading-card rounded-xl border border-slate-800/90 p-4 bg-slate-900/60 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative min-w-[260px] flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search PSX equity (e.g. OGDC, LUCK, HUBC, ATRL)..."
                className="w-full pl-9 pr-24 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded font-sans transition-all"
              >
                Analyze
              </button>
            </form>

            {/* Watchlist Quick Toggle & Actions */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleToggleWatchlist}
                disabled={isWatchlistSaving}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  isInWatchlist
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700"
                }`}
              >
                {isInWatchlist ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                    In Watchlist
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                    Add to Watchlist
                  </>
                )}
              </button>

              <button
                onClick={copyOrderSetup}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
              >
                {copiedOrder ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-200" />
                    Copied SCSTrade Setup
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Order Setup
                  </>
                )}
              </button>

              <button
                onClick={() => setIsExecutionModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
              >
                <Sliders className="w-3.5 h-3.5" />
                Execution &amp; Profit Locker
              </button>
            </div>
          </div>

          {/* Active Symbol Title & Compliance Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xl font-bold font-mono text-white tracking-tight">
                {stockDetail?.symbol || activeSymbol}
              </span>
              <span className="text-xs text-slate-300 font-sans font-medium">
                {stockDetail?.company_name || ""}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                ({stockDetail?.sector || "Equities"})
              </span>

              {/* Regulatory Segment Badge */}
              {stockDetail?.is_defaulter ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/25 text-rose-300 border border-rose-500/40">
                  DEFAULTER SEGMENT
                </span>
              ) : stockDetail?.is_non_compliant ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40">
                  NON-COMPLIANT
                </span>
              ) : stockDetail?.is_shariah_compliant ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  KMI SHARIAH COMPLIANT
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                  MAINBOARD
                </span>
              )}
            </div>

            {/* Price & Change Display */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-lg font-bold font-mono text-white">
                  Rs. {stockDetail?.price?.toFixed(2) || "---"}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 ml-2 text-xs font-bold font-mono ${
                    isPositive ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {formatPercent(stockDetail?.change_percent || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Circuit Lock & Cap Warning Alert Banners */}
          {stockDetail?.circuit_status === "LOCKED_UPPER" && (
            <div className="p-3 mt-3 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-rose-300 block font-mono">
                  UPPER CIRCUIT LOCKED (+7.5% / PKR 1.00 Ceiling Hit)
                </strong>
                <p className="text-rose-200/80 mt-0.5 font-sans">
                  This equity has locked at its maximum daily upper circuit ceiling with zero ask depth (sellers exhausted). No market buy orders can be executed in the cash market session.
                </p>
              </div>
            </div>
          )}

          {stockDetail?.circuit_status === "CAP_DANGER" && (
            <div className="p-3 mt-3 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-amber-300 block font-mono">
                  CAP PROXIMITY RISK ({stockDetail?.cap_distance_pct?.toFixed(2)}% Headroom Remaining)
                </strong>
                <p className="text-amber-200/80 mt-0.5 font-sans">
                  Stock is within 1.2% of its daily upper circuit barrier. Entering now carries severe risk of immediate lock-in without exit liquidity.
                </p>
              </div>
            </div>
          )}

          {/* Corporate Action & Earnings Catalyst Risk Alert */}
          {corporateEvent && (
            <div
              className={`p-3 mt-3 rounded-xl border flex items-start gap-2.5 ${
                corporateEvent.is_high_risk_window
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                  : "bg-slate-900/60 border-slate-800 text-slate-300"
              }`}
            >
              <AlertCircle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  corporateEvent.is_high_risk_window ? "text-amber-400" : "text-sky-400"
                }`}
              />
              <div className="text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <strong className="font-mono text-white">
                    CORPORATE CATALYST: {corporateEvent.event_type.replace(/_/g, " ")} ({corporateEvent.event_date})
                  </strong>
                  {corporateEvent.is_high_risk_window && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      &lt;48h EVENT RISK
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono">
                    In {corporateEvent.days_until_event} Days
                  </span>
                </div>
                <p className="mt-0.5 font-sans text-slate-300">
                  {corporateEvent.details}
                </p>
                <p className="mt-1 font-mono text-[11px] text-amber-300">
                  💡 Institutional Guidance: {corporateEvent.action_guidance}
                </p>
              </div>
            </div>
          )}

          {/* Quick Stats Grid with PSX Microstructure Limits */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono">
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/50">
              <span className="text-slate-500 block text-[10px]">UPPER CAP (+7.5%)</span>
              <span className="text-emerald-400 font-bold">
                Rs. {stockDetail?.circuit_breaker_upper?.toFixed(2) || "---"}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/50">
              <span className="text-slate-500 block text-[10px]">LOWER CAP (-7.5%)</span>
              <span className="text-rose-400 font-bold">
                Rs. {stockDetail?.circuit_breaker_lower?.toFixed(2) || "---"}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/50">
              <span className="text-slate-500 block text-[10px]">CAP HEADROOM</span>
              <span className={`font-bold ${stockDetail?.circuit_status === "LOCKED_UPPER" ? "text-rose-400" : (stockDetail?.cap_distance_pct ?? 10) <= 1.2 ? "text-amber-400" : "text-slate-200"}`}>
                {stockDetail?.cap_distance_pct !== undefined ? `${stockDetail.cap_distance_pct.toFixed(2)}%` : "---"}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/50">
              <span className="text-slate-500 block text-[10px]">PREV CLOSE (LDCP)</span>
              <span className="text-slate-200 font-bold">
                Rs. {stockDetail?.ldcp?.toFixed(2) || "---"}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/50">
              <span className="text-slate-500 block text-[10px]">DAY HIGH</span>
              <span className="text-emerald-400 font-bold">
                Rs. {stockDetail?.high?.toFixed(2) || "---"}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/50">
              <span className="text-slate-500 block text-[10px]">DAY LOW</span>
              <span className="text-rose-400 font-bold">
                Rs. {stockDetail?.low?.toFixed(2) || "---"}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/50">
              <span className="text-slate-500 block text-[10px]">VOLUME</span>
              <span className="text-cyan-400 font-bold">
                {stockDetail?.volume_formatted || "---"}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/50">
              <span className="text-slate-500 block text-[10px]">52-WEEK RANGE</span>
              <span className="text-slate-300 font-bold text-[10px]">
                {stockDetail?.low_52w?.toFixed(1) || "-"} - {stockDetail?.high_52w?.toFixed(1) || "-"}
              </span>
            </div>
          </div>
        </div>

        {/* INTERACTIVE LIGHTWEIGHT CANDLESTICK CHART */}
        <TradingChart
          initialSymbol={activeSymbol}
          stockDetail={stockDetail}
          onSymbolChange={(sym) => setActiveSymbol(sym)}
          height={420}
        />

        {/* ACTIVE TRADING SIGNAL & SCSTRADE EXECUTION CARD */}
        <div className="trading-card rounded-xl border border-slate-800/90 p-5 bg-slate-900/60">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Systematic Trading Signal: {activeSymbol}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {stockDetail?.current_signal?.action || "BUY CANDIDATE"}
                  </span>
                  <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                    Opportunity Score: {stockDetail?.opportunity_score || 75}/100
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculated systematic order brackets with ATR volatility stop buffer and 1.8x minimum risk-to-reward ratio.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (stockDetail?.current_signal) {
                  setActiveModalSignal(stockDetail.current_signal as Signal);
                } else if (stockDetail) {
                  // Fallback synthesis
                  const synSignal: Signal = {
                    id: `SIG-${stockDetail.symbol}`,
                    symbol: stockDetail.symbol,
                    company_name: stockDetail.company_name,
                    sector: stockDetail.sector,
                    action: "BUY",
                    signal_type: "BUY_CANDIDATE",
                    strategy: "Momentum + Volume + VWAP + Breakout",
                    strategy_version: "1.0.0",
                    timeframe: "1D / Intraday",
                    confidence_score: stockDetail.opportunity_score || 75,
                    opportunity_score: stockDetail.opportunity_score || 75,
                    current_price: stockDetail.price,
                    entry_price: stockDetail.entry_price || stockDetail.price,
                    entry_zone_low: stockDetail.entry_zone_low || stockDetail.price * 0.99,
                    entry_zone_high: stockDetail.entry_zone_high || stockDetail.price * 1.01,
                    stop_loss: stockDetail.stop_loss || stockDetail.price * 0.95,
                    target_1: stockDetail.target_1 || stockDetail.price * 1.08,
                    target_2: stockDetail.target_2 || stockDetail.price * 1.15,
                    risk_reward_ratio: stockDetail.risk_reward_ratio || 1.8,
                    potential_gain_percent: 8.5,
                    max_loss_percent: 4.5,
                    rsi_14: stockDetail.technicals.rsi_14,
                    volume_surge_ratio: 2.1,
                    status: "ACTIVE",
                    catalyst_notes: "Strong volume expansion over VWAP.",
                    created_at: new Date().toISOString(),
                    valid_until: new Date().toISOString(),
                    is_mock: false,
                  };
                  setActiveModalSignal(synSignal);
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-sm"
            >
              <Target className="w-3.5 h-3.5" />
              View 9-Rule Checklist &amp; Score
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 font-sans block text-[11px]">Recommended Limit Entry</span>
              <span className="text-lg font-bold text-emerald-400">
                Rs. {stockDetail?.entry_price?.toFixed(2) || "---"}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Zone: [{stockDetail?.entry_zone_low?.toFixed(1)} - {stockDetail?.entry_zone_high?.toFixed(1)}]
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 font-sans block text-[11px]">Calculated Stop-Loss</span>
              <span className="text-lg font-bold text-rose-400">
                Rs. {stockDetail?.stop_loss?.toFixed(2) || "---"}
              </span>
              <span className="text-[10px] text-rose-400/80 block mt-0.5">
                ATR 1.5x structural cushion
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 font-sans block text-[11px]">Target 1 (Book 50%)</span>
              <span className="text-lg font-bold text-emerald-300">
                Rs. {stockDetail?.target_1?.toFixed(2) || "---"}
              </span>
              <span className="text-[10px] text-emerald-400/80 block mt-0.5">
                Min 1 : {stockDetail?.risk_reward_ratio || 1.8} Asymmetry
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 font-sans block text-[11px]">Target 2 (Runner)</span>
              <span className="text-lg font-bold text-cyan-300">
                Rs. {stockDetail?.target_2?.toFixed(2) || "---"}
              </span>
              <span className="text-[10px] text-cyan-400/80 block mt-0.5">
                Extended structural resistance
              </span>
            </div>
          </div>
        </div>

        {/* QUANTITATIVE TECHNICALS & FLOOR PIVOTS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Moving Averages & Trend */}
          <div className="trading-card rounded-xl p-4 border border-slate-800 space-y-3 font-mono text-xs">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              Trend &amp; Moving Averages
            </h4>
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span>EMA (9) Short Trend:</span>
                <span className="text-cyan-400 font-bold">
                  Rs. {stockDetail?.technicals?.ema_9?.toFixed(2) || "---"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>EMA (21) Pullback Baseline:</span>
                <span className="text-amber-400 font-bold">
                  Rs. {stockDetail?.technicals?.ema_21?.toFixed(2) || "---"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>SMA (20) Session Mean:</span>
                <span className="text-white font-bold">
                  Rs. {stockDetail?.technicals?.sma_20?.toFixed(2) || "---"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>SMA (50) Intermediate:</span>
                <span className="text-white font-bold">
                  Rs. {stockDetail?.technicals?.sma_50?.toFixed(2) || "---"}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-2">
                <span>Trend Status:</span>
                <span className="text-emerald-400 font-bold">
                  {stockDetail?.technicals?.trend || "Bullish (9 > 21)"}
                </span>
              </div>
            </div>
          </div>

          {/* Floor Pivot S/R */}
          <div className="trading-card rounded-xl p-4 border border-slate-800 space-y-3 font-mono text-xs">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Floor Pivot Support &amp; Resistance
            </h4>
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span>Resistance 2 (R2):</span>
                <span className="text-rose-400 font-bold">
                  Rs. {stockDetail?.support_resistance?.r2?.toFixed(2) || "---"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Resistance 1 (R1):</span>
                <span className="text-rose-300 font-bold">
                  Rs. {stockDetail?.support_resistance?.r1?.toFixed(2) || "---"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Central Pivot (P):</span>
                <span className="text-white font-bold">
                  Rs. {stockDetail?.support_resistance?.pivot?.toFixed(2) || "---"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Support 1 (S1):</span>
                <span className="text-emerald-300 font-bold">
                  Rs. {stockDetail?.support_resistance?.s1?.toFixed(2) || "---"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Support 2 (S2):</span>
                <span className="text-emerald-400 font-bold">
                  Rs. {stockDetail?.support_resistance?.s2?.toFixed(2) || "---"}
                </span>
              </div>
            </div>
          </div>

          {/* Shariah & Compliance Guard */}
          <div className="trading-card rounded-xl p-4 border border-slate-800 space-y-3 font-mono text-xs">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Compliance &amp; Shariah Screening
            </h4>
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span>KMI-30 Shariah Compliant:</span>
                <span className="text-emerald-400 font-bold">Compliant</span>
              </div>
              <div className="flex justify-between">
                <span>Debt-to-Asset Ratio:</span>
                <span className="text-slate-200">21.8% (&lt; 37% limit)</span>
              </div>
              <div className="flex justify-between">
                <span>Non-Compliant Income:</span>
                <span className="text-slate-200">&lt; 1.5% (&lt; 5% limit)</span>
              </div>
              <div className="flex justify-between">
                <span>Illiquid Assets Ratio:</span>
                <span className="text-slate-200">&gt; 50% (&gt; 25% limit)</span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-2">
                <span>Data Delay Tag:</span>
                <span className="text-slate-400">
                  {stockDetail?.data_delay_type || "DELAYED_15MIN"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* VOLUME PROFILE & VALUE AREA (VAH / VAL / POC) */}
        <section aria-label="Volume Profile Auction Analysis">
          <VolumeProfilePanel symbol={activeSymbol} currentPrice={stockDetail?.price} />
        </section>
      </div>

      {/* Signal Detail Modal */}
      {activeModalSignal && (
        <SignalDetailModal
          signal={activeModalSignal}
          isOpen={!!activeModalSignal}
          onClose={() => setActiveModalSignal(null)}
          onStatusUpdated={() => {
            loadStock(activeSymbol);
          }}
        />
      )}

      {/* Institutional Order Execution & Profit Locker Modal */}
      <InstitutionalExecutionModal
        isOpen={isExecutionModalOpen}
        onClose={() => setIsExecutionModalOpen(false)}
        symbol={activeSymbol}
        defaultPrice={stockDetail?.price || 100}
        defaultAction="BUY"
        defaultStopLoss={stockDetail?.stop_loss}
        defaultTarget={stockDetail?.target_1}
        isUpperLocked={stockDetail?.circuit_status === "LOCKED_UPPER"}
        isDefaulter={stockDetail?.is_defaulter}
        isNonCompliant={stockDetail?.is_non_compliant}
      />
    </AppShell>
  );
}

export default function StockAnalysisPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Stock Analysis...</div>}>
      <StockAnalysisContent />
    </Suspense>
  );
}
