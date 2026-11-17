"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import { Database, Server, Radio, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function DataSourcesPage() {
  const { marketStatus, isLiveBackend, isWsConnected, isLoading, refreshAllData } = useRealTimeMarket();

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={isLoading}
      onRefresh={refreshAllData}
    >
      <div className="space-y-6">
        <div className="trading-card rounded-xl p-5 border border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Market Feeds & Infrastructure</h2>
            <p className="text-xs text-slate-400">Status of connected database adapters, tick sockets & scrapers.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Data feed provider card */}
          <div className="trading-card rounded-xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                PSX Market Feed Adapter
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                Live PSX Feed Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Direct connection to the official PSX Data Portal (DPS) market watch feed collecting 490+ stocks, real KSE-100 index action, sector classifications, and trading volumes.
            </p>
            <div className="space-y-1.5 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">WebSocket Endpoint:</span>
                <span className="text-emerald-400">ws://localhost:8000/ws/live-signals</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Streaming Frequency:</span>
                <span className="text-slate-200">Every 4.0 seconds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active WebSocket:</span>
                <span className={isWsConnected ? "text-cyan-400 font-bold" : "text-amber-400 font-bold"}>
                  {isWsConnected ? "CONNECTED" : "DISCONNECTED (REST Polling Active)"}
                </span>
              </div>
            </div>
          </div>

          {/* Supabase PostgreSQL card */}
          <div className="trading-card rounded-xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-purple-400" />
                Supabase PostgreSQL Database
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                Schema Ready
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Stores historical scans, signal archives, custom watchlists, and user trade journal logs.
            </p>
            <div className="space-y-1.5 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">SQL Schema Location:</span>
                <span className="text-slate-200">backend/schema.sql</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tables Defined:</span>
                <span className="text-purple-300">stocks, signals, watchlist, trade_journal, scanner_runs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fallback Handler:</span>
                <span className="text-emerald-400 font-bold">Enabled (Graceful In-Memory)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
