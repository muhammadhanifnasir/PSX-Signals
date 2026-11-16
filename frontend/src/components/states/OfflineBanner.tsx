"use client";

import React from "react";
import { AlertCircle, WifiOff, Database, ShieldAlert } from "lucide-react";

interface OfflineBannerProps {
  isOffline: boolean;
  isLiveBackend: boolean;
  onReconnect?: () => void;
}

export function OfflineBanner({ isOffline, isLiveBackend, onReconnect }: OfflineBannerProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* 1. MOCK DATA DISCLAIMER BANNER (Always clearly displayed as requested) */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-amber-950/40 border-b border-amber-800/40 text-amber-300 text-xs font-mono">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="font-semibold text-amber-200">RESEARCH MODE:</strong> Simulated & mock market data enabled for UI development & algorithmic backtesting. Not official live PSX real-time feed.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-amber-400/80">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>Simulation Active</span>
        </div>
      </div>

      {/* 2. BACKEND CONNECTION WARNING IF OFFLINE */}
      {(!isLiveBackend || isOffline) && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-slate-300 text-xs">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Backend API disconnected. Displaying synchronized in-memory client mock state.
            </span>
          </div>
          {onReconnect && (
            <button
              onClick={onReconnect}
              className="px-2.5 py-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-800/50 rounded transition-all"
            >
              Reconnect Backend
            </button>
          )}
        </div>
      )}
    </div>
  );
}
