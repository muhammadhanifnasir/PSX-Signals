"use client";

import React from "react";
import { MacroRegimeReport } from "@/lib/types";
import {
  ShieldAlert,
  TrendingUp,
  Activity,
  AlertTriangle,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
} from "lucide-react";

interface MacroRegimeBannerProps {
  regime: MacroRegimeReport | null;
  isLoading?: boolean;
}

export function MacroRegimeBanner({ regime, isLoading }: MacroRegimeBannerProps) {
  if (isLoading || !regime) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/4 mb-2"></div>
        <div className="h-6 bg-slate-800 rounded w-1/2"></div>
      </div>
    );
  }

  const getRegimeColor = (r: string) => {
    switch (r) {
      case "BULL_MOMENTUM":
        return {
          bg: "bg-emerald-950/40 border-emerald-500/40 text-emerald-400",
          badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
          icon: TrendingUp,
        };
      case "BULL_CONSOLIDATION":
        return {
          bg: "bg-teal-950/40 border-teal-500/40 text-teal-400",
          badge: "bg-teal-500/20 text-teal-300 border-teal-500/30",
          icon: Activity,
        };
      case "NEUTRAL_RANGE":
        return {
          bg: "bg-amber-950/30 border-amber-500/30 text-amber-400",
          badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
          icon: Compass,
        };
      case "CORRECTION_RISK":
        return {
          bg: "bg-orange-950/40 border-orange-500/40 text-orange-400",
          badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",
          icon: AlertTriangle,
        };
      case "BEAR_TREND":
      default:
        return {
          bg: "bg-rose-950/40 border-rose-500/40 text-rose-400",
          badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
          icon: ShieldAlert,
        };
    }
  };

  const styling = getRegimeColor(regime.regime);
  const Icon = styling.icon;

  return (
    <div className={`border rounded-xl p-4 sm:p-5 backdrop-blur-sm transition-all duration-300 ${styling.bg}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Regime Title & Risk Mode */}
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/50 mt-0.5">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Institutional Macro Regime Filter
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${styling.badge}`}>
                {regime.market_risk_mode}
              </span>
              {regime.score_threshold_adjustment > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                  <Sliders className="w-3 h-3" />
                  Min Score +{regime.score_threshold_adjustment}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {regime.regime_title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {regime.institutional_guidance}
            </p>
          </div>
        </div>

        {/* Right: Key Macro Benchmarks & Sector Leaders */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/60">
          <div className="text-left lg:text-right">
            <div className="text-xs text-slate-400 font-medium">Recommended Institutional Posture</div>
            <div className="text-xs font-semibold text-slate-200 mt-0.5">
              {regime.recommended_posture}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-900/80 border border-slate-700">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Leaders:</span>
              <span className="font-medium text-emerald-300">
                {regime.leading_sectors.slice(0, 2).join(", ") || "Oil & Tech"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-900/80 border border-slate-700">
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-slate-400">Lagging:</span>
              <span className="font-medium text-rose-300">
                {regime.lagging_sectors.slice(0, 2).join(", ") || "Textile"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
