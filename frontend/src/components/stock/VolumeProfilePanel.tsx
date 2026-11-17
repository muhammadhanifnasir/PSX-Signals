"use client";

import React, { useState, useEffect } from "react";
import { VolumeProfileReport, VolumeProfileBin } from "@/lib/types";
import { api } from "@/lib/api";
import {
  BarChart2,
  Crosshair,
  TrendingUp,
  TrendingDown,
  Info,
  RefreshCw,
  Target,
  Shield,
  Layers,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface VolumeProfilePanelProps {
  symbol: string;
  currentPrice?: number;
}

export function VolumeProfilePanel({ symbol, currentPrice }: VolumeProfilePanelProps) {
  const [profile, setProfile] = useState<VolumeProfileReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadProfile = async (sym: string) => {
    setIsLoading(true);
    try {
      const res = await api.getStockVolumeProfile(sym);
      setProfile(res.data);
    } catch (err) {
      console.warn("Failed to load volume profile for", sym, err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) {
      loadProfile(symbol);
    }
  }, [symbol]);

  if (isLoading && !profile) {
    return (
      <div className="trading-card rounded-xl p-5 border border-slate-800 bg-slate-900/60 animate-pulse space-y-4">
        <div className="h-6 bg-slate-800 rounded w-1/3"></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="h-16 bg-slate-800/60 rounded"></div>
          <div className="h-16 bg-slate-800/60 rounded"></div>
          <div className="h-16 bg-slate-800/60 rounded"></div>
        </div>
        <div className="h-44 bg-slate-800/40 rounded"></div>
      </div>
    );
  }

  if (!profile) return null;

  const maxBinVolume = Math.max(...(profile.bins.map((b) => b.volume) || [1]), 1);

  return (
    <div className="trading-card rounded-xl border border-slate-800/90 bg-slate-900/60 p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Volume Profile &amp; Value Area (VAH / VAL / POC)
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                70% Auction Value Area
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Auction market theory profile revealing Point of Control (POC), Value Area bounds, and liquidity rejection levels.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadProfile(symbol)}
            title="Refresh Volume Profile"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Row: POC, VAH, VAL */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        {/* Point of Control */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center justify-between text-amber-300 text-[10px] mb-1">
            <span>POINT OF CONTROL (POC)</span>
            <Target className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-lg font-bold text-amber-400">
            Rs. {profile.point_of_control_poc.toFixed(2)}
          </span>
          <span className="text-[10px] text-amber-200/80 block mt-0.5">
            Highest Traded Volume Node
          </span>
        </div>

        {/* Value Area High */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span>VALUE AREA HIGH (VAH)</span>
            <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <span className="text-lg font-bold text-rose-400">
            Rs. {profile.value_area_high_vah.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Upper 70% Boundary Resistance
          </span>
        </div>

        {/* Value Area Low */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span>VALUE AREA LOW (VAL)</span>
            <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-lg font-bold text-emerald-400">
            Rs. {profile.value_area_low_val.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Lower 70% Boundary Support
          </span>
        </div>

        {/* Total Profiled Volume */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span>TOTAL PROFILED VOLUME</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <span className="text-lg font-bold text-cyan-400">
            {formatNumber(profile.total_volume_profiled)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Auction Liquidity Sample
          </span>
        </div>
      </div>

      {/* Auction Market Setup Banner */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300 font-sans">
              Market Auction Condition:
            </span>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {profile.auction_setup.replace(/_/g, " ")}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              Pos: {profile.price_position_vs_value_area.replace(/_/g, " ")}
            </span>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Current Price: <strong className="text-white">Rs. {profile.current_price.toFixed(2)}</strong>
          </div>
        </div>

        <p className="text-xs text-slate-300 font-sans leading-relaxed">
          {profile.auction_guidance}
        </p>
      </div>

      {/* Horizontal Volume Profile Histogram */}
      {profile.bins && profile.bins.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
            <span>Price Level (PKR)</span>
            <span>Volume Distribution (%)</span>
          </div>

          <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
            {profile.bins.map((bin) => {
              const widthPct = Math.min(100, Math.round((bin.volume / maxBinVolume) * 100));
              const isCurrent =
                currentPrice !== undefined &&
                Math.abs(bin.price_level - currentPrice) <= 0.5;

              return (
                <div
                  key={bin.price_level}
                  className={`flex items-center gap-3 p-1.5 rounded text-xs font-mono transition ${
                    bin.is_poc
                      ? "bg-amber-500/15 border border-amber-500/40"
                      : isCurrent
                      ? "bg-cyan-500/15 border border-cyan-500/30"
                      : bin.is_in_value_area
                      ? "bg-slate-900/80 border border-slate-800/80"
                      : "bg-slate-950/40 border border-slate-800/30 opacity-70"
                  }`}
                >
                  {/* Price Tag */}
                  <div className="w-24 shrink-0 flex items-center justify-between">
                    <span
                      className={`font-bold ${
                        bin.is_poc
                          ? "text-amber-400"
                          : bin.is_in_value_area
                          ? "text-white"
                          : "text-slate-400"
                      }`}
                    >
                      Rs. {bin.price_level.toFixed(2)}
                    </span>
                    {bin.is_poc && (
                      <span className="px-1 py-0.2 rounded text-[9px] font-extrabold bg-amber-400 text-slate-950">
                        POC
                      </span>
                    )}
                    {bin.price_level === profile.value_area_high_vah && (
                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-rose-500/30 text-rose-300">
                        VAH
                      </span>
                    )}
                    {bin.price_level === profile.value_area_low_val && (
                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500/30 text-emerald-300">
                        VAL
                      </span>
                    )}
                  </div>

                  {/* Volume Bar */}
                  <div className="flex-1 bg-slate-950 rounded-full h-4 relative overflow-hidden flex items-center">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        bin.is_poc
                          ? "bg-amber-400 shadow-sm shadow-amber-400/50"
                          : bin.is_in_value_area
                          ? "bg-cyan-500/80"
                          : "bg-slate-700/60"
                      }`}
                      style={{ width: `${Math.max(widthPct, 3)}%` }}
                    />
                    <span className="absolute left-2 text-[10px] font-mono text-slate-200">
                      {formatNumber(bin.volume)} ({bin.volume_percent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
