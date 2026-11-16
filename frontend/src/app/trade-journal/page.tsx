"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import { BookOpen, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/utils";

export default function TradeJournalPage() {
  const { marketStatus, isLiveBackend, isWsConnected, isLoading, refreshAllData } = useRealTimeMarket();

  const trades = [
    { id: "TR-1", symbol: "AIRLINK", type: "BUY", entryPrice: 133.50, exitPrice: 142.10, qty: 5000, pnl: 43000, pnlPct: 6.44, status: "CLOSED", date: "2026-11-15", strategy: "Volume Breakout" },
    { id: "TR-2", symbol: "ATRL", type: "BUY", entryPrice: 395.00, exitPrice: 412.30, qty: 2000, pnl: 34600, pnlPct: 4.38, status: "CLOSED", date: "2026-11-14", strategy: "EMA Golden Cross" },
    { id: "TR-3", symbol: "LUCK", type: "BUY", entryPrice: 935.00, exitPrice: null, qty: 1000, pnl: 10000, pnlPct: 1.07, status: "OPEN", date: "2026-11-16", strategy: "Support Bounce" },
    { id: "TR-4", symbol: "CNERGY", type: "SELL", entryPrice: 5.75, exitPrice: 5.45, qty: 50000, pnl: 15000, pnlPct: 5.21, status: "CLOSED", date: "2026-11-12", strategy: "Head & Shoulders" },
  ];

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={isLoading}
      onRefresh={refreshAllData}
    >
      <div className="trading-card rounded-xl border border-slate-800 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Trade Execution Journal</h2>
              <p className="text-xs text-slate-400">Post-trade quantitative analysis and performance tracking.</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-mono text-[11px] uppercase">
                <th className="py-3 px-4">Trade ID / Date</th>
                <th className="py-3 px-3">Symbol</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-right">Entry</th>
                <th className="py-3 px-3 text-right">Exit</th>
                <th className="py-3 px-3 text-right">Qty</th>
                <th className="py-3 px-3 text-right">Net PnL (PKR)</th>
                <th className="py-3 px-3">Strategy</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {trades.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-white">{t.id}</span>
                    <span className="text-[10px] text-slate-400 block">{t.date}</span>
                  </td>
                  <td className="py-3 px-3 font-bold text-emerald-400">{t.symbol}</td>
                  <td className="py-3 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200">
                      {t.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300">Rs. {t.entryPrice.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right text-slate-300">
                    {t.exitPrice ? `Rs. ${t.exitPrice.toFixed(2)}` : "-"}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300">{formatNumber(t.qty)}</td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-400">
                    +Rs. {formatNumber(t.pnl)} (+{t.pnlPct}%)
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-sans text-[11px]">{t.strategy}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 text-[10px] rounded font-semibold ${t.status === "CLOSED" ? "bg-slate-800 text-slate-300" : "bg-emerald-500/20 text-emerald-400"}`}>
                      {t.status}
                    </span>
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
