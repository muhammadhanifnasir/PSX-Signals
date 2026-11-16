"use client";

import React from "react";

interface LoadingStateProps {
  message?: string;
  subtext?: string;
}

export function LoadingState({
  message = "Scanning PSX Market Data...",
  subtext = "Computing real-time technical indicators, momentum scores, and price action patterns",
}: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="relative flex items-center justify-center w-16 h-16 mb-4">
        {/* Outer glowing ring */}
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
        <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <div className="absolute w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_12px_#10B981]" />
      </div>
      <h3 className="text-base font-semibold text-slate-100 tracking-wide">{message}</h3>
      <p className="text-xs text-slate-400 max-w-sm mt-1">{subtext}</p>
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="trading-card rounded-xl p-4 border border-slate-800 bg-slate-900/60 animate-pulse">
      <div className="flex justify-between items-center mb-3">
        <div className="h-3 w-24 bg-slate-800 rounded"></div>
        <div className="h-6 w-6 bg-slate-800 rounded-full"></div>
      </div>
      <div className="h-7 w-32 bg-slate-700 rounded mb-2"></div>
      <div className="h-3 w-40 bg-slate-800 rounded"></div>
    </div>
  );
}
