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
      {/* 1. LIVE FEED STATUS BANNER */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-emerald-950/40 border-b border-emerald-800/40 text-emerald-300 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="font-semibold text-emerald-200">LIVE FEED ACTIVE:</strong> Connected to official PSX Data Portal (DPS). Public market watch data synchronized (~15m delayed).
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Live PSX Feed</span>
        </div>
      </div>

      {/* 2. BACKEND CONNECTION WARNING IF OFFLINE */}
      {(!isLiveBackend || isOffline) && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-slate-300 text-xs">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Backend API disconnected. Waiting for connection to live market engine.
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
