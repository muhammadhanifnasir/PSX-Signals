"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import { WatchlistItem } from "@/lib/types";
import { api } from "@/lib/api";
import {
  BookmarkCheck,
  Plus,
  Trash2,
  Bell,
  BellOff,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Target,
  Zap,
  Edit2,
  X,
  Search,
  Check,
} from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/utils";

export default function WatchlistPage() {
  const { marketStatus, isLiveBackend, isWsConnected, isLoading, refreshAllData } =
    useRealTimeMarket();

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New stock form state
  const [newSymbol, setNewSymbol] = useState("");
  const [targetBuy, setTargetBuy] = useState("");
  const [targetSell, setTargetSell] = useState("");
  const [notes, setNotes] = useState("");
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const loadWatchlistData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getWatchlist();
      setWatchlist(res.data);
    } catch (err) {
      console.warn("Failed to load watchlist:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWatchlistData();
  }, [loadWatchlistData]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    setIsSubmitting(true);
    try {
      await api.addToWatchlist({
        symbol: newSymbol.trim().toUpperCase(),
        target_buy_price: targetBuy ? parseFloat(targetBuy) : undefined,
        target_sell_price: targetSell ? parseFloat(targetSell) : undefined,
        alert_enabled: alertEnabled,
        notes: notes.trim(),
      });
      setIsAddModalOpen(false);
      setNewSymbol("");
      setTargetBuy("");
      setTargetSell("");
      setNotes("");
      await loadWatchlistData();
    } catch (err) {
      console.error("Error adding to watchlist:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (sym: string) => {
    try {
      await api.removeFromWatchlist(sym);
      setWatchlist((prev) => prev.filter((item) => item.symbol !== sym));
    } catch (err) {
      console.error("Error removing from watchlist:", err);
    }
  };

  const handleToggleAlert = async (sym: string) => {
    try {
      const res = await api.toggleWatchlistAlert(sym);
      if (res.success) {
        setWatchlist((prev) =>
          prev.map((item) =>
            item.symbol === sym ? { ...item, alert_enabled: res.alert_enabled ?? !item.alert_enabled } : item
          )
        );
      }
    } catch (err) {
      console.error("Error toggling alert:", err);
    }
  };

  const filteredWatchlist = watchlist.filter((item) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      item.symbol.toLowerCase().includes(q) ||
      item.company_name.toLowerCase().includes(q) ||
      item.sector.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={isLoading}
      onRefresh={loadWatchlistData}
    >
      <div className="space-y-4">
        {/* Header Toolbar */}
        <div className="trading-card rounded-xl border border-slate-800/90 p-5 bg-slate-900/60 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <BookmarkCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-white tracking-tight">
                    Active Stock Watchlist &amp; Price Triggers
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {watchlist.length} Stocks Monitored
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time PSX prices joined with active algorithmic signals, custom target entry brackets, and instant alert toggles.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter watchlist..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Stock
              </button>
            </div>
          </div>
        </div>

        {/* Watchlist Table */}
        <div className="trading-card rounded-xl border border-slate-800/90 overflow-hidden bg-slate-950/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-mono text-[10.5px] uppercase tracking-wider select-none">
                  <th className="py-3 px-4">Symbol / Sector</th>
                  <th className="py-3 px-3 text-right">Current Price</th>
                  <th className="py-3 px-3 text-right">Day Change</th>
                  <th className="py-3 px-3 text-right">Target Buy</th>
                  <th className="py-3 px-3 text-right">Target Sell</th>
                  <th className="py-3 px-3">Active Signal</th>
                  <th className="py-3 px-3 text-center">Alerts</th>
                  <th className="py-3 px-4">Trading Notes</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredWatchlist.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <BookmarkCheck className="w-8 h-8 text-slate-600" />
                        <span className="font-semibold text-slate-300">
                          {searchFilter ? "No matching symbols found" : "Your Watchlist is Empty"}
                        </span>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Click "Add Stock" to add PSX equities with custom price triggers and trading notes.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredWatchlist.map((item) => {
                    const isPos = item.change >= 0;
                    return (
                      <tr key={item.symbol} className="hover:bg-slate-800/40 transition-colors">
                        {/* 1. Symbol / Sector */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/stock-analysis?symbol=${item.symbol}`}
                              className="font-bold text-white text-xs hover:text-emerald-400 transition-colors"
                            >
                              {item.symbol}
                            </Link>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
                              PSX
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 truncate max-w-[140px] block font-sans">
                            {item.company_name}
                          </span>
                        </td>

                        {/* 2. Current Price */}
                        <td className="py-3 px-3 text-right font-bold text-slate-100 text-xs">
                          Rs. {item.current_price.toFixed(2)}
                        </td>

                        {/* 3. Day Change */}
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-flex items-center font-semibold text-[11px] ${
                              isPos ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {isPos ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                            {isPos ? `+${item.change.toFixed(2)}` : item.change.toFixed(2)} (
                            {formatPercent(item.change_percent)})
                          </span>
                        </td>

                        {/* 4. Target Buy */}
                        <td className="py-3 px-3 text-right text-emerald-400 font-semibold">
                          {item.target_buy_price ? `Rs. ${item.target_buy_price.toFixed(2)}` : "---"}
                        </td>

                        {/* 5. Target Sell */}
                        <td className="py-3 px-3 text-right text-cyan-300 font-semibold">
                          {item.target_sell_price ? `Rs. ${item.target_sell_price.toFixed(2)}` : "---"}
                        </td>

                        {/* 6. Active Signal */}
                        <td className="py-3 px-3 font-sans">
                          {item.active_signal_action ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                item.active_signal_action === "BUY" || item.active_signal_action === "STRONG_BUY"
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                  : item.active_signal_action === "WATCH"
                                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                                  : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              <Zap className="w-3 h-3" />
                              {item.active_signal_action} ({item.active_signal_score || 70})
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">No active signal</span>
                          )}
                        </td>

                        {/* 7. Alerts */}
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleToggleAlert(item.symbol)}
                            title={item.alert_enabled ? "Alerts Active (Click to mute)" : "Alerts Muted (Click to enable)"}
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.alert_enabled
                                ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30"
                                : "bg-slate-800 text-slate-500 hover:bg-slate-700 border border-slate-700"
                            }`}
                          >
                            {item.alert_enabled ? (
                              <Bell className="w-3.5 h-3.5" />
                            ) : (
                              <BellOff className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>

                        {/* 8. Trading Notes */}
                        <td className="py-3 px-4 font-sans text-slate-300 text-xs max-w-xs truncate">
                          {item.notes || <span className="text-slate-500 italic">No notes</span>}
                        </td>

                        {/* 9. Actions */}
                        <td className="py-3 px-4 text-center font-sans">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              href={`/stock-analysis?symbol=${item.symbol}`}
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                              title="Open in Stock Analysis"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              onClick={() => handleRemove(item.symbol)}
                              className="p-1.5 rounded bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Remove from Watchlist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

        {/* ADD STOCK MODAL */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="trading-card rounded-2xl border border-slate-700 bg-slate-900 w-full max-w-md overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
                <div className="flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Add Stock to Watchlist</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-5 space-y-4 text-xs font-mono">
                <div>
                  <label className="text-slate-300 block mb-1">Symbol (e.g. OGDC, LUCK, HUBC):</label>
                  <input
                    type="text"
                    required
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                    placeholder="OGDC"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-emerald-500 uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Target Buy Price (Rs.):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={targetBuy}
                      onChange={(e) => setTargetBuy(e.target.value)}
                      placeholder="162.00"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Target Sell Price (Rs.):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={targetSell}
                      onChange={(e) => setTargetSell(e.target.value)}
                      placeholder="175.00"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-sans">Trading Notes &amp; Rationale:</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Monitor for VWAP pullback or volume breakout above resistance."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-sans text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-300 font-sans">Enable Telegram &amp; In-App Alerts</span>
                  <input
                    type="checkbox"
                    checked={alertEnabled}
                    onChange={(e) => setAlertEnabled(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
                  >
                    {isSubmitting ? "Adding..." : "Add to Watchlist"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
