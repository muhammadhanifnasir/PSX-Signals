"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SignalOverviewTable } from "@/components/dashboard/SignalOverviewTable";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import { Zap, ShieldCheck, TrendingUp, Sparkles } from "lucide-react";

export default function SignalsPage() {
  const { signals, marketStatus, isLiveBackend, isWsConnected, isLoading, refreshAllData } = useRealTimeMarket();

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={isLoading}
      onRefresh={refreshAllData}
      activeSignalsCount={signals.total_signals}
    >
      <div className="space-y-6">
        {/* Signals Header Banner */}
        <div className="trading-card rounded-xl p-5 border border-slate-800 bg-gradient-to-r from-emerald-950/20 via-slate-900/60 to-cyan-950/20 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Algorithmic Signals Hub</h2>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Systematic quantitative trading signals generated via multi-timeframe price action, exponential moving averages, and order flow volume surges.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              Strong Buys: <span className="font-bold">{signals.strong_buy_count}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              Total Active: <span className="font-bold">{signals.total_signals}</span>
            </div>
          </div>
        </div>

        {/* Signals Table */}
        <SignalOverviewTable signals={signals.signals} />
      </div>
    </AppShell>
  );
}
