"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import { BookmarkCheck, Plus, Trash2, Bell, TrendingUp } from "lucide-react";

export default function WatchlistPage() {
  const { marketStatus, isLiveBackend, isWsConnected, isLoading, refreshAllData } = useRealTimeMarket();

  const [watchlist, setWatchlist] = useState([
    { symbol: "AIRLINK", name: "Air Link Communication", currentPrice: 142.10, targetBuy: 138.00, alert: true, notes: "Wait for 138 pullback or breakout above 145." },
    { symbol: "ATRL", name: "Attock Refinery", currentPrice: 412.30, targetBuy: 405.00, alert: true, notes: "Monitor refinery policy notification." },
    { symbol: "LUCK", name: "Lucky Cement", currentPrice: 945.00, targetBuy: 920.00, alert: false, notes: "Accumulate near 50-day moving average." },
    { symbol: "HUBC", name: "Hub Power Company", currentPrice: 138.20, targetBuy: 135.00, alert: true, notes: "High dividend safety yield." },
    { symbol: "SYS", name: "Systems Limited", currentPrice: 482.00, targetBuy: 470.00, alert: false, notes: "Tech recovery play." },
  ]);

  const [newSymbol, setNewSymbol] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    setWatchlist([
      ...watchlist,
      {
        symbol: newSymbol.trim().toUpperCase(),
        name: `${newSymbol.trim().toUpperCase()} Pakistan`,
        currentPrice: 120.0,
        targetBuy: 115.0,
        alert: true,
        notes: "Added to priority watchlist.",
      },
    ]);
    setNewSymbol("");
  };

  const handleRemove = (sym: string) => {
    setWatchlist(watchlist.filter((item) => item.symbol !== sym));
  };

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={isLoading}
      onRefresh={refreshAllData}
    >
      <div className="trading-card rounded-xl border border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Active Stock Watchlist</h2>
              <p className="text-xs text-slate-400">Custom price alerts and entry triggers</p>
            </div>
          </div>

          {/* Add form */}
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Symbol (e.g. ENGRO)..."
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-mono text-[11px] uppercase">
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-3 text-right">Current Price</th>
                <th className="py-3 px-3 text-right">Target Buy</th>
                <th className="py-3 px-3 text-center">Alert Active</th>
                <th className="py-3 px-3">Trading Notes</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {watchlist.map((item) => (
                <tr key={item.symbol} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-white text-xs">{item.symbol}</span>
                    <span className="text-[10px] text-slate-400 block font-sans">{item.name}</span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-200">
                    Rs. {item.currentPrice.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-400 font-semibold">
                    Rs. {item.targetBuy.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <Bell className="w-3 h-3" />
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-3 font-sans text-slate-300 text-xs">
                    {item.notes}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleRemove(item.symbol)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Remove from Watchlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
