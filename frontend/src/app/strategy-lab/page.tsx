"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import { FlaskConical, Sliders, CheckCircle2, Save, Play } from "lucide-react";

export default function StrategyLabPage() {
  const { marketStatus, isLiveBackend, isWsConnected, isLoading, refreshAllData } = useRealTimeMarket();

  const [strategies, setStrategies] = useState([
    { id: "S1", name: "Multi-Day Consolidation Breakout", active: true, minRelVol: 2.0, rsiMin: 55, rsiMax: 72, timeframe: "1D", winRate: "72.4%" },
    { id: "S2", name: "EMA Golden Cross & Pullback", active: true, minRelVol: 1.5, rsiMin: 50, rsiMax: 65, timeframe: "4h", winRate: "68.1%" },
    { id: "S3", name: "Key Support High-Volume Reversal", active: true, minRelVol: 1.8, rsiMin: 35, rsiMax: 48, timeframe: "1D", winRate: "65.8%" },
    { id: "S4", name: "Intraday Momentum Spike", active: false, minRelVol: 2.5, rsiMin: 60, rsiMax: 80, timeframe: "15m", winRate: "59.2%" },
  ]);

  const toggleStrategy = (id: string) => {
    setStrategies(
      strategies.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  };

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={isLoading}
      onRefresh={refreshAllData}
    >
      <div className="space-y-6">
        <div className="trading-card rounded-xl p-5 border border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Strategy Laboratory & Model Tuning</h2>
              <p className="text-xs text-slate-400">Configure quantitative rules powering the automated PSX scanning engine.</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all">
            <Save className="w-3.5 h-3.5" />
            Save Parameters
          </button>
        </div>

        {/* Strategy list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strategies.map((strat) => (
            <div
              key={strat.id}
              className={`trading-card rounded-xl p-5 border transition-all ${
                strat.active ? "border-emerald-500/30 bg-slate-900/80" : "border-slate-800/80 bg-slate-900/40 opacity-70"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">{strat.name}</h3>
                <button
                  onClick={() => toggleStrategy(strat.id)}
                  className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded-full transition-colors ${
                    strat.active
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {strat.active ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-4">
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Min Rel. Volume</span>
                  <span className="text-emerald-400 font-bold">{strat.minRelVol}x Avg</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">RSI Window</span>
                  <span className="text-slate-200 font-bold">{strat.rsiMin} - {strat.rsiMax}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Timeframe</span>
                  <span className="text-cyan-400 font-bold">{strat.timeframe}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Historical Win Rate</span>
                  <span className="text-emerald-400 font-bold">{strat.winRate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
