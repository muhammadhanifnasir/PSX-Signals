"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import { ShieldCheck, AlertCircle, Percent, Lock } from "lucide-react";

export default function RiskManagementPage() {
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
        <div className="trading-card rounded-xl p-5 border border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Risk Management & Capital Preservation Rules</h2>
            <p className="text-xs text-slate-400">Automated guards to limit exposure, prevent drawdown cascades, and protect trading accounts.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="trading-card rounded-xl p-5 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-400" />
              Maximum Risk Per Trade
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standard 1.5% maximum capital risk per signal. Position size is dynamically scaled based on the stop-loss distance from entry.
            </p>
            <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-emerald-400 font-bold border border-slate-800">
              Current Cap: 1.50% of Equity
            </div>
          </div>

          <div className="trading-card rounded-xl p-5 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              Sector Concentration Limit
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Prevents over-allocation into correlated sectors (e.g. Oil & Gas Exploration or Commercial Banks).
            </p>
            <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-cyan-400 font-bold border border-slate-800">
              Sector Ceiling: 25.0%
            </div>
          </div>

          <div className="trading-card rounded-xl p-5 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              Trailing Circuit Breaker
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pauses algorithmic signal entry if daily portfolio drawdown exceeds 3.0% or KSE-100 drops by &gt; 2.5%.
            </p>
            <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-rose-400 font-bold border border-slate-800">
              Breaker Status: Normal (Active)
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
