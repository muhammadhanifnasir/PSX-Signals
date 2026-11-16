"use client";

import React, { useState } from "react";
import {
  Menu,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Radio,
  Clock,
  Sparkles,
} from "lucide-react";
import { MarketStatus } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/utils";

interface HeaderProps {
  onOpenSidebar: () => void;
  marketStatus?: MarketStatus | null;
  isLiveBackend: boolean;
  isWsConnected: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onSearchSymbol?: (symbol: string) => void;
}

export function Header({
  onOpenSidebar,
  marketStatus,
  isLiveBackend,
  isWsConnected,
  isLoading,
  onRefresh,
  onSearchSymbol,
}: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() && onSearchSymbol) {
      onSearchSymbol(searchTerm.trim().toUpperCase());
    }
  };

  const isMarketOpen = marketStatus?.status === "OPEN";
  const indexValue = marketStatus?.current_value ?? 105420.50;
  const indexChange = marketStatus?.change ?? 682.40;
  const indexPct = marketStatus?.change_percent ?? 0.65;
  const isPositive = indexChange >= 0;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-6 bg-[#090D16]/90 backdrop-blur-md border-b border-slate-800/80">
      {/* Left: Mobile trigger & Mini KSE-100 Ticker */}
      <div className="flex items-center gap-3 lg:gap-5">
        <button
          onClick={onOpenSidebar}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Real-time KSE-100 Index Badge */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold tracking-tight text-white">KSE-100</span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">PSX</span>
          </div>
          <div className="h-3.5 w-px bg-slate-700 hidden sm:block" />
          <div className="font-mono text-xs font-semibold text-white">
            {formatNumber(indexValue)}
          </div>
          <div
            className={`flex items-center gap-0.5 text-xs font-mono font-medium ${
              isPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{isPositive ? `+${indexChange.toFixed(2)}` : indexChange.toFixed(2)}</span>
            <span className="text-[11px] hidden md:inline">({formatPercent(indexPct)})</span>
          </div>
        </div>

        {/* Market Status indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border border-slate-800 bg-slate-900/60">
          <span
            className={`w-2 h-2 rounded-full ${
              isMarketOpen ? "bg-emerald-400 shadow-[0_0_8px_#10B981] animate-pulse" : "bg-amber-400"
            }`}
          />
          <span className={isMarketOpen ? "text-emerald-300" : "text-amber-300"}>
            {isMarketOpen ? "MARKET OPEN" : "MARKET CLOSED"}
          </span>
        </div>
      </div>

      {/* Center: Quick Search Form */}
      <div className="hidden md:flex flex-1 max-w-xs mx-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search stock symbol (e.g. OGDC, LUCK)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
          />
        </form>
      </div>

      {/* Right: Connectivity badges & Refresh button */}
      <div className="flex items-center gap-2.5">
        {/* Stream / Connection status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border border-slate-800 bg-slate-900/80">
          {isWsConnected ? (
            <>
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span className="text-cyan-300 hidden sm:inline">LIVE WS STREAM</span>
              <span className="text-cyan-300 sm:hidden">WS</span>
            </>
          ) : isLiveBackend ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-emerald-300 hidden sm:inline">REST CONNECTED</span>
              <span className="text-emerald-300 sm:hidden">REST</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-amber-300 hidden sm:inline">CLIENT MOCK</span>
              <span className="text-amber-300 sm:hidden">MOCK</span>
            </>
          )}
        </div>

        {/* Refresh Action */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh All Market Data"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-lg transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
}
