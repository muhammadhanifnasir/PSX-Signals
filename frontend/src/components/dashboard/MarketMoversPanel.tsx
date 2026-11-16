"use client";

import React, { useState } from "react";
import { MarketMover, MarketMoversResponse } from "@/lib/types";
import { TrendingUp, TrendingDown, Flame, BarChart2 } from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/utils";

interface MarketMoversPanelProps {
  movers: MarketMoversResponse;
  onSelectSymbol?: (symbol: string) => void;
}

export function MarketMoversPanel({ movers, onSelectSymbol }: MarketMoversPanelProps) {
  const [activeTab, setActiveTab] = useState<"gainers" | "losers" | "volume">("gainers");

  const currentList: MarketMover[] =
    activeTab === "gainers"
      ? movers.gainers
      : activeTab === "losers"
      ? movers.losers
      : movers.volume_leaders;

  return (
    <div className="trading-card rounded-xl border border-slate-800/90 overflow-hidden flex flex-col h-full">
      {/* Header and Tab switcher */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <BarChart2 className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white tracking-tight">Market Movers</h3>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs font-mono">
          <button
            onClick={() => setActiveTab("gainers")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              activeTab === "gainers"
                ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            Gainers
          </button>
          <button
            onClick={() => setActiveTab("losers")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              activeTab === "losers"
                ? "bg-rose-500/20 text-rose-300 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingDown className="w-3 h-3 text-rose-400" />
            Losers
          </button>
          <button
            onClick={() => setActiveTab("volume")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              activeTab === "volume"
                ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Flame className="w-3 h-3 text-cyan-400" />
            Volume
          </button>
        </div>
      </div>

      {/* List content */}
      <div className="p-3 divide-y divide-slate-800/60 overflow-y-auto max-h-[460px]">
        {currentList.map((item, index) => {
          const isPositive = item.change >= 0;
          return (
            <div
              key={item.symbol}
              onClick={() => onSelectSymbol && onSelectSymbol(item.symbol)}
              className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-800/40 rounded-lg transition-colors cursor-pointer group"
            >
              {/* Symbol & Sector */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-slate-400 w-4">
                  {index + 1}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {item.symbol}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[110px] hidden sm:inline">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">{item.sector}</span>
                </div>
              </div>

              {/* Price & Change */}
              <div className="text-right font-mono">
                <div className="text-xs font-bold text-slate-100">
                  Rs. {item.price.toFixed(2)}
                </div>
                <div
                  className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 ${
                    isPositive ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {item.change.toFixed(2)} ({formatPercent(item.change_percent)})
                </div>
                <div className="text-[10px] text-slate-400">
                  Vol: <span className="text-slate-300">{item.volume_formatted}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
