"use client";

import React from "react";
import { OpportunityItem } from "@/lib/types";
import { Target, TrendingUp, Sparkles, ArrowRight, ShieldAlert, BarChart } from "lucide-react";

interface TopOpportunitiesPanelProps {
  opportunities: OpportunityItem[];
  onSelectSymbol?: (symbol: string) => void;
}

export function TopOpportunitiesPanel({ opportunities, onSelectSymbol }: TopOpportunitiesPanelProps) {
  return (
    <div className="trading-card rounded-xl border border-slate-800/90 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-900/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Top High-Conviction Opportunities</h3>
            <p className="text-[11px] text-slate-400">Algorithmic risk/reward ranking</p>
          </div>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          {opportunities.length} Selected
        </span>
      </div>

      {/* Cards List */}
      <div className="p-3 space-y-2.5 overflow-y-auto max-h-[460px]">
        {opportunities.map((opp) => (
          <div
            key={opp.id}
            onClick={() => onSelectSymbol && onSelectSymbol(opp.symbol)}
            className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer group"
          >
            {/* Top row: Symbol, Action, Return */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                  {opp.symbol}
                </span>
                <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                  {opp.company_name}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  {opp.action}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-emerald-400">
                  +{opp.expected_return_pct}%
                </span>
                <span className="block text-[9px] font-mono text-slate-400">Expected ROI</span>
              </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 text-[11px] font-mono mb-2">
              <div>
                <span className="text-slate-400 text-[10px] block">Entry Range</span>
                <span className="text-slate-200 font-semibold">{opp.entry_range}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Target</span>
                <span className="text-emerald-400 font-semibold">Rs. {opp.target_1.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Stop Loss</span>
                <span className="text-rose-400 font-semibold">Rs. {opp.stop_loss.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer catalyst & badges */}
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  Score: <strong className="text-emerald-400">{opp.score}</strong>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  Risk: {opp.risk_level}
                </span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">
                {opp.volume_surge}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
