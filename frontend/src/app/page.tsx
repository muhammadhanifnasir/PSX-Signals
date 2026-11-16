"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { TradingChart } from "@/components/dashboard/TradingChart";
import { SignalOverviewTable } from "@/components/dashboard/SignalOverviewTable";
import { TopOpportunitiesPanel } from "@/components/dashboard/TopOpportunitiesPanel";
import { MarketMoversPanel } from "@/components/dashboard/MarketMoversPanel";
import { LoadingState, MetricCardSkeleton } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";

export default function DashboardPage() {
  const {
    marketStatus,
    movers,
    signals,
    opportunities,
    isLoading,
    isLiveBackend,
    isWsConnected,
    error,
    refreshAllData,
  } = useRealTimeMarket();

  const [selectedStockForChart, setSelectedStockForChart] = useState<string>("KSE-100");

  const handleSelectSymbol = (symbol: string) => {
    setSelectedStockForChart(symbol);
    // Smooth scroll to chart if needed
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={isLoading}
      onRefresh={refreshAllData}
      onSearchSymbol={handleSelectSymbol}
      activeSignalsCount={signals.total_signals}
      scannerCount={opportunities.top_opportunities.length}
    >
      {/* 1. TOP 6 METRIC CARDS */}
      <section aria-label="Market Overview Cards">
        <MetricCards status={marketStatus} isLoading={isLoading} />
      </section>

      {/* ERROR BANNER IF ANY */}
      {error && !isLiveBackend && (
        <ErrorState
          title="Backend API Offline"
          message="Could not reach the FastAPI backend on port 8000. Running in client simulation mode with mock research data."
          onRetry={refreshAllData}
        />
      )}

      {/* 2. MAIN INTERACTIVE TRADING CHART (Lightweight Charts) */}
      <section aria-label="Interactive Trading Chart">
        <TradingChart
          initialSymbol={selectedStockForChart}
          onSymbolChange={(sym) => setSelectedStockForChart(sym)}
        />
      </section>

      {/* 3. OPPORTUNITIES & MARKET MOVERS (2-column layout on desktop) */}
      <section aria-label="Opportunities and Movers" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TopOpportunitiesPanel
          opportunities={opportunities.top_opportunities}
          onSelectSymbol={handleSelectSymbol}
        />
        <MarketMoversPanel
          movers={movers}
          onSelectSymbol={handleSelectSymbol}
        />
      </section>

      {/* 4. SIGNAL OVERVIEW TABLE */}
      <section aria-label="Active Signals Table">
        {signals.signals.length > 0 ? (
          <SignalOverviewTable
            signals={signals.signals}
            onSelectSymbol={handleSelectSymbol}
          />
        ) : (
          <EmptyState
            title="No Active Signals"
            description="All algorithmic scanning criteria currently hold neutral bias. Check back during active market hours."
            onAction={refreshAllData}
          />
        )}
      </section>
    </AppShell>
  );
}
