"use client";

import React from "react";
import {
  Activity,
  BarChart3,
  Radar,
  Zap,
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from "lucide-react";
import { MarketStatus } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/utils";

interface MetricCardsProps {
  status: MarketStatus | null;
  isLoading?: boolean;
}

export function MetricCards({ status, isLoading }: MetricCardsProps) {
  if (!status) return null;

  const isPositive = status.change >= 0;
  const isMarketOpen = status.status === "OPEN";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {/* 1. Market Status Card */}
      <div className="trading-card rounded-xl p-4 border border-slate-800/90 relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase">Market Status</span>
          <div className="p-1.5 rounded-lg bg-slate-800/80 text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isMarketOpen ? "bg-emerald-400 shadow-[0_0_10px_#10B981] animate-pulse" : "bg-amber-400"
            }`}
          />
          <span className="text-lg font-bold text-white tracking-tight">
            {status.status}
          </span>
        </div>
        {/* Market Breadth advances vs declines bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span className="text-emerald-400">Adv: {status.market_breadth.advances}</span>
            <span className="text-rose-400">Dec: {status.market_breadth.declines}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full"
              style={{
                width: `${
                  (status.market_breadth.advances /
                    (status.market_breadth.advances + status.market_breadth.declines || 1)) *
                  100
                }%`,
              }}
            />
            <div
              className="bg-rose-500 h-full"
              style={{
                width: `${
                  (status.market_breadth.declines /
                    (status.market_breadth.advances + status.market_breadth.declines || 1)) *
                  100
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 2. KSE-100 Index Card */}
      <div className="trading-card rounded-xl p-4 border border-slate-800/90 relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase">KSE-100 Index</span>
          <div className="p-1.5 rounded-lg bg-slate-800/80 text-cyan-400">
            <BarChart3 className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg font-bold text-white font-mono tracking-tight mb-1">
          {formatNumber(status.current_value)}
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-mono font-medium ${
            isPositive ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>{isPositive ? `+${status.change.toFixed(2)}` : status.change.toFixed(2)}</span>
          <span>({formatPercent(status.change_percent)})</span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono mt-1">
          Vol: <span className="text-slate-300 font-semibold">{status.volume_formatted}</span>
        </div>
      </div>

      {/* 3. Stocks Scanned Card */}
      <div className="trading-card rounded-xl p-4 border border-slate-800/90 relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase">Stocks Scanned</span>
          <div className="p-1.5 rounded-lg bg-slate-800/80 text-purple-400">
            <Radar className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg font-bold text-white font-mono tracking-tight mb-1">
          {status.stocks_scanned_count}
          <span className="text-xs font-normal text-slate-400 ml-1.5">Equities</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-purple-300 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          <span>Real-time Multi-factor</span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono mt-1">
          Coverage: <span className="text-slate-300">100% PSX Main Board</span>
        </div>
      </div>

      {/* 4. Active Signals Card */}
      <div className="trading-card rounded-xl p-4 border border-slate-800/90 relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase">Active Signals</span>
          <div className="p-1.5 rounded-lg bg-slate-800/80 text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg font-bold text-amber-300 font-mono tracking-tight mb-1">
          {status.active_signals_count}
          <span className="text-xs font-normal text-slate-400 ml-1.5">Triggers</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
            BUY: 7
          </span>
          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold">
            SELL: 1
          </span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono mt-1">
          Avg Confidence: <span className="text-amber-400 font-semibold">84.5%</span>
        </div>
      </div>

      {/* 5. Strong Opportunities Card */}
      <div className="trading-card rounded-xl p-4 border border-slate-800/90 relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase">Top Opportunities</span>
          <div className="p-1.5 rounded-lg bg-slate-800/80 text-emerald-400">
            <Target className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg font-bold text-emerald-400 font-mono tracking-tight mb-1 flex items-center gap-1.5">
          <span>{status.strong_opportunities_count}</span>
          <span className="text-xs font-normal text-slate-400">High Prob.</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-emerald-300 font-mono">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>Expected: +12.4%</span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono mt-1">
          Top: <span className="text-emerald-300 font-semibold">AIRLINK, ATRL</span>
        </div>
      </div>

      {/* 6. Data Freshness Card */}
      <div className="trading-card rounded-xl p-4 border border-slate-800/90 relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase">Data Freshness</span>
          <div className="p-1.5 rounded-lg bg-slate-800/80 text-blue-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg font-bold text-white font-mono tracking-tight mb-1 flex items-center gap-1.5">
          <span>{status.data_freshness_seconds}s</span>
          <span className="text-xs font-normal text-slate-400">Latency</span>
        </div>
        <div className="text-[11px] text-blue-400 font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
          <span>Sync Real-Time</span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono mt-1 truncate" title={status.last_updated}>
          {status.last_updated}
        </div>
      </div>
    </div>
  );
}
