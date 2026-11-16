"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TradingChart } from "@/components/dashboard/TradingChart";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import { TrendingUp, BarChart, Shield, Calculator, CheckCircle2 } from "lucide-react";

export default function StockAnalysisPage() {
  const { marketStatus, isLiveBackend, isWsConnected, isLoading, refreshAllData } = useRealTimeMarket();
  const [activeSymbol, setActiveSymbol] = useState("AIRLINK");

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={isLoading}
      onRefresh={refreshAllData}
    >
      <div className="space-y-6">
        {/* Interactive Chart */}
        <TradingChart
          initialSymbol={activeSymbol}
          onSymbolChange={(s) => setActiveSymbol(s)}
        />

        {/* Fundamental and Quantitative Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="trading-card rounded-xl p-4 border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Valuation Metrics
            </h4>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>P/E Ratio:</span>
                <span className="text-emerald-400 font-bold">11.2x (Sector Avg: 14.5x)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Dividend Yield:</span>
                <span className="text-white font-bold">3.5%</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>52-Week Range:</span>
                <span className="text-slate-300">Rs. 65.00 - 165.00</span>
              </div>
            </div>
          </div>

          <div className="trading-card rounded-xl p-4 border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Technical Indicators
            </h4>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>RSI (14):</span>
                <span className="text-emerald-400 font-bold">64.8 (Bullish Momentum)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>MACD Histogram:</span>
                <span className="text-emerald-400 font-bold">+0.60 (Bullish Expansion)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>200 EMA Position:</span>
                <span className="text-cyan-400 font-bold">Above (+28.4%)</span>
              </div>
            </div>
          </div>

          <div className="trading-card rounded-xl p-4 border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Shariah & Compliance
            </h4>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>KMI-30 Index:</span>
                <span className="text-emerald-400 font-bold">Compliant</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Debt-to-Asset:</span>
                <span className="text-slate-200">22.4% (&lt; 37% limit)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Illiquid Assets:</span>
                <span className="text-slate-200">58% (&gt; 25% threshold)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
