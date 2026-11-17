"use client";

import React, { useState } from "react";
import { SectorPerformance, SectorRotationQuadrant } from "@/lib/types";
import {
  Compass,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ShieldCheck,
  BarChart3,
  Flame,
  Clock,
  Layers,
} from "lucide-react";

interface SectorRotationMatrixProps {
  sectors: SectorPerformance[];
  isLoading?: boolean;
  onSelectSymbol?: (symbol: string) => void;
}

export function SectorRotationMatrix({
  sectors,
  isLoading,
  onSelectSymbol,
}: SectorRotationMatrixProps) {
  const [selectedQuadrant, setSelectedQuadrant] = useState<string>("ALL");
  const [shariahOnly, setShariahOnly] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse">
        <div className="h-5 bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-800/50 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const filteredSectors = sectors.filter((s) => {
    if (shariahOnly && !s.is_shariah_eligible) return false;
    if (selectedQuadrant !== "ALL" && s.quadrant !== selectedQuadrant) return false;
    return true;
  });

  const getQuadrantCounts = () => {
    const list = shariahOnly ? sectors.filter((s) => s.is_shariah_eligible) : sectors;
    return {
      LEADING: list.filter((s) => s.quadrant === "LEADING").length,
      IMPROVING: list.filter((s) => s.quadrant === "IMPROVING").length,
      WEAKENING: list.filter((s) => s.quadrant === "WEAKENING").length,
      LAGGING: list.filter((s) => s.quadrant === "LAGGING").length,
    };
  };

  const counts = getQuadrantCounts();

  const getQuadrantStyle = (quadrant: SectorRotationQuadrant) => {
    switch (quadrant) {
      case "LEADING":
        return {
          border: "border-emerald-500/40 bg-emerald-950/20",
          text: "text-emerald-400",
          badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
          icon: TrendingUp,
          label: "Leading",
        };
      case "IMPROVING":
        return {
          border: "border-cyan-500/40 bg-cyan-950/20",
          text: "text-cyan-400",
          badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
          icon: ArrowUpRight,
          label: "Improving",
        };
      case "WEAKENING":
        return {
          border: "border-amber-500/40 bg-amber-950/20",
          text: "text-amber-400",
          badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
          icon: Clock,
          label: "Weakening",
        };
      case "LAGGING":
      default:
        return {
          border: "border-rose-500/40 bg-rose-950/20",
          text: "text-rose-400",
          badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
          icon: TrendingDown,
          label: "Lagging",
        };
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              PSX Sector Rotation Matrix (RRG Quadrants)
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              KSE-100 Benchmark
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Institutional volume-weighted momentum and relative strength rotation across {sectors.length} sectors.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Shariah Filter Button */}
          <button
            onClick={() => setShariahOnly(!shariahOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
              shariahOnly
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-900/40"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Shariah Shield
          </button>

          {/* Quadrant Filter Pills */}
          <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedQuadrant("ALL")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                selectedQuadrant === "ALL"
                  ? "bg-slate-800 text-white font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All ({sectors.length})
            </button>
            <button
              onClick={() => setSelectedQuadrant("LEADING")}
              className={`px-2 py-1 rounded-md font-medium transition ${
                selectedQuadrant === "LEADING"
                  ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                  : "text-emerald-400 hover:text-emerald-200"
              }`}
            >
              Leading ({counts.LEADING})
            </button>
            <button
              onClick={() => setSelectedQuadrant("IMPROVING")}
              className={`px-2 py-1 rounded-md font-medium transition ${
                selectedQuadrant === "IMPROVING"
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                  : "text-cyan-400 hover:text-cyan-200"
              }`}
            >
              Improving ({counts.IMPROVING})
            </button>
            <button
              onClick={() => setSelectedQuadrant("WEAKENING")}
              className={`px-2 py-1 rounded-md font-medium transition ${
                selectedQuadrant === "WEAKENING"
                  ? "bg-amber-500/20 text-amber-300 font-semibold"
                  : "text-amber-400 hover:text-amber-200"
              }`}
            >
              Weakening ({counts.WEAKENING})
            </button>
            <button
              onClick={() => setSelectedQuadrant("LAGGING")}
              className={`px-2 py-1 rounded-md font-medium transition ${
                selectedQuadrant === "LAGGING"
                  ? "bg-rose-500/20 text-rose-300 font-semibold"
                  : "text-rose-400 hover:text-rose-200"
              }`}
            >
              Lagging ({counts.LAGGING})
            </button>
          </div>
        </div>
      </div>

      {/* Sectors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-4 max-h-[380px] overflow-y-auto pr-1">
        {filteredSectors.map((sec) => {
          const style = getQuadrantStyle(sec.quadrant);
          const Icon = style.icon;

          return (
            <div
              key={sec.sector}
              className={`border rounded-lg p-3.5 transition hover:scale-[1.01] hover:border-slate-600 ${style.border}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-slate-100 truncate flex-1" title={sec.sector}>
                  {sec.sector}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${style.badge} shrink-0`}>
                  {sec.quadrant}
                </span>
              </div>

              {/* Relative Strength & Turnover */}
              <div className="flex items-center justify-between text-xs my-2">
                <div>
                  <div className="text-[10px] text-slate-400">Relative Strength</div>
                  <div className={`font-mono font-bold flex items-center gap-0.5 ${sec.relative_strength_vs_kse100 >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    <Icon className="w-3 h-3" />
                    {sec.relative_strength_vs_kse100 >= 0 ? "+" : ""}
                    {sec.relative_strength_vs_kse100}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Turnover</div>
                  <div className="font-mono font-medium text-slate-200">
                    {sec.total_turnover_formatted}
                  </div>
                </div>
              </div>

              {/* Top Performer & Advances/Declines */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Leader:</span>
                  <button
                    onClick={() => onSelectSymbol && onSelectSymbol(sec.top_stock_symbol)}
                    className="font-mono font-bold text-sky-400 hover:text-sky-300 underline underline-offset-2"
                  >
                    {sec.top_stock_symbol}
                  </button>
                  <span className={`text-[10px] font-mono ${sec.top_stock_change_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    ({sec.top_stock_change_pct >= 0 ? "+" : ""}{sec.top_stock_change_pct}%)
                  </span>
                </div>

                <div className="text-[10px] font-mono text-slate-400">
                  <span className="text-emerald-400 font-semibold">{sec.advances}</span> /{" "}
                  <span className="text-rose-400 font-semibold">{sec.declines}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSectors.length === 0 && (
        <div className="py-8 text-center text-xs text-slate-400">
          No sectors match the active quadrant or Shariah filter.
        </div>
      )}
    </div>
  );
}
