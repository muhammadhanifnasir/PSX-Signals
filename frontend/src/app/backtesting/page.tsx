"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import { History, Play, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";

export default function BacktestingPage() {
  const { marketStatus, isLiveBackend, isWsConnected, isLoading, refreshAllData } = useRealTimeMarket();

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={isLoading}
      onRefresh={refreshAllData}
    >
      <div className="space-y-6">
        <div className="trading-card rounded-xl p-5 border border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Algorithmic Backtesting Suite</h2>
              <p className="text-xs text-slate-400">Validate strategy edge using historical PSX daily & intraday candle datasets.</p>
            </div>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-all">
            <Play className="w-3.5 h-3.5 fill-current" />
            Run Simulation (2-Year PSX)
          </button>
        </div>

        {/* Backtest Benchmark Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="trading-card rounded-xl p-4 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Net ROI</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">+42.8%</span>
            <span className="text-[10px] text-slate-400 font-mono">Benchmark (KSE-100): +24.1%</span>
          </div>
          <div className="trading-card rounded-xl p-4 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Win Rate</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">68.4%</span>
            <span className="text-[10px] text-slate-400 font-mono">142 Wins / 66 Losses</span>
          </div>
          <div className="trading-card rounded-xl p-4 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Profit Factor</span>
            <span className="text-xl font-bold font-mono text-cyan-400 mt-1 block">2.35</span>
            <span className="text-[10px] text-slate-400 font-mono">Avg Win/Loss: 2.1:1</span>
          </div>
          <div className="trading-card rounded-xl p-4 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Max Drawdown</span>
            <span className="text-xl font-bold font-mono text-rose-400 mt-1 block">-6.8%</span>
            <span className="text-[10px] text-slate-400 font-mono">Sharpe Ratio: 1.84</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
