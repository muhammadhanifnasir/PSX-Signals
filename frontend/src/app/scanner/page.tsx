"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import { Radar, Filter, RefreshCw, CheckCircle, ArrowUpRight } from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/utils";

export default function ScannerPage() {
  const { scannerResults, marketStatus, isLiveBackend, isWsConnected, isLoading, refreshAllData } = useRealTimeMarket();
  const [minScore, setMinScore] = useState<number>(75);
  const [filterPattern, setFilterPattern] = useState<string>("ALL");

  const filteredItems = scannerResults.results.filter((item) => {
    if (item.confidence_score < minScore) return false;
    if (filterPattern !== "ALL" && !item.detected_pattern.toLowerCase().includes(filterPattern.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={isLoading}
      onRefresh={refreshAllData}
      scannerCount={filteredItems.length}
    >
      <div className="trading-card rounded-xl border border-slate-800/90 overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Radar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">PSX Real-Time Market Scanner</h2>
              <p className="text-xs text-slate-400">
                Automated scanning across 388 listed equities for volume spikes, momentum breakouts & chart patterns.
              </p>
            </div>
          </div>

          {/* Trigger Scan Button */}
          <button
            onClick={refreshAllData}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Run Scanner Now
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/40 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Min Score:</span>
            <input
              type="range"
              min="60"
              max="95"
              step="5"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="accent-emerald-500 cursor-pointer"
            />
            <span className="text-emerald-400 font-bold">{minScore}%</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Pattern:</span>
            {["ALL", "Breakout", "Double Bottom", "Triangle"].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPattern(p)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterPattern === p
                    ? "bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-mono text-[11px] uppercase">
                <th className="py-3 px-4">Symbol / Company</th>
                <th className="py-3 px-3 text-right">Price</th>
                <th className="py-3 px-3 text-right">Change</th>
                <th className="py-3 px-3 text-right">Volume</th>
                <th className="py-3 px-3 text-center">Rel Vol</th>
                <th className="py-3 px-3 text-center">RSI(14)</th>
                <th className="py-3 px-3">MACD & Trend</th>
                <th className="py-3 px-3">Detected Pattern</th>
                <th className="py-3 px-4 text-center">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredItems.map((item) => {
                const isPositive = item.change_percent >= 0;
                return (
                  <tr key={item.symbol} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{item.symbol}</span>
                        {item.is_shariah_compliant && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
                            Shariah
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{item.company_name}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-100">
                      Rs. {item.price.toFixed(2)}
                    </td>
                    <td className={`py-3 px-3 text-right font-semibold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatPercent(item.change_percent)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">
                      {formatNumber(item.volume)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold text-[11px]">
                        {item.rel_volume}x
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-300">
                      {item.rsi_14}
                    </td>
                    <td className="py-3 px-3 text-[11px] font-sans">
                      <span className="text-cyan-400 block">{item.macd_signal}</span>
                      <span className="text-slate-400 text-[10px]">{item.ema_trend}</span>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-purple-300 text-[10px] font-semibold border border-purple-500/20">
                        {item.detected_pattern}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-bold text-emerald-400">
                        {item.confidence_score}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
