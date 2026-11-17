"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import {
  Radar,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Star,
  Search,
  Info,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  Layers,
  ArrowUpRight,
  X,
  Target,
  Activity,
  Check,
} from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/utils";
import { StockOpportunity, ScanRunSummary, ScannerThresholds, SetupType } from "@/lib/types";
import { api } from "@/lib/api";
import { initialRealOpportunities, initialScanRunSummary, initialScannerThresholds } from "@/lib/initialData";

type FilterTab =
  | "ALL"
  | "STRONG_MOMENTUM"
  | "BREAKOUT"
  | "PULLBACK"
  | "VOLUME_SURGE"
  | "HIGH_LIQUIDITY"
  | "WATCHLIST";

export default function ScannerPage() {
  const { marketStatus, isLiveBackend, isWsConnected } = useRealTimeMarket();

  const [opportunities, setOpportunities] = useState<StockOpportunity[]>([]);
  const [summary, setSummary] = useState<ScanRunSummary | null>(null);
  const [thresholds, setThresholds] = useState<ScannerThresholds>(initialScannerThresholds);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanningNow, setIsScanningNow] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set(["AIRLINK", "OGDC", "SYS"]));
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState<boolean>(false);
  const [thresholdDraft, setThresholdDraft] = useState<ScannerThresholds>(initialScannerThresholds);
  const [sortField, setSortField] = useState<keyof StockOpportunity>("opportunity_score");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [excludeDefaulters, setExcludeDefaulters] = useState<boolean>(true);
  const [shariahOnly, setShariahOnly] = useState<boolean>(false);
  const [minPriceFilter, setMinPriceFilter] = useState<number>(0);

  // Fetch opportunities and summary
  const loadScannerData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [oppsRes, summaryRes, threshRes] = await Promise.all([
        api.getScannerOpportunities({
          exclude_defaulters: excludeDefaulters,
          shariah_only: shariahOnly,
          min_price: minPriceFilter > 0 ? minPriceFilter : undefined,
        }),
        api.getScannerSummary(),
        api.getScannerThresholds(),
      ]);

      setOpportunities(oppsRes.data);
      setSummary(summaryRes.data);
      setThresholds(threshRes.data);
      setThresholdDraft(threshRes.data);

      if (summaryRes.data.status === "NO_DATA" || summaryRes.data.status === "ERROR") {
        setError(
          summaryRes.data.error_message ||
            "PSX market data is currently unavailable. Scanning cannot be performed."
        );
      }
    } catch (err: any) {
      console.warn("Error fetching scanner data:", err);
      setOpportunities(initialRealOpportunities);
      setSummary(initialScanRunSummary);
    } finally {
      setIsLoading(false);
    }
  }, [excludeDefaulters, shariahOnly, minPriceFilter]);

  useEffect(() => {
    loadScannerData();
  }, [loadScannerData]);

  // Trigger manual immediate scan
  const handleTriggerScan = async () => {
    setIsScanningNow(true);
    try {
      const res = await api.runInstantScan(true);
      setOpportunities(res.data);
      const sumRes = await api.getScannerSummary();
      setSummary(sumRes.data);
      if (sumRes.data.status === "NO_DATA") {
        setError(sumRes.data.error_message || "Real market data is currently unavailable.");
      } else {
        setError(null);
      }
    } catch (err: any) {
      setError("Failed to run market scan: " + err.message);
    } finally {
      setIsScanningNow(false);
    }
  };

  // Watchlist toggle
  const toggleWatchlist = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  // Save thresholds
  const handleSaveThresholds = async () => {
    try {
      const updated = await api.updateScannerThresholds(thresholdDraft);
      setThresholds(updated.data);
      setIsThresholdModalOpen(false);
      handleTriggerScan();
    } catch (err) {
      console.error("Failed to update thresholds", err);
    }
  };

  // Filter items
  const filteredItems = opportunities.filter((item) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSym = item.symbol.toLowerCase().includes(q);
      const matchComp = item.company_name.toLowerCase().includes(q);
      const matchSec = item.sector.toLowerCase().includes(q);
      if (!matchSym && !matchComp && !matchSec) return false;
    }

    // Tab filter
    switch (activeTab) {
      case "STRONG_MOMENTUM":
        return item.momentum_score >= 70;
      case "BREAKOUT":
        return item.setup_type === "BREAKOUT";
      case "PULLBACK":
        return item.setup_type === "PULLBACK";
      case "VOLUME_SURGE":
        return item.setup_type === "VOLUME_SURGE" || item.relative_volume >= 1.8;
      case "HIGH_LIQUIDITY":
        return item.volume >= 1_000_000 || item.last_price * item.volume >= 10_000_000;
      case "WATCHLIST":
        return watchlist.has(item.symbol);
      case "ALL":
      default:
        return true;
    }
  });

  // Sorting
  const sortedItems = [...filteredItems].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === "string") {
      return sortDirection === "asc"
        ? (aVal as string).localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal as string);
    }
    return sortDirection === "asc"
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  const toggleSort = (field: keyof StockOpportunity) => {
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
      onRefresh={loadScannerData}
      scannerCount={opportunities.length}
    >
      <div className="space-y-4">
        {/* TOP STATUS BAR & SCANNER METRICS */}
        <div className="trading-card rounded-xl border border-slate-800/90 p-4 bg-slate-900/60">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <Radar className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-white tracking-tight">
                    PSX Automated Market Scanner
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {summary?.provider_used || "PSX Official DPS Feed"}
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded">
                    {summary?.data_delay || "DELAYED_15MIN"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Scanning 467 PSX equities for VWAP reclaims, momentum breakouts, pullback demand zones & relative volume spikes.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsThresholdModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 rounded-lg border border-slate-700/80 transition-all"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                Configure Thresholds
              </button>

              <button
                onClick={handleTriggerScan}
                disabled={isScanningNow}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningNow ? "animate-spin" : ""}`} />
                {isScanningNow ? "Scanning Equities..." : "Run Scanner Now"}
              </button>
            </div>
          </div>

          {/* Mini Scanner Diagnostic strip */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono">
              <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                <span className="text-slate-500 block text-[10px]">TOTAL UNIVERSE</span>
                <span className="text-slate-200 font-bold">{summary.total_universe_count} Equities</span>
              </div>
              <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                <span className="text-slate-500 block text-[10px]">ELIGIBLE SCANNED</span>
                <span className="text-emerald-400 font-bold">{summary.eligible_stocks_scanned} Active</span>
              </div>
              <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                <span className="text-slate-500 block text-[10px]">STALE REJECTED</span>
                <span className="text-amber-400 font-bold">{summary.stale_stocks_rejected} Filtered</span>
              </div>
              <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                <span className="text-slate-500 block text-[10px]">OPPORTUNITIES</span>
                <span className="text-purple-400 font-bold">{summary.opportunities_found} Ranked</span>
              </div>
              <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                <span className="text-slate-500 block text-[10px]">SCAN LATENCY</span>
                <span className="text-cyan-400 font-bold">{summary.execution_time_ms.toFixed(1)} ms</span>
              </div>
              <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                <span className="text-slate-500 block text-[10px]">LAST SCAN RUN</span>
                <span className="text-slate-300 truncate block">{summary.scan_timestamp}</span>
              </div>
            </div>
          )}
        </div>

        {/* ERROR / REAL-DATA UNAVAILABLE BANNER */}
        {error && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-amber-300 block">
                Market Data Feed Notification
              </span>
              <p className="text-amber-200/80 mt-0.5">{error}</p>
              <p className="text-[11px] text-amber-300/70 mt-1 font-mono">
                Note: In accordance with trading engine safety principles, stale or missing public market data is strictly rejected from active trade opportunities.
              </p>
            </div>
          </div>
        )}

        {/* INSTITUTIONAL MICROSTRUCTURE & COMPLIANCE CONTROLS */}
        <div className="trading-card rounded-xl border border-slate-800/90 p-3 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              Institutional Filters:
            </span>

            {/* Exclude Defaulters Toggle */}
            <button
              onClick={() => setExcludeDefaulters(!excludeDefaulters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all border ${
                excludeDefaulters
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all border ${
                shariahOnly
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-white border-slate-700/60"
              }`}
              title="Show only KMI Shariah-Compliant Equities"
            >
              <span className={`w-2 h-2 rounded-full ${shariahOnly ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
              <span>Shariah (KMI) Only</span>
            </button>

            {/* Min Price Dropdown */}
            <div className="flex items-center gap-1.5 font-mono text-slate-400 bg-slate-950/70 border border-slate-800 px-2.5 py-1 rounded-lg">
              <span className="text-[10px] uppercase text-slate-500">Min Price:</span>
              <select
                value={minPriceFilter}
                onChange={(e) => setMinPriceFilter(Number(e.target.value))}
                className="bg-transparent text-slate-200 text-xs font-mono focus:outline-none cursor-pointer"
              >
                <option value={0} className="bg-slate-900 text-slate-200">All Prices</option>
                <option value={10} className="bg-slate-900 text-slate-200">&gt; Rs. 10.00</option>
                <option value={25} className="bg-slate-900 text-slate-200">&gt; Rs. 25.00</option>
                <option value={50} className="bg-slate-900 text-slate-200">&gt; Rs. 50.00</option>
                <option value={100} className="bg-slate-900 text-slate-200">&gt; Rs. 100.00</option>
              </select>
            </div>
          </div>

          {/* Microstructure Metrics & Circuit Breaker Legend */}
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 ml-auto">
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
              PSX Circuit: ±7.5% / PKR 1.00
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              Upper Lock Guard: On
            </span>
          </div>
        </div>

        {/* FILTER BAR & SEARCH */}
        <div className="trading-card rounded-xl border border-slate-800/90 p-3 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            {[
              { id: "ALL", label: "All Opportunities", count: opportunities.length },
              {
                id: "STRONG_MOMENTUM",
                label: "Strong Momentum",
                count: opportunities.filter((o) => o.momentum_score >= 70).length,
              },
              {
                id: "BREAKOUT",
                label: "Breakout",
                count: opportunities.filter((o) => o.setup_type === "BREAKOUT").length,
              },
              {
                id: "PULLBACK",
                label: "Pullback",
                count: opportunities.filter((o) => o.setup_type === "PULLBACK").length,
              },
              {
                id: "VOLUME_SURGE",
                label: "Volume Surge",
                count: opportunities.filter((o) => o.setup_type === "VOLUME_SURGE" || o.relative_volume >= 1.8).length,
              },
              {
                id: "HIGH_LIQUIDITY",
                label: "High Liquidity (>1M)",
                count: opportunities.filter((o) => o.volume >= 1_000_000).length,
              },
              {
                id: "WATCHLIST",
                label: "Watchlist Stocks",
                count: opportunities.filter((o) => watchlist.has(o.symbol)).length,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as FilterTab)}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-purple-600/25 text-purple-200 border border-purple-500/50 shadow-sm"
                      : "bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/40"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? "bg-purple-500/30 text-purple-100" : "bg-slate-700/60 text-slate-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol, company, or sector..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950/70 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 13-COLUMN PROFESSIONAL SCANNER TABLE */}
        <div className="trading-card rounded-xl border border-slate-800/90 overflow-hidden bg-slate-950/30">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-mono text-[10.5px] uppercase tracking-wider select-none">
                  <th className="py-3 px-3.5">
                    <span className="sr-only">Watchlist</span>
                  </th>
                  <th
                    onClick={() => toggleSort("symbol")}
                    className="py-3 px-3 cursor-pointer hover:text-white"
                  >
                    1. Symbol
                  </th>
                  <th
                    onClick={() => toggleSort("company_name")}
                    className="py-3 px-3 cursor-pointer hover:text-white"
                  >
                    2. Company
                  </th>
                  <th
                    onClick={() => toggleSort("last_price")}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  >
                    3. Last Price
                  </th>
                  <th
                    onClick={() => toggleSort("price_change_percent")}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  >
                    4. Change %
                  </th>
                  <th
                    onClick={() => toggleSort("volume")}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  >
                    5. Volume
                  </th>
                  <th
                    onClick={() => toggleSort("relative_volume")}
                    className="py-3 px-3 text-center cursor-pointer hover:text-white"
                  >
                    6. Rel Vol
                  </th>
                  <th
                    onClick={() => toggleSort("vwap")}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  >
                    7. VWAP
                  </th>
                  <th className="py-3 px-3">8. EMA Trend</th>
                  <th
                    onClick={() => toggleSort("rsi_14")}
                    className="py-3 px-3 text-center cursor-pointer hover:text-white"
                  >
                    9. RSI
                  </th>
                  <th
                    onClick={() => toggleSort("momentum_score")}
                    className="py-3 px-3 text-center cursor-pointer hover:text-white"
                  >
                    10. Momentum
                  </th>
                  <th
                    onClick={() => toggleSort("opportunity_score")}
                    className="py-3 px-3 text-center cursor-pointer hover:text-white"
                  >
                    11. Opp Score
                  </th>
                  <th className="py-3 px-3">12. Setup Type</th>
                  <th className="py-3 px-3.5 text-right">13. Freshness</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 font-mono">
                {sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-slate-400 font-sans">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Radar className="w-8 h-8 text-slate-600 animate-pulse" />
                        <span className="font-semibold text-slate-300">
                          No Stock Opportunities Match Filter
                        </span>
                        <p className="text-xs text-slate-500 max-w-md">
                          Try adjusting scanner thresholds, selecting "All Opportunities", or triggering an on-demand market scan.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedItems.map((item) => {
                    const isPositive = item.price_change_percent >= 0;
                    const isAboveVwap = item.last_price >= item.vwap;
                    const isWatchlisted = watchlist.has(item.symbol);
                    const isExpanded = expandedSymbol === item.symbol;

                    return (
                      <React.Fragment key={item.symbol}>
                        <tr
                          onClick={() => setExpandedSymbol(isExpanded ? null : item.symbol)}
                          className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                            isExpanded ? "bg-slate-800/50" : ""
                          }`}
                        >
                          {/* Watchlist toggle */}
                          <td className="py-3 px-3.5 text-center">
                            <button
                              onClick={(e) => toggleWatchlist(item.symbol, e)}
                              className="text-slate-500 hover:text-amber-400 transition-colors"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  isWatchlisted ? "text-amber-400 fill-amber-400" : ""
                                }`}
                              />
                            </button>
                          </td>

                          {/* 1. Symbol */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white text-[13px]">{item.symbol}</span>
                              {item.is_defaulter ? (
                                <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40" title="PSX Defaulter Segment">
                                  DEF
                                </span>
                              ) : item.is_non_compliant ? (
                                <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40" title="PSX Non-Compliant Segment">
                                  NC
                                </span>
                              ) : item.is_shariah_compliant ? (
                                <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" title="KMI Shariah Compliant">
                                  KMI
                                </span>
                              ) : (
                                <span className="text-[9px] px-1 py-0.2 rounded font-mono text-slate-400 bg-slate-800/80 border border-slate-700" title="PSX Mainboard">
                                  MAIN
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-slate-400 truncate max-w-[90px] font-sans">
                                {item.sector}
                              </span>
                              {item.sector_quadrant && (
                                <span className={`text-[8.5px] px-1 py-0.2 rounded font-bold uppercase font-mono ${
                                  item.sector_quadrant === "LEADING"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : item.sector_quadrant === "IMPROVING"
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                    : item.sector_quadrant === "WEAKENING"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                }`}>
                                  {item.sector_quadrant}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 2. Company */}
                          <td className="py-3 px-3 font-sans text-slate-300 max-w-[150px] truncate">
                            <div className="truncate font-medium">{item.company_name}</div>
                          </td>

                          {/* 3. Last Price & Circuit Breaker */}
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-slate-100 text-xs font-mono">
                              Rs. {item.last_price.toFixed(2)}
                            </div>
                            {item.circuit_status === "LOCKED_UPPER" ? (
                              <span className="inline-block px-1 py-0.2 text-[9px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse font-mono">
                                LOCKED +7.5%
                              </span>
                            ) : item.circuit_status === "CAP_DANGER" ? (
                              <span className="inline-block px-1 py-0.2 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                                CAP &lt;1.2%
                              </span>
                            ) : item.circuit_breaker_upper ? (
                              <span className="text-[9px] text-slate-500 block font-mono">
                                Cap {item.circuit_breaker_upper.toFixed(1)}
                              </span>
                            ) : null}
                          </td>

                          {/* 4. Price Change % */}
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                isPositive
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-rose-500/15 text-rose-400"
                              }`}
                            >
                              {isPositive ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {formatPercent(item.price_change_percent)}
                            </span>
                          </td>

                          {/* 5. Volume */}
                          <td className="py-3 px-3 text-right text-slate-300">
                            <span className="font-semibold">{item.volume_formatted}</span>
                          </td>

                          {/* 6. Relative Volume */}
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold text-[11px] ${
                                item.relative_volume >= 2.0
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                  : item.relative_volume >= 1.4
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : "bg-slate-800 text-slate-300"
                              }`}
                            >
                              {item.relative_volume.toFixed(2)}x
                            </span>
                          </td>

                          {/* 7. VWAP */}
                          <td className="py-3 px-3 text-right">
                            <div className="font-semibold text-slate-200">
                              Rs. {item.vwap.toFixed(2)}
                            </div>
                            <span
                              className={`text-[9px] ${
                                isAboveVwap ? "text-emerald-400" : "text-amber-400"
                              }`}
                            >
                              {isAboveVwap ? "Above VWAP" : "Below VWAP"}
                            </span>
                          </td>

                          {/* 8. EMA Trend */}
                          <td className="py-3 px-3 font-sans">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold block w-fit ${
                                item.ema_trend.includes("Strong Bullish")
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                  : item.ema_trend.includes("Bullish")
                                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                                  : "bg-slate-800 text-slate-400 border border-slate-700"
                              }`}
                            >
                              {item.ema_trend}
                            </span>
                          </td>

                          {/* 9. RSI */}
                          <td className="py-3 px-3 text-center">
                            <div className="font-bold text-slate-200">{item.rsi_14.toFixed(1)}</div>
                            <span
                              className={`text-[9px] block ${
                                item.rsi_14 >= 70
                                  ? "text-amber-400"
                                  : item.rsi_14 <= 40
                                  ? "text-blue-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {item.rsi_14 >= 70
                                ? "Overbought"
                                : item.rsi_14 <= 40
                                ? "Oversold"
                                : "Healthy"}
                            </span>
                          </td>

                          {/* 10. Momentum Score */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-10 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    item.momentum_score >= 80
                                      ? "bg-emerald-400"
                                      : item.momentum_score >= 65
                                      ? "bg-purple-400"
                                      : "bg-cyan-400"
                                  }`}
                                  style={{ width: `${item.momentum_score}%` }}
                                />
                              </div>
                              <span className="font-bold text-slate-100 text-xs">
                                {item.momentum_score}
                              </span>
                            </div>
                          </td>

                          {/* 11. Opportunity Score */}
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-xs inline-block ${
                                item.opportunity_score >= 80
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                                  : item.opportunity_score >= 70
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                  : "bg-slate-800 text-slate-300 border border-slate-700"
                              }`}
                            >
                              {item.opportunity_score}
                            </span>
                          </td>

                          {/* 12. Setup Type & Circuit Warning */}
                          <td className="py-3 px-3 font-sans">
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.setup_type === "BREAKOUT"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : item.setup_type === "VWAP_RECLAIM"
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                    : item.setup_type === "PULLBACK"
                                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                    : "bg-slate-800 text-slate-300"
                                }`}
                              >
                                {item.setup_type}
                              </span>

                              {/* Upper Circuit Lock & Proximity Warning */}
                              {item.circuit_status === "LOCKED_UPPER" ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold border border-rose-500/40 animate-pulse">
                                  <ShieldAlert className="w-2.5 h-2.5 text-rose-400" />
                                  Circuit Locked (Ask 0)
                                </span>
                              ) : item.circuit_status === "CAP_DANGER" || item.is_late_entry_risk ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-semibold border border-amber-500/30">
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                                  Near Circuit Cap
                                </span>
                              ) : null}
                            </div>
                          </td>

                          {/* 13. Data Freshness */}
                          <td className="py-3 px-3.5 text-right font-mono text-[11px] text-slate-400">
                            <div className="flex items-center justify-end gap-1 text-slate-300">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{item.data_freshness_seconds}s ago</span>
                            </div>
                            <span className="text-[9px] text-slate-500 block truncate">
                              {item.data_delay_type}
                            </span>
                          </td>
                        </tr>

                        {/* EXPANDED OPPORTUNITY DETAILS DRAWER */}
                        {isExpanded && (
                          <tr className="bg-slate-900/80 border-b border-slate-800 font-sans">
                            <td colSpan={14} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                                {/* Column 1: Trade Setup Strategy */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-emerald-400" />
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                      Setup Strategy & Thesis
                                    </h4>
                                  </div>
                                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                                    {item.setup_description}
                                  </p>
                                  <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px]">
                                    <span className="text-slate-400">Sector:</span>
                                    <span className="font-semibold text-slate-200">
                                      {item.sector}
                                    </span>
                                    <span className="text-slate-600">|</span>
                                    <span className="text-slate-400">ATR(14):</span>
                                    <span className="font-mono text-cyan-300">
                                      Rs. {item.atr_14.toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {/* Column 2: Recommended Entry & Risk/Reward */}
                                <div className="space-y-1 font-mono text-xs">
                                  <span className="text-slate-400 block text-[10px] uppercase">
                                    Trade Parameters
                                  </span>
                                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                                    <span className="text-slate-400">Entry Recommended:</span>
                                    <span className="font-bold text-white">
                                      Rs. {item.entry_price_recommended.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                                    <span className="text-slate-400">Stop Loss:</span>
                                    <span className="font-bold text-rose-400">
                                      Rs. {item.stop_loss_recommended.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                                    <span className="text-slate-400">Target 1:</span>
                                    <span className="font-bold text-emerald-400">
                                      Rs. {item.target_price_recommended.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between pt-1">
                                    <span className="text-slate-400">Risk/Reward:</span>
                                    <span className="font-bold text-cyan-300">
                                      1 : {item.risk_reward_ratio}
                                    </span>
                                  </div>
                                </div>

                                {/* Column 3: PSX Microstructure & Circuit Limits */}
                                <div className="space-y-1 font-mono text-xs">
                                  <span className="text-slate-400 block text-[10px] uppercase flex items-center gap-1 font-bold">
                                    <Shield className="w-3 h-3 text-blue-400" />
                                    PSX Circuit Limits
                                  </span>
                                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                                    <span className="text-slate-400">Upper Cap (+7.5%):</span>
                                    <span className="font-bold text-emerald-400">
                                      Rs. {item.circuit_breaker_upper?.toFixed(2) || (item.last_price * 1.075).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                                    <span className="text-slate-400">Lower Cap (-7.5%):</span>
                                    <span className="font-bold text-rose-400">
                                      Rs. {item.circuit_breaker_lower?.toFixed(2) || (item.last_price * 0.925).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                                    <span className="text-slate-400">Cap Distance:</span>
                                    <span
                                      className={`font-bold ${
                                        item.circuit_status === "LOCKED_UPPER"
                                          ? "text-rose-400"
                                          : (item.cap_distance_pct ?? 10) <= 1.2
                                          ? "text-amber-400"
                                          : "text-slate-200"
                                      }`}
                                    >
                                      {item.cap_distance_pct !== undefined ? `${item.cap_distance_pct.toFixed(2)}%` : "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between pt-1">
                                    <span className="text-slate-400">Compliance:</span>
                                    <span className="font-semibold text-slate-300">
                                      {item.regulatory_category ||
                                        (item.is_defaulter
                                          ? "DEFAULTER"
                                          : item.is_non_compliant
                                          ? "NON-COMPLIANT"
                                          : item.is_shariah_compliant
                                          ? "KMI SHARIAH"
                                          : "MAINBOARD")}
                                    </span>
                                  </div>
                                </div>

                                {/* Column 4: Pivot Extremes & Analysis */}
                                <div className="space-y-2 font-mono text-xs">
                                  <span className="text-slate-400 block text-[10px] uppercase">
                                    Pivot Extremes
                                  </span>
                                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                                    <span className="text-slate-400">Pivot Resistance:</span>
                                    <span className="font-bold text-amber-300">
                                      Rs. {item.resistance_level.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                                    <span className="text-slate-400">Pivot Support:</span>
                                    <span className="font-bold text-blue-300">
                                      Rs. {item.support_level.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="pt-2">
                                    <a
                                      href={`/stock-analysis?symbol=${item.symbol}`}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-sans text-xs font-semibold transition-colors"
                                    >
                                      Deep Technical Analysis
                                      <ArrowUpRight className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* THRESHOLDS CONFIGURATION MODAL */}
        {isThresholdModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="trading-card rounded-2xl border border-slate-700 bg-slate-900 w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Configure Scanner Thresholds</h3>
                </div>
                <button
                  onClick={() => setIsThresholdModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs font-mono max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="text-slate-300 block mb-1">
                    Min Volume (Traded Shares):
                  </label>
                  <input
                    type="number"
                    value={thresholdDraft.min_volume}
                    onChange={(e) =>
                      setThresholdDraft({ ...thresholdDraft, min_volume: Number(e.target.value) })
                    }
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                  <span className="text-[10px] text-slate-500">Excludes illiquid penny symbols</span>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">
                    Min Daily Turnover (PKR):
                  </label>
                  <input
                    type="number"
                    value={thresholdDraft.min_turnover_pkr}
                    onChange={(e) =>
                      setThresholdDraft({
                        ...thresholdDraft,
                        min_turnover_pkr: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Min Price (PKR):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={thresholdDraft.min_price}
                      onChange={(e) =>
                        setThresholdDraft({ ...thresholdDraft, min_price: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Max Price (PKR):</label>
                    <input
                      type="number"
                      value={thresholdDraft.max_price}
                      onChange={(e) =>
                        setThresholdDraft({ ...thresholdDraft, max_price: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Min RVOL (Relative Vol):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={thresholdDraft.min_relative_volume}
                      onChange={(e) =>
                        setThresholdDraft({
                          ...thresholdDraft,
                          min_relative_volume: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Late Entry Buffer (%):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={thresholdDraft.late_entry_buffer_pct}
                      onChange={(e) =>
                        setThresholdDraft({
                          ...thresholdDraft,
                          late_entry_buffer_pct: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Min Momentum Score (0-100):</label>
                    <input
                      type="number"
                      value={thresholdDraft.min_momentum_score}
                      onChange={(e) =>
                        setThresholdDraft({
                          ...thresholdDraft,
                          min_momentum_score: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Min Opp Score (0-100):</label>
                    <input
                      type="number"
                      value={thresholdDraft.min_opportunity_score}
                      onChange={(e) =>
                        setThresholdDraft({
                          ...thresholdDraft,
                          min_opportunity_score: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">
                    Max Stale Data Timeout (Seconds):
                  </label>
                  <input
                    type="number"
                    value={thresholdDraft.max_stale_data_seconds}
                    onChange={(e) =>
                      setThresholdDraft({
                        ...thresholdDraft,
                        max_stale_data_seconds: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                  <span className="text-[10px] text-slate-500">
                    Observations older than this threshold are rejected from signal generation.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-800 bg-slate-950/40">
                <button
                  onClick={() => setThresholdDraft(initialScannerThresholds)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Reset Defaults
                </button>
                <button
                  onClick={() => setIsThresholdModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveThresholds}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg"
                >
                  Save & Rescan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}